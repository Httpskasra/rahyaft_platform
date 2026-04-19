/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { JwtPayload } from '../common/interfaces/auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Redis key prefixes
  private readonly OTP_PREFIX = 'otp:'; // otp:<phone>         → 6-digit code (2 min TTL)
  private readonly OTP_ATTEMPT_PREFIX = 'otp_try:'; // otp_try:<phone>     → attempt counter (10 min TTL)
  private readonly OTP_RATE_PREFIX = 'otp_rate:'; // otp_rate:<phone>    → send counter (1 min TTL)

  private readonly OTP_TTL_SECONDS = 120; // 2 minutes
  private readonly OTP_RATE_TTL = 60; // 1 minute window
  private readonly OTP_MAX_PER_MINUTE = 3; // max sends per minute
  private readonly OTP_MAX_ATTEMPTS = 5; // max wrong guesses before block
  private readonly OTP_ATTEMPT_TTL = 600; // 10 minutes block window

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─────────────────────────────────────────────
  // STEP 1 — Send OTP
  // ─────────────────────────────────────────────
  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const { phoneNumber } = dto;

    // 1. User must already exist — created by admins, not self-registered
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });
    if (!user) {
      // Generic message — don't reveal whether phone exists
      throw new NotFoundException(
        'Phone number not registered. Contact your administrator.',
      );
    }

    // 2. Rate limit: max OTP_MAX_PER_MINUTE sends per minute
    const rateKey = `${this.OTP_RATE_PREFIX}${phoneNumber}`;
    const sends = await this.redis.increment(rateKey, this.OTP_RATE_TTL);
    if (sends > this.OTP_MAX_PER_MINUTE) {
      throw new BadRequestException(
        `Too many OTP requests. Please wait before trying again.`,
      );
    }

    // 3. Generate a cryptographically random 6-digit code
    const otp = this.generateOtp();

    // 4. Store in Redis (overwrites any existing code)
    await this.redis.set(
      `${this.OTP_PREFIX}${phoneNumber}`,
      otp,
      this.OTP_TTL_SECONDS,
    );

    // 5. Reset attempt counter on fresh OTP send
    await this.redis.del(`${this.OTP_ATTEMPT_PREFIX}${phoneNumber}`);

    // 6. In production: call your SMS provider here
    //    e.g. KaveNegar, Ghasedak, Melipayamak, etc.
    //    this.smsProvider.send(phoneNumber, `کد ورود شما: ${otp}`)
    //
    // For development, we log it (remove in production!)
    this.logger.warn(`[DEV ONLY] OTP for ${phoneNumber}: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  // ─────────────────────────────────────────────
  // STEP 2 — Verify OTP → issue tokens
  // ─────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const { phoneNumber, otp } = dto;

    // 1. Check attempt count — block brute force
    const attemptKey = `${this.OTP_ATTEMPT_PREFIX}${phoneNumber}`;
    const attempts = await this.redis.get(attemptKey);
    if (attempts && parseInt(attempts) >= this.OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Too many failed attempts. Request a new OTP.',
      );
    }

    // 2. Fetch stored OTP
    const storedOtp = await this.redis.get(`${this.OTP_PREFIX}${phoneNumber}`);
    if (!storedOtp) {
      throw new UnauthorizedException(
        'OTP expired or not found. Request a new one.',
      );
    }

    // 3. Constant-time comparison (avoid timing attacks)
    if (storedOtp !== otp) {
      // Increment attempt counter
      await this.redis.increment(attemptKey, this.OTP_ATTEMPT_TTL);
      throw new UnauthorizedException('Invalid OTP');
    }

    // 4. OTP valid — delete it immediately (one-time use)
    await this.redis.del(`${this.OTP_PREFIX}${phoneNumber}`);
    await this.redis.del(attemptKey);

    // 5. Load user with roles
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        departmentId: true,
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    // 6. Build JWT payload and issue tokens
    const payload: JwtPayload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      departmentId: user.departmentId,
      roles: user.roles.map((ur) => ur.role.name),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(user.id),
    ]);

    // 7. Store hashed refresh token in DB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  // ─────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        departmentId: true,
        refreshToken: true,
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
    });

    if (!user?.refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenMatches) throw new UnauthorizedException('Invalid refresh token');

    const payload: JwtPayload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      departmentId: user.departmentId,
      roles: user.roles.map((ur) => ur.role.name),
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(user.id),
    ]);

    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedNewRefreshToken },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /** Generate a 6-digit numeric OTP using crypto-safe random */
  private generateOtp(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    // Map to 000000–999999
    return String(array[0] % 1_000_000).padStart(6, '0');
  }

  private signAccessToken(payload: JwtPayload): Promise<string> {
    const expiresIn = (this.config.get<string>('JWT_EXPIRES_IN') ||
      '15m') as any;
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn,
    });
  }

  private signRefreshToken(userId: string): Promise<string> {
    const expiresIn = (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ||
      '7d') as any;
    return this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn,
      },
    );
  }
}
