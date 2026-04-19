/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  Controller,
  Post,
  Get,
  HttpCode,
  Body,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';
import type { AuthenticatedUser } from 'src/common/interfaces/auth.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * AuthController
 *
 * Login flow:
 *   POST /auth/send-otp    → sends 6-digit OTP to the phone number (must be pre-registered by admin)
 *   POST /auth/verify-otp  → verifies OTP, returns accessToken + refreshToken
 *
 * Token management:
 *   POST /auth/refresh     → rotate tokens using a refresh token
 *   POST /auth/logout      → invalidate refresh token (requires valid JWT)
 *   GET  /auth/me          → return current authenticated user
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * POST /auth/send-otp
   * Public — phone must already exist (created by admin)
   */
  @Public()
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  /**
   * POST /auth/verify-otp
   * Public — validates OTP and issues JWT tokens
   */
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  /**
   * POST /auth/refresh
   * Public — decode refresh token to extract userId, then rotate
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    const decoded = this.jwtService.decode(dto.refreshToken) as {
      sub?: string;
    };
    if (!decoded?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.authService.refreshTokens(decoded.sub, dto.refreshToken);
  }

  /**
   * POST /auth/logout
   * Protected — clears the stored refresh token
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id);
  }

  /**
   * GET /auth/me
   * Protected — returns current user from JWT
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
