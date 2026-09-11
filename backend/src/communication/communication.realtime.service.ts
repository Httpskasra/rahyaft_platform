import { Injectable } from '@nestjs/common';

type RealtimeClient = { readyState: number; send: (data: string) => void };

@Injectable()
export class CommunicationRealtimeService {
  private readonly userClients = new Map<string, Set<RealtimeClient>>();
  private readonly threadClients = new Map<string, Set<RealtimeClient>>();

  addUserClient(userId: string, client: RealtimeClient) {
    const clients = this.userClients.get(userId) ?? new Set<RealtimeClient>();
    clients.add(client);
    this.userClients.set(userId, clients);
  }
  removeClient(client: RealtimeClient) {
    for (const [id, clients] of this.userClients) { clients.delete(client); if (!clients.size) this.userClients.delete(id); }
    for (const [id, clients] of this.threadClients) { clients.delete(client); if (!clients.size) this.threadClients.delete(id); }
  }
  joinThread(threadId: string, client: RealtimeClient) {
    const clients = this.threadClients.get(threadId) ?? new Set<RealtimeClient>();
    clients.add(client); this.threadClients.set(threadId, clients);
  }
  leaveThread(threadId: string, client: RealtimeClient) {
    const clients = this.threadClients.get(threadId); clients?.delete(client); if (clients && !clients.size) this.threadClients.delete(threadId);
  }
  emitToThread(threadId: string, event: string, payload: unknown) { this.emit(this.threadClients.get(threadId), event, payload); }
  emitToUser(userId: string, event: string, payload: unknown) { this.emit(this.userClients.get(userId), event, payload); }
  emitToUsers(userIds: string[], event: string, payload: unknown) { for (const id of new Set(userIds)) this.emitToUser(id, event, payload); }
  private emit(clients: Set<RealtimeClient> | undefined, event: string, payload: unknown) {
    if (!clients?.size) return;
    const data = JSON.stringify({ event, payload });
    for (const client of clients) if (client.readyState === 1) client.send(data);
  }
}
