import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationCategory = 'FORMS' | 'APPROVALS' | 'REPAIRS' | 'PRODUCTION' | 'COMMUNICATION' | 'SYSTEM';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body?: string | null;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.appNotification.create({ data: input as any });
  }

  async createMany(inputs: CreateNotificationInput[]) {
    const unique = [...new Map(inputs.filter((x) => x.userId).map((x) => [`${x.userId}:${x.type}:${x.entityType ?? ''}:${x.entityId ?? ''}`, x])).values()];
    if (!unique.length) return { count: 0 };
    return this.prisma.appNotification.createMany({ data: unique as any[] });
  }

  async notifyUsers(userIds: string[], data: Omit<CreateNotificationInput, 'userId'>) {
    return this.createMany([...new Set(userIds)].map((userId) => ({ ...data, userId })));
  }

  async notifyUsersByRoleIds(roleIds: string[], data: Omit<CreateNotificationInput, 'userId'>) {
    if (!roleIds.length) return { count: 0 };
    const users = await this.prisma.userRole.findMany({ where: { roleId: { in: [...new Set(roleIds)] } }, select: { userId: true } });
    return this.notifyUsers(users.map((x) => x.userId), data);
  }

  async list(userId: string, options?: { unreadOnly?: boolean; category?: string; take?: number }) {
    const take = Math.min(Math.max(options?.take ?? 40, 1), 100);
    const where: any = { userId };
    if (options?.unreadOnly) where.readAt = null;
    if (options?.category) where.category = options.category;
    const [items, unreadCount] = await Promise.all([
      this.prisma.appNotification.findMany({ where, orderBy: { createdAt: 'desc' }, take }),
      this.prisma.appNotification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async summary(userId: string) {
    const [unreadCount, latest] = await Promise.all([
      this.prisma.appNotification.count({ where: { userId, readAt: null } }),
      this.prisma.appNotification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);
    return { unreadCount, latest };
  }

  markRead(id: string, userId: string) {
    return this.prisma.appNotification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  }

  markAllRead(userId: string) {
    return this.prisma.appNotification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}
