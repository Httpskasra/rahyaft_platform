"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpLeft,
  Check,
  CheckCircle2,
  Clock3,
  Inbox,
  Bell,
  Paperclip,
  AtSign,
  Download,
  MessageCircle,
  Link2,
  ExternalLink,
  Plus,
  Search,
  Send,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  communicationApi,
  type CreateThreadInput,
  type InboxStats,
  type CommunicationNotification,
  type Person,
  type ThreadDetail,
  type ThreadListItem,
  type ThreadMessage,
  type ThreadPriority,
  type ThreadStatus,
  type ThreadType,
  type ThreadEntityType,
  type ThreadEntityLink,
} from "@/lib/api/communication";
import { Spinner } from "@/components/ui/Spinner";
import { ThreadTimeline } from "./components/ThreadTimeline";
import { getCommunicationSocket } from "@/lib/realtime/communication";

const statusLabels: Record<ThreadStatus, string> = {
  OPEN: "باز",
  IN_PROGRESS: "در حال پیگیری",
  WAITING: "در انتظار",
  RESOLVED: "انجام‌شده",
  CLOSED: "بسته‌شده",
  ARCHIVED: "آرشیو",
};
const priorityLabels: Record<ThreadPriority, string> = {
  LOW: "کم",
  NORMAL: "عادی",
  HIGH: "زیاد",
  URGENT: "فوری",
};
const typeLabels: Record<ThreadType, string> = {
  CONVERSATION: "گفتگو",
  REQUEST: "درخواست",
  TASK: "کار",
  REFERRAL: "ارجاع",
  ANNOUNCEMENT: "اطلاعیه",
  CASE: "پرونده",
};
const entityTypeLabels: Record<ThreadEntityType, string> = {
  CUSTOMER: "مشتری",
  REPAIR: "پرونده تعمیر",
  FORM: "فرم",
  FORM_SUBMISSION: "ارسال فرم",
  SALES_OPPORTUNITY: "فرصت فروش",
  USER: "کاربر",
  DEPARTMENT: "واحد سازمانی",
};

const priorityDot: Record<ThreadPriority, string> = {
  LOW: "bg-slate-400",
  NORMAL: "bg-sky-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-500",
};
const card = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950";

type View = "inbox" | "assigned" | "created" | "waiting" | "resolved";

