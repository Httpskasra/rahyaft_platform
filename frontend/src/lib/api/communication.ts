import { apiClient } from "./client";

export type ThreadType = "CONVERSATION" | "REQUEST" | "TASK" | "REFERRAL" | "ANNOUNCEMENT" | "CASE";
export type ThreadStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED" | "ARCHIVED";
export type ThreadPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type ParticipantRole = "OWNER" | "ASSIGNEE" | "PARTICIPANT" | "WATCHER";

export interface Person {
  id: string;
  name: string;
  departmentId: string;
  department?: { name: string };
}

export interface ThreadMessage {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender: Person;
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
  _count: { messages: number; participants: number };
}

export interface ThreadDetail extends Omit<ThreadListItem, "lastMessage" | "unread" | "_count"> {
  creatorId: string;
  messages: ThreadMessage[];
  participants: { id: string; userId: string; role: ParticipantRole; user: Person }[];
  activities: { id: string; type: string; createdAt: string; actor: Person | null; metadata?: Record<string, unknown> }[];
  department?: { id: string; name: string } | null;
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
}

export const communicationApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<{ items: ThreadListItem[]; meta: { total: number; totalPages: number } }>("/communication/threads", { params }),
  inbox: () => apiClient.get<InboxStats>("/communication/inbox"),
  people: () => apiClient.get<Person[]>("/communication/people"),
  get: (id: string) => apiClient.get<ThreadDetail>(`/communication/threads/${id}`),
  create: (body: CreateThreadInput) => apiClient.post<ThreadDetail>("/communication/threads", body),
  update: (id: string, body: Partial<Pick<ThreadDetail, "title" | "status" | "priority">> & { dueAt?: string }) =>
    apiClient.patch<ThreadDetail>(`/communication/threads/${id}`, body),
  message: (id: string, body: string) => apiClient.post<ThreadMessage>(`/communication/threads/${id}/messages`, { body }),
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
