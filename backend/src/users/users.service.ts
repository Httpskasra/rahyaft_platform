import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma } from 'src/generated/prisma/client';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NotificationsService } from '../notifications/notifications.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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


  async getMySignature(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { signatureStorageKey: true, signatureMimeType: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.signatureStorageKey || !user.signatureMimeType) {
      return { hasSignature: false, signatureDataUrl: null };
    }

    return {
      hasSignature: true,
      signatureDataUrl: await this.signatureDataUrl(
        'users',
        user.signatureStorageKey,
        user.signatureMimeType,
      ),
    };
  }

  async saveDrawnSignature(userId: string, signatureDataUrl: string) {
    if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(signatureDataUrl)) {
      throw new BadRequestException('Only a drawn PNG signature is accepted');
    }
    const buffer = Buffer.from(signatureDataUrl.split(',')[1], 'base64');
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Signature is too large');
    }
    return this.uploadSignature(userId, { buffer, mimetype: 'image/png' } as Express.Multer.File);
  }

  async uploadSignature(userId: string, file?: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Signature image file is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        managerId: true,
        signatureStorageKey: true,
        signatureMimeType: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const detected = this.validateSignatureImage(file.buffer, file.mimetype);

    // First signature is activated immediately.
    if (!user.signatureStorageKey || !user.signatureMimeType) {
      const storageKey = await this.writeSignatureFile('users', file.buffer, detected.extension);
      await this.prisma.user.update({
        where: { id: userId },
        data: { signatureStorageKey: storageKey, signatureMimeType: detected.mimeType },
      });
      return {
        status: 'ACTIVE',
        requiresApproval: false,
        hasSignature: true,
        signatureDataUrl: `data:${detected.mimeType};base64,${file.buffer.toString('base64')}`,
      };
    }

    if (!user.managerId) {
      throw new BadRequestException('A manager must be assigned before requesting a signature change');
    }

    const pending = await this.prisma.signatureChangeRequest.findFirst({
      where: { requesterId: userId, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException('A signature change request is already pending manager approval');
    }

    const storageKey = await this.writeSignatureFile('requests', file.buffer, detected.extension);
    const request = await this.prisma.signatureChangeRequest.create({
      data: {
        requesterId: userId,
        reviewerId: user.managerId,
        storageKey,
        mimeType: detected.mimeType,
      },
      select: { id: true, status: true, createdAt: true },
    });

    await this.notifications.create({
      userId: user.managerId,
      type: 'SIGNATURE_CHANGE_REQUESTED',
      category: 'APPROVALS',
      title: 'درخواست تغییر امضا',
      body: `${user.name} درخواست تغییر نمونه امضای خود را ثبت کرده است.`,
      href: '/dashboard/signature-requests',
      entityType: 'SIGNATURE_CHANGE_REQUEST',
      entityId: request.id,
      actorId: user.id,
    });

    return {
      status: request.status,
      requiresApproval: true,
      requestId: request.id,
      createdAt: request.createdAt,
      message: 'Signature change request sent to manager for approval',
    };
  }

  async getMySignatureChangeRequest(userId: string) {
    const request = await this.prisma.signatureChangeRequest.findFirst({
      where: { requesterId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        reviewComment: true,
        reviewedAt: true,
        createdAt: true,
        reviewer: { select: { id: true, name: true } },
      },
    });
    return request ?? null;
  }

  async getPendingSignatureChangeRequests(managerId: string) {
    const requests = await this.prisma.signatureChangeRequest.findMany({
      where: { reviewerId: managerId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        storageKey: true,
        mimeType: true,
        createdAt: true,
        requester: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            department: { select: { id: true, name: true } },
            signatureStorageKey: true,
            signatureMimeType: true,
          },
        },
      },
    });

    return Promise.all(requests.map(async (request) => ({
      id: request.id,
      createdAt: request.createdAt,
      requester: {
        id: request.requester.id,
        name: request.requester.name,
        employeeCode: request.requester.employeeCode,
        department: request.requester.department,
      },
      currentSignatureDataUrl:
        request.requester.signatureStorageKey && request.requester.signatureMimeType
          ? await this.signatureDataUrl('users', request.requester.signatureStorageKey, request.requester.signatureMimeType)
          : null,
      requestedSignatureDataUrl: await this.signatureDataUrl('requests', request.storageKey, request.mimeType),
    })));
  }

  async reviewSignatureChange(
    requestId: string,
    managerId: string,
    approved: boolean,
    comment?: string,
  ) {
    const request = await this.prisma.signatureChangeRequest.findUnique({
      where: { id: requestId },
      include: { requester: { select: { id: true, name: true } } },
    });
    if (!request) throw new NotFoundException('Signature change request not found');
    if (request.reviewerId !== managerId) {
      throw new ForbiddenException('This signature change request is not assigned to you');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException('Signature change request has already been reviewed');
    }

    if (approved) {
      const source = join(process.cwd(), 'uploads', 'signatures', 'requests', request.storageKey);
      const buffer = await readFile(source);
      const extension = this.extensionForMime(request.mimeType);
      const activeStorageKey = await this.writeSignatureFile('users', buffer, extension);

      const old = await this.prisma.user.findUnique({
        where: { id: request.requesterId },
        select: { signatureStorageKey: true },
      });

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: request.requesterId },
          data: { signatureStorageKey: activeStorageKey, signatureMimeType: request.mimeType },
        }),
        this.prisma.signatureChangeRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewComment: comment?.trim() || null,
          },
        }),
      ]);

      await this.safeDelete('requests', request.storageKey);
      if (old?.signatureStorageKey) await this.safeDelete('users', old.signatureStorageKey);
    } else {
      await this.prisma.signatureChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewComment: comment?.trim() || null,
        },
      });
      await this.safeDelete('requests', request.storageKey);
    }

    await this.notifications.create({
      userId: request.requesterId,
      type: approved ? 'SIGNATURE_CHANGE_APPROVED' : 'SIGNATURE_CHANGE_REJECTED',
      category: 'APPROVALS',
      title: approved ? 'تغییر امضا تأیید شد' : 'تغییر امضا رد شد',
      body: comment?.trim() || (approved
        ? 'نمونه امضای جدید شما فعال شد.'
        : 'مدیر مربوطه درخواست تغییر امضای شما را رد کرد.'),
      href: '/dashboard/profile',
      entityType: 'SIGNATURE_CHANGE_REQUEST',
      entityId: request.id,
      actorId: managerId,
    });

    return { id: request.id, status: approved ? 'APPROVED' : 'REJECTED' };
  }

  private validateSignatureImage(buffer: Buffer, declaredMime?: string) {
    if (buffer.length < 100) throw new BadRequestException('Signature image is empty or invalid');
    if (buffer.length > 2 * 1024 * 1024) throw new BadRequestException('Signature image is too large');

    const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    const detected = isPng
      ? { mimeType: 'image/png', extension: '.png' }
      : isJpeg
        ? { mimeType: 'image/jpeg', extension: '.jpg' }
        : isWebp
          ? { mimeType: 'image/webp', extension: '.webp' }
          : null;
    if (!detected) throw new BadRequestException('Only PNG, JPG/JPEG or WEBP signature images are allowed');
    if (declaredMime?.startsWith('image/') && declaredMime !== detected.mimeType && !(declaredMime === 'image/jpg' && detected.mimeType === 'image/jpeg')) {
      throw new BadRequestException('Signature image content does not match its file type');
    }
    return detected;
  }

  private extensionForMime(mimeType: string) {
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/jpeg') return '.jpg';
    if (mimeType === 'image/webp') return '.webp';
    throw new BadRequestException('Unsupported signature image type');
  }

  private async writeSignatureFile(folder: 'users' | 'requests', buffer: Buffer, extension: string) {
    const dir = join(process.cwd(), 'uploads', 'signatures', folder);
    await mkdir(dir, { recursive: true });
    const storageKey = `${randomUUID()}${extension}`;
    await writeFile(join(dir, storageKey), buffer, { flag: 'wx' });
    return storageKey;
  }

  private async signatureDataUrl(folder: 'users' | 'requests', storageKey: string, mimeType: string) {
    const buffer = await readFile(join(process.cwd(), 'uploads', 'signatures', folder, storageKey));
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  private async safeDelete(folder: 'users' | 'requests', storageKey: string) {
    try {
      await unlink(join(process.cwd(), 'uploads', 'signatures', folder, storageKey));
    } catch {
      // File cleanup must not turn an already successful review into an API failure.
    }
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
