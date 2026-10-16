'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Factory, FileCheck2, FileText, MessageSquare, Wrench } from 'lucide-react';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '@/lib/api/notifications';

const filters = [
  ['ALL', 'همه'], ['FORMS', 'فرم‌ها'], ['APPROVALS', 'تأییدها'], ['REPAIRS', 'تعمیرات'], ['PRODUCTION', 'تولید'], ['COMMUNICATION', 'چت و ارتباطات'],
] as const;
const icons: Record<string, React.ReactNode> = { FORMS: <FileText />, APPROVALS: <FileCheck2 />, REPAIRS: <Wrench />, PRODUCTION: <Factory />, COMMUNICATION: <MessageSquare /> };

export default function NotificationsPage() {
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [category, setCategory] = React.useState('ALL');
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ category: category === 'ALL' ? undefined : category, unreadOnly, take: 100 });
      setItems(data.items); setUnreadCount(data.unreadCount);
    } finally { setLoading(false); }
  }, [category, unreadOnly]);
  React.useEffect(() => { load(); }, [load]);

  const read = async (item: AppNotification) => {
    if (!item.readAt) { await markNotificationRead(item.id); setItems((old) => old.map((x) => x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x)); setUnreadCount((x) => Math.max(0, x - 1)); }
  };
  const readAll = async () => { await markAllNotificationsRead(); await load(); };

  return <div dir="rtl" className="mx-auto max-w-5xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-zinc-900 dark:text-white">اعلان‌ها</h1><p className="mt-1 text-sm text-zinc-500">رویدادهای مهم فرم‌ها، تأییدها، تعمیرات، تولید و ارتباطات سازمانی</p></div><button onClick={readAll} disabled={!unreadCount} className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-indigo-300"><CheckCheck className="h-4 w-4" />خواندن همه ({unreadCount})</button></div>
    <div className="flex flex-wrap gap-2 rounded-2xl border border-indigo-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">{filters.map(([key,label]) => <button key={key} onClick={() => setCategory(key)} className={`rounded-xl px-3 py-2 text-sm ${category === key ? 'bg-indigo-600 text-white' : 'bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'}`}>{label}</button>)}<label className="mr-auto flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"><input type="checkbox" checked={unreadOnly} onChange={(e)=>setUnreadOnly(e.target.checked)} />فقط خوانده‌نشده‌ها</label></div>
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white dark:border-zinc-800 dark:bg-zinc-950">{loading ? <div className="p-10 text-center text-zinc-500">در حال دریافت اعلان‌ها...</div> : items.length === 0 ? <div className="p-12 text-center"><Bell className="mx-auto mb-3 h-10 w-10 text-zinc-300"/><p className="text-zinc-500">اعلانی در این بخش وجود ندارد.</p></div> : items.map((item) => <Link key={item.id} href={item.href || '#'} onClick={() => read(item)} className={`flex gap-4 border-b border-zinc-100 p-4 last:border-0 hover:bg-indigo-50/50 dark:border-zinc-900 dark:hover:bg-white/5 ${!item.readAt ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 [&>svg]:h-5 [&>svg]:w-5">{icons[item.category] ?? <Bell />}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-sm text-zinc-900 dark:text-zinc-100">{item.title}</strong>{!item.readAt && <i className="h-2 w-2 rounded-full bg-indigo-500" />}</span>{item.body && <span className="mt-1 block text-sm leading-6 text-zinc-600 dark:text-zinc-400">{item.body}</span>}<span className="mt-2 block text-xs text-zinc-400">{new Date(item.createdAt).toLocaleString('fa-IR')}</span></span></Link>)}</div>
  </div>;
}
