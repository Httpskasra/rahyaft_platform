import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRepairDto } from './dto/create-repair.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { RepairStatusService } from './services/repair-status.service';
import { RepairCaseNumberService } from './services/repair-case-number.service';
import { PrismaService } from '../prisma/prisma.service';
import { RepairStatus, ScopeType } from 'src/generated/prisma/enums';
import { AuthenticatedUser } from 'src/common/interfaces/auth.interface';

// شکلی که PermissionGuard روی request.matchedPermission می‌گذارد
// (همان RolePermission منطبق‌شده، شامل scope و relationType)
interface MatchedPermission {
  scope: ScopeType;
  relationType?: string | null;
  [key: string]: any;
}

@Injectable()
export class RepairsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseNumberService: RepairCaseNumberService,
    private readonly statusService: RepairStatusService,
  ) {}

  async create(dto: CreateRepairDto) {
    const customer = await this.prisma.customer.findUnique({
      where: {
        id: dto.customerId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const caseNumber = await this.caseNumberService.generate();

    return this.prisma.repairCase.create({
      data: {
        caseNumber,

        customerId: dto.customerId,

        deviceTitle: dto.deviceTitle,

        serialNumber: dto.serialNumber,

        problemDescription: dto.problemDescription,

        type: dto.type,

        status: RepairStatus.REGISTERED,
      },

      include: {
        customer: true,
      },
    });
  }

  // scope === SELF یعنی کاربر (تکنسین) فقط پرونده‌هایی را ببیند که
  // خودش بهشان ارجاع داده شده. هر scope بازتر یعنی همه‌ی پرونده‌ها
  // (چون RepairCase به دپارتمان وصل نیست، DEPARTMENT/SUBTREE/RELATED
  // برای این resource معادل دسترسی کامل در نظر گرفته می‌شوند).
  async findAll(
    user: AuthenticatedUser,
    matchedPermission?: MatchedPermission,
  ) {
    const isSelfScoped = matchedPermission?.scope === ScopeType.SELF;

    return this.prisma.repairCase.findMany({
      where: isSelfScoped ? { technicianId: user.id } : undefined,

      include: {
        customer: true,
        technician: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
    matchedPermission?: MatchedPermission,
  ) {
const repair = await this.prisma.repairCase.findUnique({
      where: { id },

      include: {
        customer: true,
        technician: true,
        visits: true,
        parts: true,
        statusLogs: {
          include: {
            changedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!repair) {
      throw new NotFoundException('Repair case not found');
    }

    this.assertCanAccessRepair(repair.technicianId, user, matchedPermission);

    return repair;
  }

  async assignTechnician(repairId: string, dto: AssignTechnicianDto) {
    const repair = await this.prisma.repairCase.findUnique({
      where: {
        id: repairId,
      },
    });

    if (!repair) {
      throw new NotFoundException('Repair case not found');
    }

    const technician = await this.prisma.user.findUnique({
      where: {
        id: dto.technicianId,
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return this.prisma.repairCase.update({
      where: {
        id: repairId,
      },

      data: {
        technicianId: dto.technicianId,
      },

      include: {
        technician: true,
      },
    });
  }

  async changeStatus(
    repairId: string,
    newStatus: RepairStatus,
    user: AuthenticatedUser,
    matchedPermission?: MatchedPermission,
    reason?: string,
  ) {
    const repair = await this.prisma.repairCase.findUnique({
      where: { id: repairId },
    });

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    this.assertCanAccessRepair(repair.technicianId, user, matchedPermission);

    // 1. Validate State Machine
    this.statusService.validateTransition(repair.status, newStatus);

    return this.prisma.$transaction(async (tx) => {
      // 2. Update Repair
      const updated = await tx.repairCase.update({
        where: { id: repairId },
        data: {
          status: newStatus,
        },
      });

      // 3. Log
      await tx.repairStatusLog.create({
        data: {
          repairCaseId: repairId,
          oldStatus: repair.status,
          newStatus,
          changedById: user.id,
          reason,
        },
      });

      // 4. Notification Event (future integration)
      await tx.notificationEvent.create({
        data: {
          repairCaseId: repairId,
          status: newStatus,
          payload: {
            oldStatus: repair.status,
            newStatus,
            reason: reason ?? null,
          },
        },
      });

      return updated;
    });
  }

  // معادل evaluateScope در PermissionGuard، اما برای repairCase.technicianId
  // به‌جای targetUserId. هم‌فلسفه‌ی همان گارد: SELF یعنی فقط خود تکنسین،
  // بقیه‌ی scope ها (چون این resource دپارتمان‌محور نیست) یعنی دسترسی کامل.
  private assertCanAccessRepair(
    technicianId: string | null,
    user: AuthenticatedUser,
    matchedPermission?: MatchedPermission,
  ) {
    if (
      matchedPermission?.scope === ScopeType.SELF &&
      technicianId !== user.id
    ) {
      throw new ForbiddenException(
        'Permission denied: scope SELF does not cover this repair case',
      );
    }
  }
}
