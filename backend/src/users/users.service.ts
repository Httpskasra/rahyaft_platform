import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma } from 'src/generated/prisma/client';

const USER_SELECT = {
  id: true,
  phoneNumber: true,
  name: true,
  departmentId: true,
  managerId: true,
  employeeCode: true,
  createdAt: true,
  roles: {
    select: {
      role: { select: { id: true, name: true } },
    },
  },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: USER_SELECT });
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Admin-only: create a user by phone number.
   * No password — login is via OTP only.
   */
  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    if (dto.employeeCode) {
      const existingCode = await this.prisma.user.findUnique({
        where: { employeeCode: dto.employeeCode },
      });
      if (existingCode) {
        throw new ConflictException('Employee code already in use');
      }
    }

    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) throw new NotFoundException('Department not found');
    await this.validateManager(null, dto.managerId);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        departmentId: dto.departmentId,
        managerId: dto.managerId ?? null,
        employeeCode: dto.employeeCode ?? null,
      },
      select: USER_SELECT,
    });
  }

  async update(userId: string, dto: UpdateUserDto) {
    await this.findOne(userId);

    try {
      if (dto.managerId !== undefined) {
        await this.validateManager(userId, dto.managerId);
      }
      return await this.prisma.user.update({
        where: { id: userId },
        data: dto,
        select: USER_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        if (target.includes('employeeCode')) {
          throw new ConflictException('Employee code already in use');
        }
        if (target.includes('phoneNumber')) {
          throw new ConflictException('Phone number already registered');
        }
      }
      throw error;
    }
  }

  async remove(userId: string, currentUser: AuthenticatedUser) {
    await this.findOne(userId);
    if (userId === currentUser.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    await this.prisma.user.delete({ where: { id: userId } });
  }
  //mehrak
  async resetBaleChat(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { baleChatId: null },
    });
    return { message: 'Bale chat ID reset successfully' };
  }
  private async validateManager(
    userId: string | null,
    managerId: string | null | undefined,
  ): Promise<void> {
    if (!managerId) return;

    if (userId && userId === managerId) {
      throw new ConflictException('User cannot be their own manager');
    }

    const manager = await this.prisma.user.findUnique({
      where: {
        id: managerId,
      },
      select: {
        id: true,
        managerId: true,
      },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    if (!userId) return;

    let currentManagerId: string | null = manager.managerId;

    while (currentManagerId) {
      if (currentManagerId === userId) {
        throw new ConflictException('Manager hierarchy cycle is not allowed');
      }

      const currentManager = await this.prisma.user.findUnique({
        where: {
          id: currentManagerId,
        },
        select: {
          managerId: true,
        },
      });

      currentManagerId = currentManager?.managerId ?? null;
    }
  }
}
