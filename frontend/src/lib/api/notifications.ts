import { apiClient } from './client';

export type AppNotification = {
  id: string;
  type: string;
  category: 'FORMS' | 'APPROVALS' | 'REPAIRS' | 'PRODUCTION' | 'COMMUNICATION' | 'SYSTEM' | string;
  title: string;
  body?: string | null;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export async function getNotificationSummary() {
  const { data } = await apiClient.get<{ unreadCount: number; latest: AppNotification[] }>('/notifications/summary');
  return data;
}

export async function getNotifications(params?: { unreadOnly?: boolean; category?: string; take?: number }) {
  const { data } = await apiClient.get<{ items: AppNotification[]; unreadCount: number }>('/notifications', { params });
  return data;
}

export async function markNotificationRead(id: string) {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await apiClient.patch('/notifications/read/all');
}
