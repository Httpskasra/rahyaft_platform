import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationRealtimeService } from './communication.realtime.service';
import type {
  AuthenticatedUser,
  PermissionEntry,
} from '../common/interfaces/auth.interface';
import {
  DepartmentRelationType,
  ScopeType,
  ThreadActivityType,
  ThreadEntityType,
  ThreadParticipantRole,
  ThreadStatus,
} from '../generated/prisma/enums';
import {
  AddEntityLinkDto,
  AddParticipantDto,
  AssignThreadDto,
  CreateMessageDto,
  CreateThreadDto,
  QueryEntitySearchDto,
  QueryMessagesDto,
  QueryThreadsDto,
  UpdateThreadDto,
} from './dto/communication.dto';

const userSummary = {
  id: true,
  name: true,
  departmentId: true,
} as const;

const detailMessageLimit = 30;

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: CommunicationRealtimeService) {}

  listPeople() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async loadAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phoneNumber: true, name: true, departmentId: true, managerId: true, roles: { select: { role: { select: { id: true, name: true, permissions: { select: { scope: true, relationType: true, constraints: true, permission: { select: { action: true, resource: true } } } } } } } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, phoneNumber: user.phoneNumber, name: user.name, departmentId: user.departmentId, managerId: user.managerId, roles: user.roles.map((entry) => ({ id: entry.role.id, name: entry.role.name, permissions: entry.role.permissions.map((rp) => ({ action: rp.permission.action, resource: rp.permission.resource, scope: rp.scope, relationType: rp.relationType, constraints: rp.constraints })) })) };
  }

  async assertRealtimeAccess(threadId: string, user: AuthenticatedUser, permission: PermissionEntry) { return this.assertAccess(threadId, user, permission); }

  async createThread(dto: CreateThreadDto, user: AuthenticatedUser) {
    const participantIds = [...new Set(dto.participantIds ?? [])].filter(
      (id) => id !== user.id,
    );
    const assigneeIds = [...new Set(dto.assigneeIds ?? [])].filter(
      (id) => id !== user.id,
    );
    await this.assertUsersExist([...new Set([...participantIds, ...assigneeIds])]);

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
        select: { id: true },
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    const threadId = await this.prisma.$transaction(async (tx) => {
      const thread = await tx.thread.create({
        data: {
          title: dto.title.trim(),
          type: dto.type,
          priority: dto.priority,
          departmentId: dto.departmentId ?? user.departmentId ?? undefined,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          creatorId: user.id,
          participants: {
            create: [
              { userId: user.id, role: ThreadParticipantRole.OWNER },
              ...participantIds.map((userId) => ({
                userId,
                role: assigneeIds.includes(userId)
                  ? ThreadParticipantRole.ASSIGNEE
                  : ThreadParticipantRole.PARTICIPANT,
              })),
              ...assigneeIds
                .filter((id) => !participantIds.includes(id))
                .map((userId) => ({
                  userId,
                  role: ThreadParticipantRole.ASSIGNEE,
                })),
            ],
          },
          assignments: {
            create: assigneeIds.map((userId) => ({
              userId,
              assignedById: user.id,
            })),
          },
        },
      });

      for (const input of dto.entityLinks ?? []) {
        this.assertEntityModuleAccess(input.entityType, user);
        const contextLinks = await this.resolveEntityContext(input.entityType, input.entityId, tx);
        for (const link of contextLinks) {
          await tx.threadEntityLink.upsert({
            where: { threadId_entityType_entityId: { threadId: thread.id, entityType: link.entityType, entityId: link.entityId } },
            update: { label: link.label, subtitle: link.subtitle, href: link.href },
            create: { threadId: thread.id, entityType: link.entityType, entityId: link.entityId, label: link.label, subtitle: link.subtitle, href: link.href, createdById: user.id },
          });
        }
      }

      await tx.threadActivity.create({
        data: {
          threadId: thread.id,
          actorId: user.id,
          type: ThreadActivityType.THREAD_CREATED,
        },
      });
      if (dto.initialMessage?.trim()) {
        await tx.threadMessage.create({
          data: {
            threadId: thread.id,
            senderId: user.id,
            body: dto.initialMessage.trim(),
          },
        });
        await tx.threadActivity.create({
          data: {
            threadId: thread.id,
            actorId: user.id,
            type: ThreadActivityType.MESSAGE_SENT,
          },
        });
      }
      return thread.id;
    });
    const detail = await this.getThreadInternal(threadId);
    await this.broadcastThreadChanged(threadId, 'communication:thread.created', detail);
    return detail;
  }

  async listThreads(
    query: QueryThreadsDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    const access = await this.buildThreadScopeWhere(user, permission);
    const where: Record<string, unknown> = { AND: [access] };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.type) where.type = query.type;
    if (query.creatorId) where.creatorId = query.creatorId;
    if (query.participantId) where.participants = { some: { userId: query.participantId, leftAt: null } };
    if (query.assigneeId) where.assignments = { some: { userId: query.assigneeId, completedAt: null } };
    if (query.hasAttachment === 'true') where.attachments = { some: {} };
    if (query.hasAttachment === 'false') where.attachments = { none: {} };
    if (query.entityType && query.entityId) where.entityLinks = { some: { entityType: query.entityType, entityId: query.entityId } };
    else if (query.entityType) where.entityLinks = { some: { entityType: query.entityType } };
    else if (query.entityId) where.entityLinks = { some: { entityId: query.entityId } };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        {
          messages: {
            some: { body: { contains: query.search, mode: 'insensitive' } },
          },
        },
      ];
    }
    if (query.view === 'assigned') {
      where.assignments = { some: { userId: user.id, completedAt: null } };
    } else if (query.view === 'created') {
      where.creatorId = user.id;
    } else if (query.view === 'waiting') {
      where.status = ThreadStatus.WAITING;
    } else if (query.view === 'resolved') {
      where.status = { in: [ThreadStatus.RESOLVED, ThreadStatus.CLOSED] };
    }

    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.thread.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          creator: { select: userSummary },
          participants: {
            where: { userId: user.id, leftAt: null },
            select: { lastReadAt: true },
          },
          assignments: {
            where: { completedAt: null },
            include: { assignee: { select: userSummary } },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            include: { sender: { select: userSummary }, replyTo: { select: { id: true, body: true, senderId: true, sender: { select: userSummary } } }, mentions: { include: { user: { select: userSummary } } }, attachments: true },
          },
          entityLinks: { orderBy: { createdAt: 'asc' } },
          _count: { select: { messages: true, participants: true } },
        },
      }),
      this.prisma.thread.count({ where }),
    ]);

    const items = rows.map((thread) => {
      const lastMessage = thread.messages[0] ?? null;
      const membership = thread.participants[0] ?? null;
      const lastReadAt = membership?.lastReadAt ?? null;
      return {
        ...thread,
        lastMessage,
        unread:
          !!membership &&
          !!lastMessage &&
          lastMessage.senderId !== user.id &&
          (!lastReadAt || lastMessage.createdAt > lastReadAt),
        messages: undefined,
        participants: undefined,
      };
    });
    return {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getInbox(user: AuthenticatedUser, permission: PermissionEntry) {
    const access = await this.buildThreadScopeWhere(user, permission);
    const membership = { participants: { some: { userId: user.id, leftAt: null } } };
    const [assigned, waiting, resolved, total, rows] = await Promise.all([
      this.prisma.thread.count({
        where: { AND: [access, membership], assignments: { some: { userId: user.id, completedAt: null } } },
      }),
      this.prisma.thread.count({ where: { AND: [access, membership], status: ThreadStatus.WAITING } }),
      this.prisma.thread.count({
        where: { AND: [access, membership], status: { in: [ThreadStatus.RESOLVED, ThreadStatus.CLOSED] } },
      }),
      this.prisma.thread.count({ where: { AND: [access, membership] } }),
      this.prisma.thread.findMany({
        where: { AND: [access, membership] },
        select: {
          participants: { where: { userId: user.id, leftAt: null }, select: { lastReadAt: true } },
          messages: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { createdAt: true, senderId: true },
          },
        },
      }),
    ]);
    const unread = rows.filter((row) => {
      const message = row.messages[0];
      const readAt = row.participants[0]?.lastReadAt;
      return message && message.senderId !== user.id && (!readAt || message.createdAt > readAt);
    }).length;
    return { total, assigned, waiting, resolved, unread };
  }

  async getThread(id: string, user: AuthenticatedUser, permission: PermissionEntry) {
    await this.assertAccess(id, user, permission);
    return this.getThreadInternal(id);
  }

  async listMessages(
    id: string,
    query: QueryMessagesDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    const rows = await this.prisma.threadMessage.findMany({
      where: { threadId: id, deletedAt: null },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { sender: { select: userSummary }, replyTo: { select: { id: true, body: true, senderId: true, sender: { select: userSummary } } }, mentions: { include: { user: { select: userSummary } } }, attachments: true },
    });
    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: [...pageRows].reverse(),
      pageInfo: {
        hasMore,
        nextCursor: hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null,
      },
    };
  }

  async updateThread(
    id: string,
    dto: UpdateThreadDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    const before = await this.assertAccess(id, user, permission);
    const data = {
      title: dto.title?.trim(),
      status: dto.status,
      priority: dto.priority,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.thread.update({ where: { id }, data });
      const activities: { type: ThreadActivityType; metadata?: object }[] = [];
      if (dto.status && dto.status !== before.status) {
        activities.push({ type: ThreadActivityType.STATUS_CHANGED, metadata: { from: before.status, to: dto.status } });
      }
      if (dto.priority && dto.priority !== before.priority) {
        activities.push({ type: ThreadActivityType.PRIORITY_CHANGED, metadata: { from: before.priority, to: dto.priority } });
      }
      if (dto.dueAt) activities.push({ type: ThreadActivityType.DUE_DATE_CHANGED });
      if (dto.title) activities.push({ type: ThreadActivityType.THREAD_UPDATED });
      if (activities.length) {
        await tx.threadActivity.createMany({
          data: activities.map((activity) => ({
            threadId: id,
            actorId: user.id,
            type: activity.type,
            metadata: activity.metadata,
          })),
        });
      }
    });
    const detail = await this.getThreadInternal(id);
    await this.broadcastThreadChanged(id, 'communication:thread.updated', detail);
    return detail;
  }

  async addMessage(id: string, dto: CreateMessageDto, user: AuthenticatedUser, permission: PermissionEntry) {
    await this.assertAccess(id, user, permission, true);
    if (dto.clientId) {
      const existing = await this.prisma.threadMessage.findUnique({
        where: { senderId_clientId: { senderId: user.id, clientId: dto.clientId } },
        include: { sender: { select: userSummary }, replyTo: { select: { id: true, body: true, senderId: true, sender: { select: userSummary } } }, mentions: { include: { user: { select: userSummary } } }, attachments: true },
      });
      if (existing) {
        if (existing.threadId !== id) throw new ForbiddenException('Message idempotency key belongs to another thread');
        return existing;
      }
    }
    if (dto.replyToId) {
      const target = await this.prisma.threadMessage.findFirst({ where: { id: dto.replyToId, threadId: id, deletedAt: null }, select: { id: true } });
      if (!target) throw new NotFoundException('Reply target message not found in this thread');
    }
    const message = await this.prisma.$transaction(async (tx) => {
      const mentionIds = [...new Set(dto.mentionUserIds ?? [])].filter((mentionedId) => mentionedId !== user.id);
      if (mentionIds.length) {
        await this.assertUsersExist(mentionIds);
        const activeMentionTargets = await tx.threadParticipant.count({ where: { threadId: id, userId: { in: mentionIds }, leftAt: null } });
        if (activeMentionTargets !== mentionIds.length) throw new BadRequestException('Mention targets must be active thread participants');
      }
      const created = await tx.threadMessage.create({
        data: {
          threadId: id, senderId: user.id, clientId: dto.clientId, body: dto.body.trim(), replyToId: dto.replyToId,
          mentions: { create: mentionIds.map((userId) => ({ userId })) },
        },
        include: { sender: { select: userSummary }, replyTo: { select: { id: true, body: true, senderId: true, sender: { select: userSummary } } }, mentions: { include: { user: { select: userSummary } } }, attachments: true },
      });
      await tx.thread.update({ where: { id }, data: { updatedAt: new Date() } });
      await tx.threadParticipant.updateMany({ where: { threadId: id, userId: user.id, leftAt: null }, data: { lastReadAt: new Date() } });
      await tx.threadActivity.create({ data: { threadId: id, actorId: user.id, type: ThreadActivityType.MESSAGE_SENT } });
      return created;
    });
    const payload = message;
    const mentionedIds = message.mentions?.map((mention: any) => mention.userId) ?? [];
    if (mentionedIds.length) await this.createNotifications(mentionedIds, id, 'MENTION', `${user.name} شما را منشن کرد`, dto.body.trim());
    const recipients = (await this.activeParticipantIds(id)).filter((participantId) => participantId !== user.id && !mentionedIds.includes(participantId));
    if (recipients.length) await this.createNotifications(recipients, id, 'MESSAGE', `پیام جدید از ${user.name}`, dto.body.trim());
    this.realtime.emitToThread(id, 'communication:message.created', { threadId: id, message: payload });
    await this.broadcastInboxChanged(id);
    return payload;
  }

  async addParticipant(
    id: string,
    dto: AddParticipantDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    await this.assertUsersExist([dto.userId]);
    await this.prisma.$transaction(async (tx) => {
      await tx.threadParticipant.upsert({
        where: { threadId_userId: { threadId: id, userId: dto.userId } },
        update: { leftAt: null, role: dto.role ?? ThreadParticipantRole.PARTICIPANT, joinedAt: new Date() },
        create: { threadId: id, userId: dto.userId, role: dto.role },
      });
      await tx.threadActivity.create({
        data: {
          threadId: id,
          actorId: user.id,
          type: ThreadActivityType.USER_ADDED,
          metadata: { userId: dto.userId },
        },
      });
    });
    const detail = await this.getThreadInternal(id);
    await this.broadcastThreadChanged(id, 'communication:thread.updated', detail);
    return detail;
  }

  async removeParticipant(
    id: string,
    participantId: string,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    const thread = await this.assertAccess(id, user, permission);
    if (participantId === thread.creatorId) {
      throw new ForbiddenException('Thread owner cannot be removed');
    }
    const participant = await this.prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId: id, userId: participantId } },
      select: { leftAt: true },
    });
    if (!participant || participant.leftAt) throw new NotFoundException('Active participant not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.threadParticipant.update({
        where: { threadId_userId: { threadId: id, userId: participantId } },
        data: { leftAt: new Date() },
      });
      await tx.threadAssignment.updateMany({
        where: { threadId: id, userId: participantId, completedAt: null },
        data: { completedAt: new Date() },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.USER_REMOVED, metadata: { userId: participantId } },
      });
    });
    const detail = await this.getThreadInternal(id);
    await this.broadcastThreadChanged(id, 'communication:thread.updated', detail);
    return detail;
  }

  async assign(
    id: string,
    dto: AssignThreadDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    await this.assertUsersExist([dto.userId]);
    const active = await this.prisma.threadAssignment.findFirst({
      where: { threadId: id, userId: dto.userId, completedAt: null },
      select: { id: true },
    });
    if (active) return this.getThreadInternal(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.threadParticipant.upsert({
        where: { threadId_userId: { threadId: id, userId: dto.userId } },
        update: { leftAt: null, role: ThreadParticipantRole.ASSIGNEE, joinedAt: new Date() },
        create: { threadId: id, userId: dto.userId, role: ThreadParticipantRole.ASSIGNEE },
      });
      await tx.threadAssignment.create({
        data: { threadId: id, userId: dto.userId, assignedById: user.id },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.ASSIGNEE_ADDED, metadata: { userId: dto.userId } },
      });
    });
    await this.createNotifications([dto.userId], id, 'ASSIGNMENT', 'یک گفتگو به شما ارجاع شد', undefined);
    const detail = await this.getThreadInternal(id);
    await this.broadcastThreadChanged(id, 'communication:thread.updated', detail);
    return detail;
  }

  async unassign(
    id: string,
    assigneeId: string,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    const active = await this.prisma.threadAssignment.findFirst({
      where: { threadId: id, userId: assigneeId, completedAt: null },
      select: { id: true },
    });
    if (!active) throw new NotFoundException('Active assignment not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.threadAssignment.update({
        where: { id: active.id },
        data: { completedAt: new Date() },
      });
      await tx.threadParticipant.updateMany({
        where: { threadId: id, userId: assigneeId, role: ThreadParticipantRole.ASSIGNEE },
        data: { role: ThreadParticipantRole.PARTICIPANT },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.ASSIGNEE_REMOVED, metadata: { userId: assigneeId } },
      });
    });
    const detail = await this.getThreadInternal(id);
    await this.broadcastThreadChanged(id, 'communication:thread.updated', detail);
    return detail;
  }

  async markRead(
    id: string,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    const participant = await this.prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId: id, userId: user.id } },
      select: { id: true, leftAt: true },
    });
    if (!participant || participant.leftAt) {
      return { lastReadAt: null, tracked: false };
    }
    const updated = await this.prisma.threadParticipant.update({
      where: { threadId_userId: { threadId: id, userId: user.id } },
      data: { lastReadAt: new Date() },
      select: { lastReadAt: true },
    });
    const result = { ...updated, tracked: true };
    this.realtime.emitToUser(user.id, 'communication:thread.read', { threadId: id, ...result });
    this.realtime.emitToUser(user.id, 'communication:inbox.changed', { threadId: id });
    return result;
  }

  async listNotifications(user: AuthenticatedUser) {
    const items = await this.prisma.communicationNotification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    const unread = await this.prisma.communicationNotification.count({ where: { userId: user.id, readAt: null } });
    return { items, unread };
  }

  async markNotificationRead(id: string, user: AuthenticatedUser) {
    const item = await this.prisma.communicationNotification.findFirst({ where: { id, userId: user.id } });
    if (!item) throw new NotFoundException('Notification not found');
    const updated = await this.prisma.communicationNotification.update({ where: { id }, data: { readAt: new Date() } });
    this.realtime.emitToUser(user.id, 'communication:notification.changed', { unreadDelta: item.readAt ? 0 : -1 });
    return updated;
  }

  async markAllNotificationsRead(user: AuthenticatedUser) {
    await this.prisma.communicationNotification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    this.realtime.emitToUser(user.id, 'communication:notification.changed', { unread: 0 });
    return { ok: true };
  }

  private async createNotifications(userIds: string[], threadId: string, type: string, title: string, body?: string) {
    const unique = [...new Set(userIds)]; if (!unique.length) return;
    await this.prisma.communicationNotification.createMany({ data: unique.map((userId) => ({ userId, threadId, type, title, body: body?.slice(0, 240) })) });
    this.realtime.emitToUsers(unique, 'communication:notification.created', { threadId, type, title });
  }

  async uploadAttachment(id: string, file: any, user: AuthenticatedUser, permission: PermissionEntry) {
    await this.assertAccess(id, user, permission, true);
    if (!file) throw new BadRequestException('File is required');
    const allowed = new Set(['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp','text/plain']);
    if (!allowed.has(file.mimetype)) throw new BadRequestException('Unsupported attachment type');
    const dir = join(process.cwd(), 'uploads', 'communication'); await mkdir(dir, { recursive: true });
    const key = `${randomUUID()}${extname(file.originalname).toLowerCase()}`; await writeFile(join(dir, key), file.buffer);
    const attachment = await this.prisma.threadAttachment.create({ data: { threadId: id, uploaderId: user.id, fileName: file.originalname, mimeType: file.mimetype, size: file.size, storageKey: key } });
    const recipients = (await this.activeParticipantIds(id)).filter((participantId) => participantId !== user.id);
    if (recipients.length) await this.createNotifications(recipients, id, 'ATTACHMENT', `${user.name} یک فایل اضافه کرد`, file.originalname);
    this.realtime.emitToThread(id, 'communication:attachment.created', { threadId: id, attachment });
    await this.broadcastInboxChanged(id);
    return attachment;
  }

  async getAttachment(id: string, user: AuthenticatedUser, permission: PermissionEntry) {
    const attachment = await this.prisma.threadAttachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    await this.assertAccess(attachment.threadId, user, permission);
    const data = await readFile(join(process.cwd(), 'uploads', 'communication', attachment.storageKey));
    return { ...attachment, data: data.toString('base64') };
  }

  private async assertUsersExist(ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.user.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new NotFoundException('One or more users were not found');
  }

  async addEntityLink(id: string, dto: AddEntityLinkDto, user: AuthenticatedUser, permission: PermissionEntry) {
    await this.assertAccess(id, user, permission);
    this.assertEntityModuleAccess(dto.entityType, user);
    const contextLinks = await this.resolveEntityContext(dto.entityType, dto.entityId, this.prisma);
    await this.prisma.$transaction(async (tx) => {
      for (const link of contextLinks) {
        await tx.threadEntityLink.upsert({
          where: { threadId_entityType_entityId: { threadId: id, entityType: link.entityType, entityId: link.entityId } },
          update: { label: link.label, subtitle: link.subtitle, href: link.href },
          create: { threadId: id, entityType: link.entityType, entityId: link.entityId, label: link.label, subtitle: link.subtitle, href: link.href, createdById: user.id },
        });
      }
      const primary = contextLinks[0];
      await tx.threadActivity.create({ data: { threadId: id, actorId: user.id, type: ThreadActivityType.ENTITY_LINKED, metadata: { entityType: dto.entityType, entityId: dto.entityId, label: primary?.label, autoLinked: contextLinks.slice(1).map((item) => ({ entityType: item.entityType, entityId: item.entityId })) } } });
    });
    const detail = await this.getThreadInternal(id);
    await this.broadcastThreadChanged(id, 'communication:thread.updated', detail);
    return detail;
  }

  async removeEntityLink(id: string, entityType: ThreadEntityType, entityId: string, user: AuthenticatedUser, permission: PermissionEntry) {
    await this.assertAccess(id, user, permission);
    const link = await this.prisma.threadEntityLink.findUnique({ where: { threadId_entityType_entityId: { threadId: id, entityType, entityId } } });
    if (!link) throw new NotFoundException('Entity link not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.threadEntityLink.delete({ where: { id: link.id } });
      await tx.threadActivity.create({ data: { threadId: id, actorId: user.id, type: ThreadActivityType.ENTITY_UNLINKED, metadata: { entityType, entityId, label: link.label } } });
    });
    const detail = await this.getThreadInternal(id);
    await this.broadcastThreadChanged(id, 'communication:thread.updated', detail);
    return detail;
  }

  async listEntityThreads(entityType: ThreadEntityType, entityId: string, user: AuthenticatedUser, permission: PermissionEntry) {
    this.assertEntityModuleAccess(entityType, user);
    const scope = await this.buildThreadScopeWhere(user, permission);
    const items = await this.prisma.thread.findMany({
      where: { AND: [scope], entityLinks: { some: { entityType, entityId } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 50,
      include: { creator: { select: userSummary }, assignments: { where: { completedAt: null }, include: { assignee: { select: userSummary } } }, entityLinks: true, messages: { where: { deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, include: { sender: { select: userSummary } } }, _count: { select: { messages: true, participants: true } } },
    });
    return { items: items.map((t) => ({ ...t, lastMessage: t.messages[0] ?? null, messages: undefined })) };
  }

  async searchEntities(query: QueryEntitySearchDto, user?: AuthenticatedUser) {
    if (user) this.assertEntityModuleAccess(query.type, user);
    const search = query.search?.trim() ?? '';
    const take = 20;
    switch (query.type) {
      case ThreadEntityType.CUSTOMER: {
        const rows = await this.prisma.customer.findMany({ where: search ? { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { organizationName: { contains: search, mode: 'insensitive' } }, { mobile: { contains: search } }] } : {}, take, orderBy: { updatedAt: 'desc' } });
        return rows.map((r) => ({ entityType: query.type, entityId: r.id, label: r.organizationName || [r.firstName, r.lastName].filter(Boolean).join(' ') || r.mobile || 'مشتری', subtitle: r.mobile || r.city || null, href: `/dashboard/customers?customerId=${r.id}` }));
      }
      case ThreadEntityType.REPAIR: {
        const rows = await this.prisma.repairCase.findMany({ where: search ? { OR: [{ caseNumber: { contains: search, mode: 'insensitive' } }, { deviceTitle: { contains: search, mode: 'insensitive' } }, { serialNumber: { contains: search, mode: 'insensitive' } }] } : {}, take, orderBy: { updatedAt: 'desc' } });
        return rows.map((r) => ({ entityType: query.type, entityId: r.id, label: `${r.caseNumber} — ${r.deviceTitle}`, subtitle: r.serialNumber || r.status, href: `/dashboard/repairs?repairId=${r.id}` }));
      }
      case ThreadEntityType.FORM: {
        const rows = await this.prisma.form.findMany({ where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { customId: { contains: search, mode: 'insensitive' } }] } : {}, take, orderBy: { updatedAt: 'desc' } });
        return rows.map((r) => ({ entityType: query.type, entityId: r.id, label: r.name, subtitle: r.customId || null, href: `/dashboard/forms/${r.id}` }));
      }
      case ThreadEntityType.FORM_SUBMISSION: {
        const rows = await this.prisma.formSubmission.findMany({ where: search ? { form: { name: { contains: search, mode: 'insensitive' } } } : {}, take, orderBy: { createdAt: 'desc' }, include: { form: { select: { name: true } } } });
        return rows.map((r) => ({ entityType: query.type, entityId: r.id, label: `ارسال فرم: ${r.form.name}`, subtitle: r.id.slice(0, 8), href: `/dashboard/forms/${r.formId}` }));
      }
      case ThreadEntityType.SALES_OPPORTUNITY: {
        const rows = await this.prisma.salesOpportunity.findMany({ where: search ? { title: { contains: search, mode: 'insensitive' } } : {}, take, orderBy: { updatedAt: 'desc' }, include: { customer: { select: { firstName: true, lastName: true, organizationName: true } } } });
        return rows.map((r) => ({ entityType: query.type, entityId: r.id, label: r.title, subtitle: r.customer.organizationName || [r.customer.firstName, r.customer.lastName].filter(Boolean).join(' ') || null, href: `/dashboard/customers?customerId=${r.customerId}` }));
      }
      case ThreadEntityType.USER: {
        const rows = await this.prisma.user.findMany({ where: search ? { name: { contains: search, mode: 'insensitive' } } : {}, take, orderBy: { name: 'asc' }, include: { department: { select: { name: true } } } });
        return rows.map((r) => ({ entityType: query.type, entityId: r.id, label: r.name, subtitle: r.department.name, href: `/dashboard/users?userId=${r.id}` }));
      }
      case ThreadEntityType.DEPARTMENT: {
        const rows = await this.prisma.department.findMany({ where: search ? { name: { contains: search, mode: 'insensitive' } } : {}, take, orderBy: { name: 'asc' } });
        return rows.map((r) => ({ entityType: query.type, entityId: r.id, label: r.name, subtitle: 'واحد سازمانی', href: `/dashboard/departments?departmentId=${r.id}` }));
      }
      default: return [];
    }
  }

  private assertEntityModuleAccess(entityType: ThreadEntityType, user: AuthenticatedUser) {
    const protectedResource: Partial<Record<ThreadEntityType, string>> = {
      [ThreadEntityType.REPAIR]: 'repairs',
      [ThreadEntityType.FORM]: 'forms',
      [ThreadEntityType.FORM_SUBMISSION]: 'form-submissions',
    };
    const resource = protectedResource[entityType];
    if (!resource) return;
    const allowed = user.roles.some((role) => role.permissions.some((permission) => permission.action === 'read' && permission.resource === resource));
    if (!allowed) throw new ForbiddenException(`Missing permission to link ${entityType}`);
  }

  private async resolveEntityContext(entityType: ThreadEntityType, entityId: string, db: any) {
    const primary = await this.resolveEntity(entityType, entityId, db);
    const links: Array<{ entityType: ThreadEntityType; entityId: string; label: string; subtitle?: string | null; href?: string | null }> = [
      { entityType, entityId, ...primary },
    ];

    if (entityType === ThreadEntityType.REPAIR) {
      const repair = await db.repairCase.findUnique({ where: { id: entityId }, select: { customerId: true } });
      if (repair?.customerId) links.push({ entityType: ThreadEntityType.CUSTOMER, entityId: repair.customerId, ...(await this.resolveEntity(ThreadEntityType.CUSTOMER, repair.customerId, db)) });
    }
    if (entityType === ThreadEntityType.SALES_OPPORTUNITY) {
      const opportunity = await db.salesOpportunity.findUnique({ where: { id: entityId }, select: { customerId: true } });
      if (opportunity?.customerId) links.push({ entityType: ThreadEntityType.CUSTOMER, entityId: opportunity.customerId, ...(await this.resolveEntity(ThreadEntityType.CUSTOMER, opportunity.customerId, db)) });
    }
    if (entityType === ThreadEntityType.FORM_SUBMISSION) {
      const submission = await db.formSubmission.findUnique({ where: { id: entityId }, select: { formId: true } });
      if (submission?.formId) links.push({ entityType: ThreadEntityType.FORM, entityId: submission.formId, ...(await this.resolveEntity(ThreadEntityType.FORM, submission.formId, db)) });
    }
    return links;
  }

  private async resolveEntity(entityType: ThreadEntityType, entityId: string, db: any) {
    const found = (await this.searchEntityById(entityType, entityId, db));
    if (!found) throw new NotFoundException('Linked entity not found');
    return found;
  }

  private async searchEntityById(type: ThreadEntityType, id: string, db: any): Promise<{label:string; subtitle?:string|null; href?:string|null}|null> {
    if (type === ThreadEntityType.CUSTOMER) { const r=await db.customer.findUnique({where:{id}}); return r ? { label: r.organizationName || [r.firstName,r.lastName].filter(Boolean).join(' ') || r.mobile || 'مشتری', subtitle:r.mobile||r.city||null, href:`/dashboard/customers?customerId=${id}` } : null; }
    if (type === ThreadEntityType.REPAIR) { const r=await db.repairCase.findUnique({where:{id}}); return r ? { label:`${r.caseNumber} — ${r.deviceTitle}`, subtitle:r.serialNumber||r.status, href:`/dashboard/repairs?repairId=${id}` } : null; }
    if (type === ThreadEntityType.FORM) { const r=await db.form.findUnique({where:{id}}); return r ? { label:r.name, subtitle:r.customId||null, href:`/dashboard/forms/${id}` } : null; }
    if (type === ThreadEntityType.FORM_SUBMISSION) { const r=await db.formSubmission.findUnique({where:{id},include:{form:true}}); return r ? { label:`ارسال فرم: ${r.form.name}`, subtitle:r.id.slice(0,8), href:`/dashboard/forms/${r.formId}` } : null; }
    if (type === ThreadEntityType.SALES_OPPORTUNITY) { const r=await db.salesOpportunity.findUnique({where:{id},include:{customer:true}}); return r ? { label:r.title, subtitle:r.customer.organizationName || [r.customer.firstName,r.customer.lastName].filter(Boolean).join(' ') || null, href:`/dashboard/customers?customerId=${r.customerId}` } : null; }
    if (type === ThreadEntityType.USER) { const r=await db.user.findUnique({where:{id},include:{department:true}}); return r ? {label:r.name,subtitle:r.department.name,href:`/dashboard/users?userId=${id}`}:null; }
    if (type === ThreadEntityType.DEPARTMENT) { const r=await db.department.findUnique({where:{id}}); return r ? {label:r.name,subtitle:'واحد سازمانی',href:`/dashboard/departments?departmentId=${id}`}:null; }
    return null;
  }

  private async assertAccess(
    threadId: string,
    user: AuthenticatedUser,
    permission: PermissionEntry,
    requireMembership = false,
  ) {
    const scopeWhere = requireMembership
      ? { participants: { some: { userId: user.id, leftAt: null } } }
      : await this.buildThreadScopeWhere(user, permission);
    const thread = await this.prisma.thread.findFirst({
      where: { id: threadId, AND: [scopeWhere] },
      select: {
        id: true,
        creatorId: true,
        status: true,
        priority: true,
        departmentId: true,
      },
    });
    if (!thread) {
      const exists = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Thread not found');
      throw new ForbiddenException(
        requireMembership
          ? 'Only active thread participants can send messages'
          : 'Permission scope does not cover this thread',
      );
    }
    return thread;
  }

  private async buildThreadScopeWhere(user: AuthenticatedUser, permission: PermissionEntry) {
    const membership = { participants: { some: { userId: user.id, leftAt: null } } };
    switch (permission.scope) {
      case ScopeType.ORG_WIDE:
        return {};
      case ScopeType.SELF:
        return membership;
      case ScopeType.TEAM:
        return { OR: [membership, { creator: { managerId: user.id } }] };
      case ScopeType.DEPARTMENT:
        return {
          OR: [
            membership,
            { departmentId: user.departmentId },
            { departmentId: null, creator: { departmentId: user.departmentId } },
          ],
        };
      case ScopeType.DEPARTMENT_SUBTREE: {
        const ids = [...(await this.getDepartmentSubtree(user.departmentId))];
        return {
          OR: [
            membership,
            { departmentId: { in: ids } },
            { departmentId: null, creator: { departmentId: { in: ids } } },
          ],
        };
      }
      case ScopeType.RELATED_DEPARTMENTS: {
        const ids = [...(await this.getRelatedDepartments(user.departmentId, permission.relationType))];
        return {
          OR: [
            membership,
            { departmentId: { in: ids } },
            { departmentId: null, creator: { departmentId: { in: ids } } },
          ],
        };
      }
      default:
        return membership;
    }
  }

  private async getDepartmentSubtree(departmentId: string) {
    const ids = new Set<string>();
    const queue = [departmentId];
    while (queue.length) {
      const current = queue.shift()!;
      if (ids.has(current)) continue;
      ids.add(current);
      const children = await this.prisma.department.findMany({
        where: { parentId: current },
        select: { id: true },
      });
      queue.push(...children.map((child) => child.id));
    }
    return ids;
  }

  private async getRelatedDepartments(
    departmentId: string,
    relationType: DepartmentRelationType | null,
  ) {
    const relations = await this.prisma.departmentRelation.findMany({
      where: {
        fromDepartmentId: departmentId,
        ...(relationType ? { type: relationType } : {}),
      },
      select: { toDepartmentId: true },
    });
    return new Set(relations.map((item) => item.toDepartmentId));
  }

  private async activeParticipantIds(threadId: string) { const rows = await this.prisma.threadParticipant.findMany({ where: { threadId, leftAt: null }, select: { userId: true } }); return rows.map((r) => r.userId); }
  private async broadcastInboxChanged(threadId: string) { const ids = await this.activeParticipantIds(threadId); this.realtime.emitToUsers(ids, 'communication:inbox.changed', { threadId }); }
  private async broadcastThreadChanged(threadId: string, event: string, detail: unknown) { this.realtime.emitToThread(threadId, event, { threadId, thread: detail }); const ids = await this.activeParticipantIds(threadId); this.realtime.emitToUsers(ids, event, { threadId, thread: detail }); this.realtime.emitToUsers(ids, 'communication:inbox.changed', { threadId }); }

  private async getThreadInternal(id: string) {
    const thread = await this.prisma.thread.findUniqueOrThrow({
      where: { id },
      include: {
        creator: { select: userSummary },
        department: { select: { id: true, name: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: userSummary } },
          orderBy: { joinedAt: 'asc' },
        },
        assignments: {
          where: { completedAt: null },
          include: {
            assignee: { select: userSummary },
            assignedBy: { select: userSummary },
          },
          orderBy: { assignedAt: 'asc' },
        },
        messages: {
          where: { deletedAt: null },
          include: { sender: { select: userSummary }, replyTo: { select: { id: true, body: true, senderId: true, sender: { select: userSummary } } }, mentions: { include: { user: { select: userSummary } } }, attachments: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: detailMessageLimit + 1,
        },
        attachments: { orderBy: { createdAt: 'desc' } },
        entityLinks: { orderBy: { createdAt: 'asc' } },
        activities: {
          include: { actor: { select: userSummary } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const hasMoreMessages = thread.messages.length > detailMessageLimit;
    const pageMessages = hasMoreMessages
      ? thread.messages.slice(0, detailMessageLimit)
      : thread.messages;
    return {
      ...thread,
      messages: [...pageMessages].reverse(),
      messagePage: {
        hasMore: hasMoreMessages,
        nextCursor: hasMoreMessages ? pageMessages[pageMessages.length - 1]?.id ?? null : null,
      },
    };
  }
}
