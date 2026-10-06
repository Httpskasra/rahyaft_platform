/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  JwtPayload,
  AuthenticatedUser,
} from '../common/interfaces/auth.interface';

/**
 * JwtStrategy
 *
 * This strategy is called by JwtAuthGuard after verifying the token signature.
 * The validate() method receives the decoded payload and must return the user
 * object that will be attached to req.user.
 *
 * We fetch the FULL user with roles and permissions here so guards downstream
 * can make authorization decisions without extra DB calls.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Load the full user with all roles and permissions from DB
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        departmentId: true,
        managerId: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    scope: true,
                    relationType: true,
                    constraints: true,
                    permission: {
                      select: {
                        action: true,
                        resource: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Flatten the nested Prisma structure into a clean AuthenticatedUser shape
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      departmentId: user.departmentId,
      managerId: user.managerId,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.permissions.map((rp) => ({
          action: rp.permission.action,
          resource: rp.permission.resource,
          scope: rp.scope,
          relationType: rp.relationType,
          constraints: rp.constraints,
        })),
      })),
    };
  }
}
