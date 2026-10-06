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
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

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


  async getMySignature(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { signatureStorageKey: true, signatureMimeType: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.signatureStorageKey || !user.signatureMimeType) {
      return { hasSignature: false, signatureDataUrl: null };
    }

    const filePath = join(
      process.cwd(),
      'uploads',
      'signatures',
      'users',
      user.signatureStorageKey,
    );
    const buffer = await readFile(filePath);
    return {
      hasSignature: true,
      signatureDataUrl: `data:${user.signatureMimeType};base64,${buffer.toString('base64')}`,
    };
  }

  async saveDrawnSignature(userId: string, signatureDataUrl: string) {
    await this.findOne(userId);

    const prefix = 'data:image/png;base64,';
    if (!signatureDataUrl.startsWith(prefix)) {
      throw new BadRequestException('Signature must be a PNG data URL');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(signatureDataUrl.slice(prefix.length), 'base64');
    } catch {
      throw new BadRequestException('Invalid signature data');
    }

    if (buffer.length < 100) {
      throw new BadRequestException('Signature is empty or invalid');
    }
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Signature is too large');
    }
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length < 8 || !buffer.subarray(0, 8).equals(pngMagic)) {
      throw new BadRequestException('Invalid PNG signature');
    }

    const dir = join(process.cwd(), 'uploads', 'signatures', 'users');
    await mkdir(dir, { recursive: true });
    const storageKey = `${randomUUID()}.png`;
    await writeFile(join(dir, storageKey), buffer);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        signatureStorageKey: storageKey,
        signatureMimeType: 'image/png',
      },
    });

    return {
      hasSignature: true,
      signatureDataUrl: `${prefix}${buffer.toString('base64')}`,
    };
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
