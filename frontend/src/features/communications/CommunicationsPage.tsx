"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpLeft,
  Check,
  CheckCircle2,
  Clock3,
  Inbox,
  MessageCircle,
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
  type Person,
  type ThreadDetail,
  type ThreadListItem,
  type ThreadPriority,
  type ThreadStatus,
  type ThreadType,
} from "@/lib/api/communication";
import { Spinner } from "@/components/ui/Spinner";

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
  const [composer, setComposer] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const toast = (kind: "ok" | "error", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 3000);
  };

  const refreshStats = useCallback(async () => {
    const response = await communicationApi.inbox();
    setStats(response.data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await communicationApi.list({
        view,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
      });
      setItems(response.data.items);
      if (selected && !response.data.items.some((item) => item.id === selected.id)) setSelected(null);
    } catch {
      toast("error", "دریافت گفتگوها ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, [priority, search, selected, status, view]);

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
  }, [refreshStats]);

  useEffect(() => {
    // Initial synchronization with the communication API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([refreshStats(), communicationApi.people().then((r) => setPeople(r.data))]).catch(() =>
      toast("error", "بارگذاری اطلاعات ارتباطات ناموفق بود"),
    );
  }, [refreshStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const refreshAll = async (threadId?: string) => {
    await Promise.all([load(), refreshStats()]);
    if (threadId) await openThread(threadId);
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !composer.trim()) return;
    const text = composer.trim();
    setComposer("");
    try {
      const response = await communicationApi.message(selected.id, text);
      setSelected((current) => current ? { ...current, messages: [...current.messages, response.data] } : current);
      await refreshAll();
    } catch {
      setComposer(text);
      toast("error", "ارسال پیام ناموفق بود");
    }
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
          <p className="mt-1 text-sm text-gray-500">گفتگو، درخواست، کار و ارجاع در یک جریان مشترک</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={18} /> ایجاد گفتگو
        </button>
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
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={input}>
                <option value="">همه وضعیت‌ها</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={input}>
                <option value="">همه اولویت‌ها</option>
                {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
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
        />
      )}
    </div>
  );
}

function ThreadPanel({ thread, people, currentUserId, composer, setComposer, sendMessage, updateThread, onChanged, toast }: {
  thread: ThreadDetail;
  people: Person[];
  currentUserId?: string;
  composer: string;
  setComposer: (value: string) => void;
  sendMessage: (event: FormEvent) => void;
  updateThread: (patch: { status?: ThreadStatus; priority?: ThreadPriority }) => void;
  onChanged: (thread: ThreadDetail) => void;
  toast: (kind: "ok" | "error", text: string) => void;
}) {
  const [personId, setPersonId] = useState("");
  const availablePeople = useMemo(() => people.filter((person) => !thread.participants.some((p) => p.userId === person.id)), [people, thread.participants]);
  const addPerson = async (asAssignee: boolean) => {
    if (!personId) return;
    try {
      const response = asAssignee ? await communicationApi.assign(thread.id, personId) : await communicationApi.addParticipant(thread.id, personId);
      onChanged(response.data);
      setPersonId("");
    } catch { toast("error", "افزودن کاربر ناموفق بود"); }
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
      <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/70 p-4 dark:bg-gray-950/40">
        {thread.messages.length === 0 && <p className="py-10 text-center text-sm text-gray-400">هنوز پیامی ارسال نشده است.</p>}
        {thread.messages.map((message) => {
          const mine = message.senderId === currentUserId;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? "rounded-tr-sm bg-indigo-600 text-white" : "rounded-tl-sm bg-white dark:bg-gray-800"}`}>
                <div className={`mb-1 text-[11px] font-medium ${mine ? "text-indigo-100" : "text-indigo-600"}`}>{message.sender.name}</div>
                <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                <div className={`mt-1 text-left text-[10px] ${mine ? "text-indigo-200" : "text-gray-400"}`}>{new Date(message.createdAt).toLocaleString("fa-IR")}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
        <textarea value={composer} onChange={(e) => setComposer(e.target.value)} rows={2} placeholder="پیام خود را بنویسید..." className={`${input} resize-none`} />
        <button disabled={!composer.trim()} className="self-stretch rounded-xl bg-indigo-600 px-4 text-white disabled:opacity-40"><Send size={19} /></button>
      </form>
    </>
  );
}

function CreateThreadModal({ people, onClose, onCreated, toast }: { people: Person[]; onClose: () => void; onCreated: (thread: ThreadDetail) => void; toast: (kind: "ok" | "error", text: string) => void }) {
  const [form, setForm] = useState<CreateThreadInput>({ title: "", type: "CONVERSATION", priority: "NORMAL", initialMessage: "", participantIds: [], assigneeIds: [] });
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
