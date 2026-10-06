import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BaleService {
  private readonly logger = new Logger(BaleService.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('BALE_BOT_TOKEN');
    this.logger.log(`Bale token: ${token}`); // log test
    this.baseUrl = `https://tapi.bale.ai/bot${token}`;
  }

  async sendOtp(baleChatId: string, otp: string): Promise<void> {
    const text = `🔐 کد ورود شما: *${otp}*\n\nاین کد تا ۲ دقیقه معتبر است.`;

    const res = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: baleChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      this.logger.error(`Bale sendMessage failed: ${data.description}`);
      throw new Error(`Bale API error: ${data.description}`);
    }

    this.logger.log(`OTP sent via Bale to chat_id: ${baleChatId}`);
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };

    if (!data.ok) {
      this.logger.error(`Bale sendMessage failed: ${data.description}`);
      throw new Error(`Bale API error: ${data.description}`);
    }

    this.logger.log(`Message sent via Bale to chat_id: ${chatId}`);
  }
}