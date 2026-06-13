import { Controller, Post, Body, Logger } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BaleService } from './bale.service';
import type { BaleUpdate } from './dto/bale-update.dto';

@Controller('bale')
export class BaleWebhookController {
  private readonly logger = new Logger(BaleWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bale: BaleService,
  ) {}

  @Public()
  @Post('webhook')
  async handleUpdate(@Body() update: BaleUpdate) {
    const msg = update.message;
    if (!msg?.text) return { ok: true };

    const chatId = String(msg.chat.id);
    const text = msg.text.trim();

    //start user
    if (text === '/start') {
      await this.bale.sendMessage(
        chatId,
        '👋 سلام!\nلطفاً شماره موبایل خود را وارد کنید:\n(مثال: 09121234567)',
      );
      return { ok: true };
    }

    // send phone number
    const phoneRegex = /^09[0-9]{9}$/;
    if (phoneRegex.test(text)) {
      const user = await this.prisma.user.findUnique({
        where: { phoneNumber: text },
        select: { id: true, name: true, baleChatId: true },
      });

      if (!user) {
        await this.bale.sendMessage(
          chatId,
          '❌ این شماره در سیستم ثبت نشده.\nبا مدیر سیستم تماس بگیرید.',
        );
        return { ok: true };
      }

      //check chat_id security
      if (user.baleChatId) {
        await this.bale.sendMessage(
          chatId,
          '⚠️ این شماره قبلاً ثبت شده و قابل تغییر نیست.\nبرای پشتیبانی با مدیر سیستم تماس بگیرید.',
        );
        return { ok: true };
      }

      // save chat_id
      await this.prisma.user.update({
        where: { phoneNumber: text },
        data: { baleChatId: chatId },
      });

      await this.bale.sendMessage(
        chatId,
        `✅ ${user.name} عزیز، ثبت‌نام شما انجام شد!\nاز این پس کد ورود به بله ارسال می‌شود.`,
      );
      return { ok: true };
    }

    await this.bale.sendMessage(
      chatId,
      'لطفاً شماره موبایل خود را وارد کنید.\n(مثال: 09121234567)',
    );
    return { ok: true };
  }
}
