'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Factory, FileCheck2, FileText, MessageSquare, Wrench } from 'lucide-react';
import { getNotificationSummary, markAllNotificationsRead, markNotificationRead, type AppNotification } from '@/lib/api/notifications';

const categoryIcon: Record<string, React.ReactNode> = {
  FORMS: <FileText className="h-4 w-4" />,
  APPROVALS: <FileCheck2 className="h-4 w-4" />,
  REPAIRS: <Wrench className="h-4 w-4" />,
  PRODUCTION: <Factory className="h-4 w-4" />,
  COMMUNICATION: <MessageSquare className="h-4 w-4" />,
};

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'همین الان';
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const refresh = React.useCallback(async () => {
    try {
      const data = await getNotificationSummary();
      setItems(data.latest);
      setUnreadCount(data.unreadCount);
    } catch { /* auth interceptor handles session failures */ }
  }, []);

  React.useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const readOne = async (item: AppNotification) => {
    if (!item.readAt) {
      setItems((old) => old.map((x) => x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x));
      setUnreadCount((count) => Math.max(0, count - 1));
      await markNotificationRead(item.id).catch(() => undefined);
    }
    setOpen(false);
  };

  const readAll = async () => {
    setItems((old) => old.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => refresh());
  };

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => { setOpen((v) => !v); if (!open) refresh(); }}
        className="relative rounded-full p-2 text-indigo-600 hover:bg-indigo-100 dark:text-zinc-300 dark:hover:bg-white/10" aria-label="اعلان‌ها">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-[100] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950" dir="rtl">
          <div className="flex items-center justify-between border-b border-indigo-50 px-4 py-3 dark:border-zinc-800">
            <div><p className="font-bold text-zinc-900 dark:text-white">اعلان‌ها</p><p className="text-xs text-zinc-500">{unreadCount ? `${unreadCount} اعلان خوانده‌نشده` : 'همه اعلان‌ها دیده شده‌اند'}</p></div>
            {unreadCount > 0 && <button onClick={readAll} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-300"><CheckCheck className="h-4 w-4" />خواندن همه</button>}
          </div>
          <div className="max-h-[430px] overflow-y-auto">
            {items.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">اعلان جدیدی ندارید.</div> : items.map((item) => (
              <Link key={item.id} href={item.href || '/dashboard/notifications'} onClick={() => readOne(item)}
                className={`flex gap-3 border-b border-zinc-100 px-4 py-3 transition hover:bg-indigo-50/60 dark:border-zinc-900 dark:hover:bg-white/5 ${!item.readAt ? 'bg-indigo-50/45 dark:bg-indigo-950/20' : ''}`}>
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{categoryIcon[item.category] ?? <Bell className="h-4 w-4" />}</span>
                <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="text-sm text-zinc-900 dark:text-zinc-100">{item.title}</strong>{!item.readAt && <i className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}</span>{item.body && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-zinc-600 dark:text-zinc-400">{item.body}</span>}<span className="mt-1 block text-[11px] text-zinc-400">{relativeTime(item.createdAt)}</span></span>
              </Link>
            ))}
          </div>
          <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="block bg-zinc-50 px-4 py-3 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:bg-zinc-900 dark:text-indigo-300">مشاهده همه اعلان‌ها</Link>
        </div>
      )}
    </div>
  );
}
