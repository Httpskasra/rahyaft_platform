"use client";

import { Reply, RotateCcw } from "lucide-react";
import type { ThreadDetail, ThreadMessage } from "@/lib/api/communication";

const activityLabels: Record<string, (metadata?: Record<string, unknown>) => string> = {
  THREAD_CREATED: () => "گفتگو ایجاد شد",
  USER_ADDED: () => "یک عضو به گفتگو اضافه شد",
  USER_REMOVED: () => "یک عضو از گفتگو حذف شد",
  ASSIGNEE_ADDED: () => "مسئول جدید برای گفتگو تعیین شد",
  ASSIGNEE_REMOVED: () => "مسئول از گفتگو برداشته شد",
  STATUS_CHANGED: (metadata) => `وضعیت تغییر کرد${metadata?.from && metadata?.to ? `: ${String(metadata.from)} ← ${String(metadata.to)}` : ""}`,
  PRIORITY_CHANGED: (metadata) => `اولویت تغییر کرد${metadata?.from && metadata?.to ? `: ${String(metadata.from)} ← ${String(metadata.to)}` : ""}`,
  DUE_DATE_CHANGED: () => "مهلت گفتگو تغییر کرد",
  THREAD_UPDATED: () => "اطلاعات گفتگو ویرایش شد",
  ENTITY_LINKED: (metadata) => `رکورد مرتبط اضافه شد${metadata?.label ? `: ${String(metadata.label)}` : ""}`,
  ENTITY_UNLINKED: (metadata) => `ارتباط رکورد حذف شد${metadata?.label ? `: ${String(metadata.label)}` : ""}`,
};

type TimelineItem =
  | { kind: "message"; at: number; message: ThreadMessage }
  | { kind: "activity"; at: number; activity: ThreadDetail["activities"][number] };

export function ThreadTimeline({ thread, currentUserId, loadingOlder, onLoadOlder, onReply, onRetry }: {
  thread: ThreadDetail;
  currentUserId?: string;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onReply: (message: ThreadMessage) => void;
  onRetry: (message: ThreadMessage) => void;
}) {
  const items: TimelineItem[] = [
    ...thread.messages.map((message) => ({ kind: "message" as const, at: new Date(message.createdAt).getTime(), message })),
    ...thread.activities.filter((activity) => activity.type !== "MESSAGE_SENT").map((activity) => ({ kind: "activity" as const, at: new Date(activity.createdAt).getTime(), activity })),
  ].sort((a, b) => a.at - b.at);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/70 p-4 dark:bg-gray-950/40">
      {thread.messagePage?.hasMore && <div className="flex justify-center"><button type="button" onClick={onLoadOlder} disabled={loadingOlder} className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">{loadingOlder ? "در حال دریافت..." : "نمایش پیام‌های قدیمی‌تر"}</button></div>}
      {items.length === 0 && <p className="py-10 text-center text-sm text-gray-400">هنوز پیامی یا فعالیتی ثبت نشده است.</p>}
      {items.map((item) => {
        if (item.kind === "activity") {
          const label = activityLabels[item.activity.type]?.(item.activity.metadata) ?? item.activity.type;
          return <div key={`activity-${item.activity.id}`} className="flex items-center gap-3 py-1 text-[11px] text-gray-400"><span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" /><span className="max-w-[78%] text-center">{item.activity.actor?.name ? `${item.activity.actor.name}: ` : ""}{label} · {new Date(item.activity.createdAt).toLocaleString("fa-IR")}</span><span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" /></div>;
        }
        const message = item.message;
        const mine = message.senderId === currentUserId;
        return (
          <div key={message.id} className={`group flex ${mine ? "justify-start" : "justify-end"}`}>
            <div className={`relative max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? "rounded-tr-sm bg-indigo-600 text-white" : "rounded-tl-sm bg-white dark:bg-gray-800"}`}>
              <div className={`mb-1 text-[11px] font-medium ${mine ? "text-indigo-100" : "text-indigo-600"}`}>{message.sender.name}</div>
              {message.replyTo && <div className={`mb-2 rounded-lg border-r-2 px-2 py-1.5 text-xs ${mine ? "border-indigo-200 bg-white/10 text-indigo-100" : "border-indigo-400 bg-gray-50 text-gray-500 dark:bg-gray-900"}`}><div className="font-medium">{message.replyTo.sender.name}</div><div className="max-w-[340px] truncate">{message.replyTo.body}</div></div>}
              <p className="whitespace-pre-wrap leading-6">{message.body}</p>
              <div className={`mt-1 flex items-center justify-between gap-4 text-[10px] ${mine ? "text-indigo-200" : "text-gray-400"}`}><span>{new Date(message.createdAt).toLocaleString("fa-IR")}</span>{message.deliveryStatus === "sending" && <span>در حال ارسال…</span>}{message.deliveryStatus === "failed" && <button type="button" onClick={() => onRetry(message)} className="inline-flex items-center gap-1 text-red-200"><RotateCcw size={11} /> تلاش مجدد</button>}</div>
              {!message.id.startsWith("temp-") && <button type="button" onClick={() => onReply(message)} className={`absolute -bottom-2 ${mine ? "-left-2" : "-right-2"} hidden rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm group-hover:block dark:border-gray-700 dark:bg-gray-900`} aria-label="پاسخ به پیام"><Reply size={13} /></button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
