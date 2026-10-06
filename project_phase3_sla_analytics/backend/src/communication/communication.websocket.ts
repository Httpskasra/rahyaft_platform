import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server as HttpServer } from 'node:http';
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { CommunicationRealtimeService } from './communication.realtime.service';
import { CommunicationService } from './communication.service';
import { resolveCommunicationPermission } from './communication.permission';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Ws = require('ws') as any;

@Injectable()
export class CommunicationWebSocketServer {
  private bound = false;
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly communication: CommunicationService,
    private readonly realtime: CommunicationRealtimeService,
  ) {}
  bindHttpServer(server: HttpServer) {
    if (this.bound) return; this.bound = true;
    const wss = new Ws.WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (url.pathname !== '/communication-ws') return;
      const allowedOrigin = this.config.get<string>('FRONTEND_URL');
      const origin = request.headers.origin;
      if (allowedOrigin && origin && origin !== allowedOrigin) { socket.destroy(); return; }
      wss.handleUpgrade(request, socket, head, (client: any) => wss.emit('connection', client, request));
    });
    wss.on('connection', (client: any) => {
      let user: AuthenticatedUser | null = null;
      let expiryTimer: ReturnType<typeof setTimeout> | null = null;
      const timer = setTimeout(() => { if (!user) client.close(4401, 'Authentication required'); }, 5000);
      client.on('message', async (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type?: string; token?: string; threadId?: string };
          if (msg.type === 'auth') {
            if (user || !msg.token) return;
            const payload = await this.jwt.verifyAsync<{ sub: string; exp?: number }>(msg.token, { secret: this.config.get<string>('JWT_SECRET') || 'dev-secret' });
            user = await this.communication.loadAuthenticatedUser(payload.sub);
            if (payload.exp) {
              const remaining = Math.max(0, payload.exp * 1000 - Date.now());
              expiryTimer = setTimeout(() => client.close(4401, 'Access token expired'), remaining);
            }
            this.realtime.addUserClient(user.id, client); clearTimeout(timer);
            client.send(JSON.stringify({ event: 'communication:connected', payload: { userId: user.id } })); return;
          }
          if (!user) { client.close(4401, 'Authentication required'); return; }
          if (msg.type === 'communication:thread:join' && msg.threadId) {
            const permission = resolveCommunicationPermission(user, 'read');
            if (!permission) return;
            await this.communication.assertRealtimeAccess(msg.threadId, user, permission);
            this.realtime.joinThread(msg.threadId, client); return;
          }
          if (msg.type === 'communication:thread:leave' && msg.threadId) this.realtime.leaveThread(msg.threadId, client);
        } catch { client.send(JSON.stringify({ event: 'communication:error', payload: { code: 'INVALID_MESSAGE' } })); }
      });
      client.on('close', () => { clearTimeout(timer); if (expiryTimer) clearTimeout(expiryTimer); this.realtime.removeClient(client); });
    });
  }
}
