import { apiClient } from "./client";

export type ThreadType = "CONVERSATION" | "REQUEST" | "TASK" | "REFERRAL" | "ANNOUNCEMENT" | "CASE";
export type ThreadStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED" | "ARCHIVED";
export type ThreadPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type ParticipantRole = "OWNER" | "ASSIGNEE" | "PARTICIPANT" | "WATCHER";
export type ThreadEntityType = "CUSTOMER" | "REPAIR" | "FORM" | "FORM_SUBMISSION" | "SALES_OPPORTUNITY" | "USER" | "DEPARTMENT";

export interface Person {
  id: string;
  name: string;
  departmentId: string;
  department?: { name: string };
}

export interface ThreadEntityLink { id: string; threadId?: string; entityType: ThreadEntityType; entityId: string; label: string; subtitle?: string | null; href?: string | null; createdAt?: string; }

export interface ThreadAttachment { id: string; threadId: string; messageId?: string | null; fileName: string; mimeType: string; size: number; createdAt: string; }
export interface ThreadMention { id: string; userId: string; user: Person; }
export interface CommunicationNotification { id: string; threadId: string; type: string; title: string; body?: string | null; readAt?: string | null; createdAt: string; }

export interface ThreadMessage {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender: Person;
  clientId?: string | null;
  deliveryStatus?: "sending" | "sent" | "failed";
  replyToId?: string | null;
  replyTo?: { id: string; body: string; senderId: string; sender: Person } | null;
  mentions?: ThreadMention[];
  attachments?: ThreadAttachment[];
}

export interface ThreadListItem {
  id: string;
  title: string;
  type: ThreadType;
  status: ThreadStatus;
  priority: ThreadPriority;
  dueAt: string | null;
  updatedAt: string;
  creator: Person;
  lastMessage: ThreadMessage | null;
  unread: boolean;
  assignments: { id: string; userId: string; assignee: Person }[];
  entityLinks?: ThreadEntityLink[];
  _count: { messages: number; participants: number };
}

export interface ThreadDetail extends Omit<ThreadListItem, "lastMessage" | "unread" | "_count"> {
  creatorId: string;
  messages: ThreadMessage[];
  participants: { id: string; userId: string; role: ParticipantRole; user: Person }[];
  activities: { id: string; type: string; createdAt: string; actor: Person | null; metadata?: Record<string, unknown> }[];
  messagePage: { hasMore: boolean; nextCursor: string | null };
  department?: { id: string; name: string } | null;
  attachments: ThreadAttachment[];
  entityLinks: ThreadEntityLink[];
}

export interface InboxStats {
  total: number;
  assigned: number;
  waiting: number;
  resolved: number;
  unread: number;
}

export interface CreateThreadInput {
  title: string;
  type: ThreadType;
  priority: ThreadPriority;
  participantIds?: string[];
  assigneeIds?: string[];
  initialMessage?: string;
  dueAt?: string;
  entityLinks?: { entityType: ThreadEntityType; entityId: string }[];
}

export const communicationApi = {

  entitySearch: (type: ThreadEntityType, search?: string) =>
    apiClient.get<ThreadEntityLink[]>("/communication/entities/search", { params: { type, search: search || undefined } }),
  entityThreads: (entityType: ThreadEntityType, entityId: string) =>
    apiClient.get<{ items: ThreadListItem[] }>(`/communication/entities/${entityType}/${entityId}/threads`),
  addEntityLink: (threadId: string, entityType: ThreadEntityType, entityId: string) =>
    apiClient.post<ThreadDetail>(`/communication/threads/${threadId}/entity-links`, { entityType, entityId }),
  removeEntityLink: (threadId: string, entityType: ThreadEntityType, entityId: string) =>
    apiClient.delete<ThreadDetail>(`/communication/threads/${threadId}/entity-links/${entityType}/${entityId}`),
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<{ items: ThreadListItem[]; meta: { total: number; totalPages: number } }>("/communication/threads", { params }),
  inbox: () => apiClient.get<InboxStats>("/communication/inbox"),
  people: () => apiClient.get<Person[]>("/communication/people"),
  get: (id: string) => apiClient.get<ThreadDetail>(`/communication/threads/${id}`),
  messages: (id: string, cursor?: string | null, limit = 30) =>
    apiClient.get<{ items: ThreadMessage[]; pageInfo: { hasMore: boolean; nextCursor: string | null } }>(`/communication/threads/${id}/messages`, { params: { cursor: cursor || undefined, limit } }),
  create: (body: CreateThreadInput) => apiClient.post<ThreadDetail>("/communication/threads", body),
  update: (id: string, body: Partial<Pick<ThreadDetail, "title" | "status" | "priority">> & { dueAt?: string }) =>
    apiClient.patch<ThreadDetail>(`/communication/threads/${id}`, body),
  message: (id: string, body: string, options?: { replyToId?: string; clientId?: string; mentionUserIds?: string[] }) =>
    apiClient.post<ThreadMessage>(`/communication/threads/${id}/messages`, { body, ...options }),
  notifications: () => apiClient.get<{ items: CommunicationNotification[]; unread: number }>("/communication/notifications"),
  readNotification: (id: string) => apiClient.post(`/communication/notifications/${id}/read`),
  readAllNotifications: () => apiClient.post("/communication/notifications/read-all"),
  uploadAttachment: (id: string, file: File) => { const data = new FormData(); data.append("file", file); return apiClient.post<ThreadAttachment>(`/communication/threads/${id}/attachments`, data); },
  attachment: (id: string) => apiClient.get<ThreadAttachment & { data: string }>(`/communication/attachments/${id}`),
  markRead: (id: string) => apiClient.post(`/communication/threads/${id}/read`),
  addParticipant: (id: string, userId: string, role: ParticipantRole = "PARTICIPANT") =>
    apiClient.post<ThreadDetail>(`/communication/threads/${id}/participants`, { userId, role }),
  removeParticipant: (id: string, userId: string) =>
    apiClient.delete<ThreadDetail>(`/communication/threads/${id}/participants/${userId}`),
  assign: (id: string, userId: string) =>
    apiClient.post<ThreadDetail>(`/communication/threads/${id}/assignments`, { userId }),
  unassign: (id: string, userId: string) =>
    apiClient.delete<ThreadDetail>(`/communication/threads/${id}/assignments/${userId}`),
};
