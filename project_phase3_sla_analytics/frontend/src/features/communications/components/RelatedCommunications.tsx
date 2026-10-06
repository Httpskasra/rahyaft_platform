"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Plus, ArrowUpLeft } from "lucide-react";
import { communicationApi, type ThreadEntityType, type ThreadListItem } from "@/lib/api/communication";

export function RelatedCommunications({ entityType, entityId, compact = false }: { entityType: ThreadEntityType; entityId: string; compact?: boolean }) {
  const [items, setItems] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    communicationApi.entityThreads(entityType, entityId)
      .then((r) => alive && setItems(r.data.items ?? []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [entityType, entityId]);

  const createHref = `/dashboard/communications?entityType=${entityType}&entityId=${entityId}&new=1`;
  return <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><MessageCircle size={17} className="text-indigo-500"/><div><h3 className="text-sm font-semibold">ارتباطات مرتبط</h3><p className="text-[11px] text-gray-400">{loading ? "در حال دریافت..." : `${items.length} گفتگو`}</p></div></div>
      <a href={createHref} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs text-white hover:bg-indigo-700"><Plus size={13}/> گفتگوی جدید</a>
    </div>
    {!compact && <div className="mt-3 space-y-2">
      {!loading && items.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 dark:border-gray-700">هنوز گفتگوی مرتبطی ایجاد نشده است.</div>}
      {items.slice(0, 5).map((thread) => <a key={thread.id} href={`/dashboard/communications?threadId=${thread.id}`} className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"><span className={`h-2 w-2 rounded-full ${thread.status === "RESOLVED" || thread.status === "CLOSED" ? "bg-emerald-500" : thread.priority === "URGENT" ? "bg-red-500" : "bg-indigo-500"}`}/><span className="min-w-0 flex-1 truncate font-medium">{thread.title}</span><ArrowUpLeft size={13} className="text-gray-400"/></a>)}
      {items.length > 5 && <a href={`/dashboard/communications?entityType=${entityType}&entityId=${entityId}`} className="block text-center text-xs text-indigo-600">مشاهده همه گفتگوها</a>}
    </div>}
  </section>;
}
