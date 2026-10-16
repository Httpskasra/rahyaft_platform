import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AddPermissionDto } from './dto/add-permission.dto';
import { UpdateRoleDto } from './dto/updtade-role.dto';
import { SyncPermissionsDto } from './dto/sync-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing)
      throw new ConflictException(`Role '${dto.name}' already exists`);
    return this.prisma.role.create({
      data: { name: dto.name },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async remove(roleId: string) {
    await this.findById(roleId);
    await this.prisma.role.delete({ where: { id: roleId } });
  }
  async update(roleId: string, dto: UpdateRoleDto) {
    await this.findById(roleId);
    await this.prisma.role.update({ where: { id: roleId }, data: dto });
  }

  async addPermission(roleId: string, dto: AddPermissionDto) {
    await this.findById(roleId);

    // Upsert the permission itself (action+resource is unique)
    const permission = await this.prisma.permission.upsert({
      where: {
        action_resource: { action: dto.action, resource: dto.resource },
      },
      create: { action: dto.action, resource: dto.resource },
      update: {},
    });

    // Attach to role with scope settings
    return this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      create: {
        roleId,
        permissionId: permission.id,
        scope: dto.scope,
        relationType: dto.relationType ?? null,
        // constraints: dto.constraints ?? undefined,
      },
      update: {
        scope: dto.scope,
        relationType: dto.relationType ?? null,
        // constraints: dto.constraints ?? undefined,
      },
    });
  }

  async syncPermissions(roleId: string, dto: SyncPermissionsDto) {
    await this.findById(roleId);

    return this.prisma.$transaction(async (tx) => {
      const keepPermissionIds: string[] = [];

      for (const item of dto.permissions) {
        const permission = await tx.permission.upsert({
          where: {
            action_resource: { action: item.action, resource: item.resource },
          },
          create: { action: item.action, resource: item.resource },
          update: {},
        });

        keepPermissionIds.push(permission.id);

        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId: permission.id },
          },
          create: {
            roleId,
            permissionId: permission.id,
            scope: item.scope,
            relationType: item.relationType ?? null,
          },
          update: {
            scope: item.scope,
            relationType: item.relationType ?? null,
          },
        });
      }

      await tx.rolePermission.deleteMany({
        where: {
          roleId,
          ...(keepPermissionIds.length > 0
            ? { permissionId: { notIn: keepPermissionIds } }
            : {}),
        },
      });

      return tx.role.findUnique({
        where: { id: roleId },
        include: { permissions: { include: { permission: true } } },
      });
    });
  }

  async assignToUser(dto: AssignRoleDto) {
    await this.findById(dto.roleId);
    return this.prisma.userRole.create({
      data: { userId: dto.userId, roleId: dto.roleId },
    });
  }

  async removeFromUser(dto: AssignRoleDto) {
    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId: dto.userId, roleId: dto.roleId } },
    });
  }

  private async findById(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }
}
