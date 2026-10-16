import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaleService } from '../bale/bale.service';

/** Durable, restart-safe polling of the notifications table. Works for notifications
 * created both through create() and createMany() without changing callers. */
@Injectable()
export class BaleNotificationDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaleNotificationDeliveryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly maxAttempts = 5;

  constructor(private readonly prisma: PrismaService, private readonly bale: BaleService) {}

  onModuleInit() {
    if (process.env.BALE_NOTIFICATIONS_ENABLED === 'false') return;
    this.timer = setInterval(() => { void this.flush(); }, 10_000);
    this.timer.unref?.();
    void this.flush();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private format(notification: { title: string; body: string | null; href: string | null; category: string }) {
    const categoryLabels: Record<string, string> = { FORMS: 'فرم‌ها', APPROVALS: 'تأییدها', REPAIRS: 'تعمیرات', PRODUCTION: 'تولید', COMMUNICATION: 'ارتباطات داخلی', SYSTEM: 'سیستم' };
    const parts = [`🔔 اعلان جدید • ${categoryLabels[notification.category] ?? 'سامانه'}`, '', notification.title];
    if (notification.body) parts.push(notification.body);
    const baseUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim()?.replace(/\/$/, '');
    if (baseUrl && /^https?:\/\//.test(baseUrl) && notification.href?.startsWith('/') && !notification.href.startsWith('//')) {
      parts.push('', `🔗 مشاهده در سامانه: ${baseUrl}${notification.href}`);
    }
    return parts.join('\n').slice(0, 3900);
  }

  async flush() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      // Resume claims abandoned by a process crash.
      const stale = new Date(now.getTime() - 2 * 60_000);
      const notifications = await this.prisma.appNotification.findMany({
        where: { OR: [
          { baleStatus: 'PENDING', baleNextAttemptAt: { lte: now } },
          { baleStatus: 'SENDING', baleNextAttemptAt: { lte: stale } },
        ] },
        orderBy: { createdAt: 'asc' }, take: 25,
        select: { id: true, userId: true, category: true, title: true, body: true, href: true, baleStatus: true, baleNextAttemptAt: true, baleAttempts: true },
      });
      if (!notifications.length) return;
      const users = await this.prisma.user.findMany({ where: { id: { in: notifications.map(n => n.userId) } }, select: { id: true, baleChatId: true } });
      const chatIds = new Map(users.map(u => [u.id, u.baleChatId]));
      for (const item of notifications) {
        const claimed = await this.prisma.appNotification.updateMany({
          where: { id: item.id, baleStatus: item.baleStatus, baleNextAttemptAt: item.baleNextAttemptAt },
          data: { baleStatus: 'SENDING', baleNextAttemptAt: new Date() },
        });
        if (!claimed.count) continue;
        const chatId = chatIds.get(item.userId);
        if (!chatId) {
          await this.prisma.appNotification.update({ where: { id: item.id }, data: { baleStatus: 'SKIPPED', baleLastError: 'User has no linked Bale chat' } });
          continue;
        }
        try {
          await this.bale.sendMessage(chatId, this.format(item));
          await this.prisma.appNotification.update({ where: { id: item.id }, data: { baleStatus: 'SENT', baleSentAt: new Date(), baleLastError: null, baleAttempts: { increment: 1 } } });
        } catch (error) {
          const attempts = item.baleAttempts + 1;
          const message = error instanceof Error ? error.message : String(error);
          const delay = Math.min(60 * 60_000, 30_000 * (2 ** (attempts - 1)));
          await this.prisma.appNotification.update({ where: { id: item.id }, data: { baleStatus: attempts >= this.maxAttempts ? 'FAILED' : 'PENDING', baleAttempts: attempts, baleNextAttemptAt: new Date(Date.now() + delay), baleLastError: message.slice(0, 500) } });
          this.logger.warn(`Bale notification delivery failed for ${item.id}: ${message}`);
        }
      }
    } catch (error) {
      this.logger.error('Notification delivery polling failed', error instanceof Error ? error.stack : String(error));
    } finally { this.running = false; }
  }
}
