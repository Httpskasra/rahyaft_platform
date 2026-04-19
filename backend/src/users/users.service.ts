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

const USER_SELECT = {
  id: true,
  phoneNumber: true,
  name: true,
  departmentId: true,
  managerId: true,
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

    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) throw new NotFoundException('Department not found');

    return this.prisma.user.create({
      data: {
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        departmentId: dto.departmentId,
        managerId: dto.managerId ?? null,
      },
      select: USER_SELECT,
    });
  }

  async update(userId: string, dto: UpdateUserDto) {
    await this.findOne(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: USER_SELECT,
    });
  }

  async remove(userId: string, currentUser: AuthenticatedUser) {
    await this.findOne(userId);
    if (userId === currentUser.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