export default function CommunicationsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("inbox");
  const [stats, setStats] = useState<InboxStats>({ total: 0, assigned: 0, waiting: 0, resolved: 0, unread: 0 });
  const [items, setItems] = useState<ThreadListItem[]>([]);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | ThreadStatus>("");
  const [priority, setPriority] = useState<"" | ThreadPriority>("");
  const [typeFilter, setTypeFilter] = useState<"" | ThreadType>("");
  const [creatorId, setCreatorId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [hasAttachment, setHasAttachment] = useState("");
  const [entityFilter, setEntityFilter] = useState<{ entityType: ThreadEntityType; entityId: string } | null>(null);
  const [notifications, setNotifications] = useState<CommunicationNotification[]>([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [composer, setComposer] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [initialEntityLink, setInitialEntityLink] = useState<{ entityType: ThreadEntityType; entityId: string } | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  const realtimeRefreshRef = useRef<number | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const toast = (kind: "ok" | "error", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 3000);
  };

  const refreshStats = useCallback(async () => {
    const response = await communicationApi.inbox();
    setStats(response.data);
  }, []);
  const refreshNotifications = useCallback(async () => { const response = await communicationApi.notifications(); setNotifications(response.data.items); setNotificationUnread(response.data.unread); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await communicationApi.list({
        view,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        type: typeFilter || undefined,
        creatorId: creatorId || undefined,
        assigneeId: assigneeId || undefined,
        participantId: participantId || undefined,
        hasAttachment: hasAttachment || undefined,
        entityType: entityFilter?.entityType,
        entityId: entityFilter?.entityId,
      });
      setItems(response.data.items);
      setSelected((current) => current && !response.data.items.some((item) => item.id === current.id) ? null : current);
    } catch {
      toast("error", "دریافت گفتگوها ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, [priority, search, status, view, typeFilter, creatorId, assigneeId, participantId, hasAttachment, entityFilter]);

  const openThread = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await communicationApi.get(id);
      setSelected(response.data);
      await communicationApi.markRead(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item));
      refreshStats().catch(() => undefined);
    } catch {
      toast("error", "دریافت جزئیات گفتگو ناموفق بود");
    } finally {
      setDetailLoading(false);
    }
  }, [refreshStats, refreshNotifications]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshRef.current) window.clearTimeout(realtimeRefreshRef.current);
    realtimeRefreshRef.current = window.setTimeout(() => {
      Promise.all([load(), refreshStats()]).catch(() => undefined);
    }, 120);
  }, [load, refreshStats]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const entityType = params.get("entityType") as ThreadEntityType | null;
    const entityId = params.get("entityId");
    if (entityType && entityId && entityType in entityTypeLabels) {
      setInitialEntityLink({ entityType, entityId });
      setEntityFilter({ entityType, entityId });
      if (params.get("new") === "1") setCreateOpen(true);
    }
    const threadId = params.get("threadId");
    if (threadId) {
      communicationApi.get(threadId).then(async (r) => { setSelected(r.data); await communicationApi.markRead(threadId); }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    // Initial synchronization with the communication API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([refreshStats(), refreshNotifications(), communicationApi.people().then((r) => setPeople(r.data))]).catch(() =>
      toast("error", "بارگذاری اطلاعات ارتباطات ناموفق بود"),
    );
  }, [refreshStats, refreshNotifications]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getCommunicationSocket();
    const onConnect = () => { setSocketConnected(true); if (selectedIdRef.current) socket.emit("communication:thread:join", { threadId: selectedIdRef.current }); };
    const onDisconnect = () => setSocketConnected(false);
    const onMessage = (payload: { threadId: string; message: ThreadMessage }) => {
      setSelected((current) => {
        if (!current || current.id !== payload.threadId) return current;
        const byId = current.messages.findIndex((m) => m.id === payload.message.id);
        const byClient = payload.message.clientId ? current.messages.findIndex((m) => m.clientId === payload.message.clientId) : -1;
        const index = byId >= 0 ? byId : byClient;
        const next = { ...payload.message, deliveryStatus: "sent" as const };
        if (index >= 0) { const messages = [...current.messages]; messages[index] = next; return { ...current, messages }; }
        return { ...current, messages: [...current.messages, next] };
      });
      if (payload.message.senderId !== user.id && selectedIdRef.current === payload.threadId) communicationApi.markRead(payload.threadId).catch(() => undefined);
      scheduleRealtimeRefresh();
    };
    const onThreadUpdated = (payload: { threadId: string; thread?: ThreadDetail }) => {
      if (payload.thread) setSelected((current) => current && current.id === payload.threadId ? { ...payload.thread!, messages: current.messages, messagePage: current.messagePage } : current);
      scheduleRealtimeRefresh();
    };
    const onInboxChanged = () => scheduleRealtimeRefresh();
    const onNotification = () => refreshNotifications().catch(() => undefined);
    const onAttachment = (payload: { threadId: string }) => { if (selectedIdRef.current === payload.threadId) communicationApi.get(payload.threadId).then((r)=>setSelected(r.data)).catch(()=>undefined); };
    const onAuthExpired = async () => {
      try { await refreshStats(); socket.connect(); } catch { /* axios interceptor redirects if refresh is invalid */ }
    };
    const onRead = (payload: { threadId: string }) => { setItems((current) => current.map((item) => item.id === payload.threadId ? { ...item, unread: false } : item)); refreshStats().catch(() => undefined); };
    socket.on("communication:connected", onConnect); socket.on("disconnect", onDisconnect); socket.on("communication:message.created", onMessage); socket.on("communication:thread.updated", onThreadUpdated); socket.on("communication:thread.created", onThreadUpdated); socket.on("communication:inbox.changed", onInboxChanged); socket.on("communication:notification.created", onNotification); socket.on("communication:notification.changed", onNotification); socket.on("communication:attachment.created", onAttachment); socket.on("communication:thread.read", onRead); socket.on("communication:auth-expired", onAuthExpired); socket.connect();
    return () => { socket.off("communication:connected", onConnect); socket.off("disconnect", onDisconnect); socket.off("communication:message.created", onMessage); socket.off("communication:thread.updated", onThreadUpdated); socket.off("communication:thread.created", onThreadUpdated); socket.off("communication:inbox.changed", onInboxChanged); socket.off("communication:notification.created", onNotification); socket.off("communication:notification.changed", onNotification); socket.off("communication:attachment.created", onAttachment); socket.off("communication:thread.read", onRead); socket.off("communication:auth-expired", onAuthExpired); socket.disconnect(); if (realtimeRefreshRef.current) window.clearTimeout(realtimeRefreshRef.current); };
  }, [refreshStats, refreshNotifications, scheduleRealtimeRefresh, user?.id]);

  useEffect(() => {
    selectedIdRef.current = selected?.id ?? null;
    const socket = getCommunicationSocket();
    if (!socket.connected || !selected?.id) return;
    socket.emit("communication:thread:join", { threadId: selected.id });
    return () => socket.emit("communication:thread:leave", { threadId: selected.id });
  }, [selected?.id]);

  const refreshAll = async (threadId?: string) => {
    await Promise.all([load(), refreshStats()]);
    if (threadId) await openThread(threadId);
  };

  const sendMessage = async (event: FormEvent, replyToId?: string) => {
    event.preventDefault();
    if (!selected || !composer.trim() || !user) return;
    const text = composer.trim(); const clientId = crypto.randomUUID(); const tempId = `temp-${clientId}`;
    const target = replyToId ? selected.messages.find((m) => m.id === replyToId) ?? null : null;
    const optimistic: ThreadMessage = { id: tempId, clientId, body: text, senderId: user.id, sender: { id: user.id, name: user.name, departmentId: user.departmentId }, createdAt: new Date().toISOString(), replyToId: replyToId ?? null, replyTo: target ? { id: target.id, body: target.body, senderId: target.senderId, sender: target.sender } : null, deliveryStatus: "sending" };
    setComposer(""); setSelected((current) => current ? { ...current, messages: [...current.messages, optimistic] } : current);
    try {
      const mentionUserIds = selected.participants.filter((p) => text.includes(`@${p.user.name}`)).map((p) => p.userId);
      const response = await communicationApi.message(selected.id, text, { replyToId, clientId, mentionUserIds });
      setSelected((current) => current ? { ...current, messages: current.messages.map((m) => m.id === tempId || m.clientId === clientId ? { ...response.data, deliveryStatus: "sent" } : m) } : current);
    } catch {
      setSelected((current) => current ? { ...current, messages: current.messages.map((m) => m.id === tempId ? { ...m, deliveryStatus: "failed" } : m) } : current);
      toast("error", "ارسال پیام ناموفق بود؛ پیام برای تلاش مجدد حفظ شد");
    }
  };

  const retryMessage = async (message: ThreadMessage) => {
    if (!selected || !message.clientId) return;
    setSelected((current) => current ? { ...current, messages: current.messages.map((m) => m.id === message.id ? { ...m, deliveryStatus: "sending" } : m) } : current);
    try {
      const mentionUserIds = selected.participants.filter((p) => message.body.includes(`@${p.user.name}`)).map((p) => p.userId);
      const response = await communicationApi.message(selected.id, message.body, { replyToId: message.replyToId ?? undefined, clientId: message.clientId, mentionUserIds });
      setSelected((current) => current ? { ...current, messages: current.messages.map((m) => m.id === message.id || m.clientId === message.clientId ? { ...response.data, deliveryStatus: "sent" } : m) } : current);
    } catch { setSelected((current) => current ? { ...current, messages: current.messages.map((m) => m.id === message.id ? { ...m, deliveryStatus: "failed" } : m) } : current); toast("error", "ارسال مجدد پیام ناموفق بود"); }
  };

  const updateThread = async (patch: { status?: ThreadStatus; priority?: ThreadPriority }) => {
    if (!selected) return;
    try {
      const response = await communicationApi.update(selected.id, patch);
      setSelected(response.data);
      await refreshAll();
    } catch {
      toast("error", "به‌روزرسانی گفتگو ناموفق بود");
    }
  };

  const menu = [
    { id: "inbox" as const, label: "صندوق من", count: stats.total, icon: Inbox },
    { id: "assigned" as const, label: "ارجاع‌شده به من", count: stats.assigned, icon: UserCheck },
    { id: "created" as const, label: "گفتگوهای من", count: undefined, icon: MessageCircle },
    { id: "waiting" as const, label: "در انتظار پاسخ", count: stats.waiting, icon: Clock3 },
    { id: "resolved" as const, label: "تکمیل‌شده", count: stats.resolved, icon: CheckCircle2 },
  ];

  return (
    <div dir="rtl" className="space-y-5 text-gray-800 dark:text-gray-100">
      {notice && (
        <div className={`fixed bottom-6 left-6 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-xl ${notice.kind === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>
          {notice.kind === "ok" ? <Check size={17} /> : <AlertCircle size={17} />}{notice.text}
        </div>
      )}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">ارتباطات سازمانی</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">گفتگو، درخواست، کار و ارجاع در یک جریان مشترک <span className={`inline-flex items-center gap-1 text-xs ${socketConnected ? "text-emerald-600" : "text-amber-600"}`}><span className={`h-2 w-2 rounded-full ${socketConnected ? "bg-emerald-500" : "bg-amber-500"}`} />{socketConnected ? "لحظه‌ای" : "در حال اتصال"}</span></p>
          {entityFilter && <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"><Link2 size={12}/> فیلتر: {entityTypeLabels[entityFilter.entityType]}<button onClick={()=>setEntityFilter(null)} aria-label="حذف فیلتر"><X size={12}/></button></div>}
        </div>
        <div className="relative flex items-center gap-2"><button type="button" onClick={() => setNotificationOpen((v) => !v)} className="relative rounded-xl border border-gray-200 p-2.5 dark:border-gray-700"><Bell size={18} />{notificationUnread > 0 && <span className="absolute -left-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-[10px] text-white">{notificationUnread}</span>}</button>{notificationOpen && <div className="absolute left-0 top-12 z-40 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900"><div className="flex items-center justify-between px-2 py-1"><strong className="text-sm">اعلان‌ها</strong><button className="text-xs text-indigo-600" onClick={async()=>{await communicationApi.readAllNotifications(); await refreshNotifications();}}>خواندن همه</button></div><div className="max-h-80 overflow-y-auto">{notifications.length===0?<div className="p-5 text-center text-xs text-gray-400">اعلانی نیست</div>:notifications.map((n)=><button key={n.id} className={`block w-full rounded-lg p-2 text-right text-xs ${n.readAt?"":"bg-indigo-50 dark:bg-indigo-950/30"}`} onClick={async()=>{await communicationApi.readNotification(n.id); setNotificationOpen(false); await openThread(n.threadId); await refreshNotifications();}}><div className="font-medium">{n.title}</div>{n.body&&<div className="mt-1 truncate text-gray-500">{n.body}</div>}</button>)}</div></div>}<button onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={18} /> ایجاد گفتگو
        </button></div>
      </header>

      <div className="grid min-h-[720px] gap-4 xl:grid-cols-[220px_330px_minmax(0,1fr)]">
        <aside className={`${card} p-3`}>
          <div className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            <strong className="text-lg">{stats.unread}</strong> گفتگوی خوانده‌نشده
          </div>
          <nav className="space-y-1">
            {menu.map((entry) => (
              <button key={entry.id} onClick={() => setView(entry.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${view === entry.id ? "bg-indigo-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                <entry.icon size={17} /><span className="flex-1 text-right">{entry.label}</span>
                {entry.count !== undefined && <span className={`rounded-full px-2 py-0.5 text-xs ${view === entry.id ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800"}`}>{entry.count}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <section className={`${card} overflow-hidden`}>
          <div className="space-y-2 border-b border-gray-100 p-3 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 text-gray-400" size={17} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در گفتگوها..." className={`${input} pr-9`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={input}><option value="">همه وضعیت‌ها</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={input}><option value="">همه اولویت‌ها</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value as typeof typeFilter)} className={input}><option value="">همه نوع‌ها</option>{Object.entries(typeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
              <select value={hasAttachment} onChange={(e)=>setHasAttachment(e.target.value)} className={input}><option value="">فایل: همه</option><option value="true">دارای فایل</option><option value="false">بدون فایل</option></select>
              <select value={creatorId} onChange={(e)=>setCreatorId(e.target.value)} className={input}><option value="">همه ایجادکنندگان</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select value={assigneeId} onChange={(e)=>setAssigneeId(e.target.value)} className={input}><option value="">همه مسئولان</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select value={participantId} onChange={(e)=>setParticipantId(e.target.value)} className={input}><option value="">همه اعضا</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </div>
          </div>
          <div className="max-h-[620px] overflow-y-auto">
            {loading ? <div className="flex justify-center p-12"><Spinner /></div> : items.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500">گفتگویی در این بخش نیست.</div>
            ) : items.map((thread) => (
              <button key={thread.id} onClick={() => openThread(thread.id)} className={`w-full border-b border-gray-100 p-4 text-right transition dark:border-gray-800 ${selected?.id === thread.id ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${priorityDot[thread.priority]}`} />
                  <strong className={`min-w-0 flex-1 truncate text-sm ${thread.unread ? "text-indigo-700 dark:text-indigo-300" : ""}`}>{thread.title}</strong>
                  {thread.unread && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
                </div>
                <div className="mt-2 truncate text-xs text-gray-500">{thread.lastMessage?.body ?? "بدون پیام"}</div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{typeLabels[thread.type]} · {statusLabels[thread.status]}</span>
                  <span>{new Date(thread.updatedAt).toLocaleDateString("fa-IR")}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <main className={`${card} flex min-w-0 flex-col overflow-hidden`}>
          {detailLoading ? <div className="flex flex-1 items-center justify-center"><Spinner /></div> : !selected ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-gray-400">
              <MessageCircle size={48} strokeWidth={1.3} /><p className="mt-3 text-sm">برای مشاهده پیام‌ها یک گفتگو را انتخاب کنید.</p>
            </div>
          ) : (
            <ThreadPanel
              thread={selected}
              people={people}
              currentUserId={user?.id}
              composer={composer}
              setComposer={setComposer}
              sendMessage={sendMessage}
              retryMessage={retryMessage}
              updateThread={updateThread}
              onChanged={(thread) => { setSelected(thread); refreshAll().catch(() => undefined); }}
              toast={toast}
            />
          )}
        </main>
      </div>

      {createOpen && (
        <CreateThreadModal
          people={people}
          onClose={() => setCreateOpen(false)}
          onCreated={async (thread) => {
            setCreateOpen(false);
            toast("ok", "گفتگو ایجاد شد");
            await refreshAll();
            await openThread(thread.id);
          }}
          toast={toast}
          initialEntityLink={initialEntityLink}
        />
      )}
    </div>
  );
}

function ThreadPanel({ thread, people, currentUserId, composer, setComposer, sendMessage, retryMessage, updateThread, onChanged, toast }: {
  thread: ThreadDetail;
  people: Person[];
  currentUserId?: string;
  composer: string;
  setComposer: (value: string) => void;
  sendMessage: (event: FormEvent, replyToId?: string) => void;
  retryMessage: (message: ThreadMessage) => void;
  updateThread: (patch: { status?: ThreadStatus; priority?: ThreadPriority }) => void;
  onChanged: (thread: ThreadDetail) => void;
  toast: (kind: "ok" | "error", text: string) => void;
}) {
  const [personId, setPersonId] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<ThreadMessage | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const availablePeople = useMemo(() => people.filter((person) => !thread.participants.some((p) => p.userId === person.id)), [people, thread.participants]);
  const addPerson = async (asAssignee: boolean) => {
    if (!personId) return;
    try {
      const response = asAssignee ? await communicationApi.assign(thread.id, personId) : await communicationApi.addParticipant(thread.id, personId);
      onChanged(response.data);
      setPersonId("");
    } catch { toast("error", "افزودن کاربر ناموفق بود"); }
  };

  const loadOlder = async () => {
    if (!thread.messagePage?.hasMore || !thread.messagePage.nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const response = await communicationApi.messages(thread.id, thread.messagePage.nextCursor);
      const known = new Set(thread.messages.map((message) => message.id));
      const older = response.data.items.filter((message) => !known.has(message.id));
      onChanged({
        ...thread,
        messages: [...older, ...thread.messages],
        messagePage: response.data.pageInfo,
      });
    } catch {
      toast("error", "دریافت پیام‌های قدیمی‌تر ناموفق بود");
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <>
      <div className="border-b border-gray-100 p-4 dark:border-gray-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold">{thread.title}</h2>
            <div className="mt-1 text-xs text-gray-500">ایجادکننده: {thread.creator.name} · {typeLabels[thread.type]}</div>
          </div>
          <select value={thread.status} onChange={(e) => updateThread({ status: e.target.value as ThreadStatus })} className="rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-xs dark:border-gray-700">
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={thread.priority} onChange={(e) => updateThread({ priority: e.target.value as ThreadPriority })} className="rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-xs dark:border-gray-700">
            {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Users size={15} className="text-gray-400" />
          {thread.participants.map((participant) => (
            <span key={participant.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800">
              {participant.user.name}{participant.role === "ASSIGNEE" && <UserCheck size={12} className="text-indigo-500" />}
              {participant.userId !== thread.creatorId && participant.userId !== currentUserId && (
                <button onClick={async () => {
                  try { const r = await communicationApi.removeParticipant(thread.id, participant.userId); onChanged(r.data); }
                  catch { toast("error", "حذف عضو ناموفق بود"); }
                }} aria-label="حذف عضو"><X size={12} /></button>
              )}
            </span>
          ))}
        </div>
        {availablePeople.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-xs dark:border-gray-700">
              <option value="">انتخاب همکار...</option>
              {availablePeople.map((person) => <option key={person.id} value={person.id}>{person.name}{person.department?.name ? ` — ${person.department.name}` : ""}</option>)}
            </select>
            <button onClick={() => addPerson(false)} disabled={!personId} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-700">افزودن عضو</button>
            <button onClick={() => addPerson(true)} disabled={!personId} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-40">ارجاع مسئولیت</button>
          </div>
        )}
      </div>
      <EntityLinksPanel thread={thread} onChanged={onChanged} toast={toast} />
      <ThreadTimeline
        thread={thread}
        currentUserId={currentUserId}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlder}
        onReply={setReplyTo}
        onRetry={retryMessage}
      />
      {thread.attachments?.length > 0 && <div className="flex flex-wrap gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800">{thread.attachments.map((a)=><button key={a.id} type="button" className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800" onClick={async()=>{const r=await communicationApi.attachment(a.id); const link=document.createElement("a"); link.href=`data:${r.data.mimeType};base64,${r.data.data}`; link.download=r.data.fileName; link.click();}}><Download size={13}/>{a.fileName}</button>)}</div>}
      {replyTo && <div className="mx-3 mt-2 flex items-center gap-3 rounded-xl border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 text-xs dark:bg-indigo-950/30"><div className="min-w-0 flex-1"><div className="font-medium text-indigo-700 dark:text-indigo-300">پاسخ به {replyTo.sender.name}</div><div className="truncate text-gray-500">{replyTo.body}</div></div><button type="button" onClick={() => setReplyTo(null)}><X size={15} /></button></div>}
      <form onSubmit={(event) => { sendMessage(event, replyTo?.id); setReplyTo(null); }} className="border-t border-gray-100 p-3 dark:border-gray-800"><div className="mb-2 flex gap-1 overflow-x-auto">{thread.participants.filter(p=>p.userId!==currentUserId).map(p=><button key={p.userId} type="button" onClick={()=>setComposer(`${composer}${composer&&!composer.endsWith(" ")?" ":""}@${p.user.name} `)} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800"><AtSign size={11}/>{p.user.name}</button>)}</div><div className="flex gap-2"><input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg,.webp,.txt" onChange={async(e)=>{const f=e.target.files?.[0]; if(!f)return; setUploading(true); try{await communicationApi.uploadAttachment(thread.id,f); const r=await communicationApi.get(thread.id); onChanged(r.data); toast("ok","فایل بارگذاری شد");}catch{toast("error","بارگذاری فایل ناموفق بود");}finally{setUploading(false); e.target.value="";}}}/><button type="button" disabled={uploading} onClick={()=>fileRef.current?.click()} className="rounded-xl border border-gray-200 px-3 dark:border-gray-700"><Paperclip size={18}/></button><textarea value={composer} onChange={(e) => setComposer(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} placeholder="پیام... برای منشن از دکمه @ استفاده کنید" className={`${input} resize-none`} /><button disabled={!composer.trim()} className="self-stretch rounded-xl bg-indigo-600 px-4 text-white disabled:opacity-40"><Send size={19} /></button></div></form>
    </>
  );
}


function EntityLinksPanel({ thread, onChanged, toast }: { thread: ThreadDetail; onChanged: (thread: ThreadDetail) => void; toast: (kind: "ok" | "error", text: string) => void }) {
  const [type, setType] = useState<ThreadEntityType>("CUSTOMER");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ThreadEntityLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const find = async () => {
    setLoading(true);
    try { const r = await communicationApi.entitySearch(type, search); setResults(r.data); }
    catch { toast("error", "جستجوی رکوردهای مرتبط ناموفق بود"); }
    finally { setLoading(false); }
  };
  return <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
    <div className="flex flex-wrap items-center gap-2">
      <Link2 size={15} className="text-indigo-500"/><span className="text-xs font-semibold">مرتبط با</span>
      {(thread.entityLinks ?? []).map((link) => <span key={link.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
        {link.href ? <a href={link.href} className="inline-flex items-center gap-1 hover:underline">{entityTypeLabels[link.entityType]}: {link.label}<ExternalLink size={10}/></a> : <>{entityTypeLabels[link.entityType]}: {link.label}</>}
        <button type="button" aria-label="حذف ارتباط" onClick={async()=>{try{const r=await communicationApi.removeEntityLink(thread.id,link.entityType,link.entityId);onChanged(r.data);}catch{toast("error","حذف ارتباط ناموفق بود");}}}><X size={11}/></button>
      </span>)}
      <button type="button" onClick={()=>setOpen(v=>!v)} className="rounded-lg border border-dashed border-indigo-300 px-2 py-1 text-xs text-indigo-600">+ اتصال رکورد</button>
    </div>
    {open && <div className="mt-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select value={type} onChange={e=>{setType(e.target.value as ThreadEntityType);setResults([]);}} className={input}>{Object.entries(entityTypeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&find()} placeholder="نام، شماره پرونده، عنوان..." className={input}/>
        <button type="button" onClick={find} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs text-white">{loading?"...":"جستجو"}</button>
      </div>
      {results.length>0 && <div className="mt-2 max-h-40 overflow-y-auto">{results.map(r=><button type="button" key={`${r.entityType}:${r.entityId}`} onClick={async()=>{try{const x=await communicationApi.addEntityLink(thread.id,r.entityType,r.entityId);onChanged(x.data);setOpen(false);setResults([]);}catch{toast("error","اتصال رکورد ناموفق بود");}}} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-xs hover:bg-gray-50 dark:hover:bg-gray-800"><span><b>{r.label}</b>{r.subtitle&&<small className="mr-2 text-gray-400">{r.subtitle}</small>}</span><Plus size={13}/></button>)}</div>}
    </div>}
  </div>;
}

function CreateThreadModal({ people, onClose, onCreated, toast, initialEntityLink }: { people: Person[]; onClose: () => void; onCreated: (thread: ThreadDetail) => void; toast: (kind: "ok" | "error", text: string) => void; initialEntityLink?: { entityType: ThreadEntityType; entityId: string } | null }) {
  const [form, setForm] = useState<CreateThreadInput>({ title: "", type: "CONVERSATION", priority: "NORMAL", initialMessage: "", participantIds: [], assigneeIds: [], entityLinks: initialEntityLink ? [initialEntityLink] : [] });
  const [saving, setSaving] = useState(false);
  const toggle = (key: "participantIds" | "assigneeIds", id: string) => setForm((current) => {
    const values = current[key] ?? [];
    return { ...current, [key]: values.includes(id) ? values.filter((value) => value !== id) : [...values, id] };
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { const response = await communicationApi.create(form); onCreated(response.data); }
    catch { toast("error", "ایجاد گفتگو ناموفق بود"); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} dir="rtl" className={`${card} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5`}>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">ایجاد گفتگوی جدید</h2><button type="button" onClick={onClose}><X size={20} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm">عنوان<input required minLength={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${input} mt-1.5`} /></label>
          <label className="text-sm">نوع<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ThreadType })} className={`${input} mt-1.5`}>{Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="text-sm">اولویت<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ThreadPriority })} className={`${input} mt-1.5`}>{Object.entries(priorityLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="text-sm">مهلت (اختیاری)<input type="datetime-local" value={form.dueAt ?? ""} onChange={(e) => setForm({ ...form, dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className={`${input} mt-1.5`} /></label>
          <label className="sm:col-span-2 text-sm">پیام آغازین<textarea rows={3} value={form.initialMessage} onChange={(e) => setForm({ ...form, initialMessage: e.target.value })} className={`${input} mt-1.5 resize-none`} /></label>
        </div>
        {initialEntityLink && <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"><Link2 className="ml-2 inline" size={15}/>این گفتگو هنگام ایجاد به {entityTypeLabels[initialEntityLink.entityType]} انتخاب‌شده متصل می‌شود.</div>}
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium">اعضا و مسئولان</div>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-gray-700">
            {people.map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                <span className="min-w-0 flex-1 text-sm">{person.name}<small className="mr-2 text-gray-400">{person.department?.name}</small></span>
                <label className="text-xs"><input type="checkbox" checked={form.participantIds?.includes(person.id)} onChange={() => toggle("participantIds", person.id)} className="ml-1" />عضو</label>
                <label className="text-xs"><input type="checkbox" checked={form.assigneeIds?.includes(person.id)} onChange={() => toggle("assigneeIds", person.id)} className="ml-1" />مسئول</label>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700">انصراف</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? <Spinner /> : <ArrowUpLeft size={17} />} ایجاد</button></div>
      </form>
    </div>
  );
}
