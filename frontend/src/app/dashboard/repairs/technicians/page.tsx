import ChartCard from "@/components/charts/ChartCard";
import TechnicianWorkloadBar from "@/components/charts/repairs/TechnicianWorkloadBar";
import Link from "next/link";

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl p-4 md:p-5 shadow-sm">
      <p className="text-xs md:text-sm text-gray-600 dark:text-white/60">
        {title}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
        {hint ? (
          <p className="text-xs text-gray-500 dark:text-white/50">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function RepairsTechniciansPage() {
  // ✅ Mock data
  const rows = [
    { name: "Amin", active: 9, overdue: 2 },
    { name: "Sara", active: 6, overdue: 1 },
    { name: "Hossein", active: 11, overdue: 3 },
    { name: "Mina", active: 4, overdue: 0 },
    { name: "Arash", active: 7, overdue: 1 },
  ];

  const totalActive = rows.reduce((s, r) => s + r.active, 0);
  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);

  // جدول کوچک برای جزئیات
  const table = [...rows]
    .map((r) => ({ ...r, total: r.active + r.overdue }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
            تکنسین‌ها
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
            مدیریت ظرفیت، تشخیص گلوگاه و توزیع بهتر کار
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/repairs"
            className="rounded-xl px-3 py-2 text-sm font-medium border border-black/10 dark:border-white/10 text-gray-800 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5">
            داشبورد تعمیرات
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="تکنسین‌های فعال" value={String(rows.length)} />
        <KpiCard
          title="سفارشات فعال"
          value={String(totalActive)}
          hint="در حال انجام"
        />
        <KpiCard
          title="عقب‌افتاده"
          value={String(totalOverdue)}
          hint="SLA در خطر"
        />
        <KpiCard
          title="میانگین بار کاری"
          value={(totalActive / rows.length).toFixed(1)}
          hint="فعال/نفر"
        />
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Workload تکنسین‌ها"
          subtitle="فعال + عقب‌افتاده (برای تصمیم‌گیری در توزیع کار)"
          rightSlot={
            <div className="flex gap-2">
              <button className="rounded-xl px-3 py-2 text-xs md:text-sm border border-black/10 dark:border-white/10 text-gray-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5">
                هفته
              </button>
              <button className="rounded-xl px-3 py-2 text-xs md:text-sm border border-black/10 dark:border-white/10 text-gray-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5">
                ماه
              </button>
            </div>
          }>
          <TechnicianWorkloadBar rows={rows} />
        </ChartCard>

        <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-sm">
          <div className="p-4 md:p-5">
            <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
              جزئیات بار کاری
            </h3>
            <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-white/60">
              اولویت با تکنسین‌هایی که مجموع کار بیشتری دارند یا overdue دارند
            </p>
          </div>

          <div className="px-4 pb-4 md:px-5 md:pb-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-white/60">
                  <th className="py-2">تکنسین</th>
                  <th className="py-2">فعال</th>
                  <th className="py-2">عقب‌افتاده</th>
                  <th className="py-2">مجموع</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr
                    key={r.name}
                    className="border-t border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {r.name}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-white/80">
                      {r.active}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-white/80">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          r.overdue > 0
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
                            : "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white/70",
                        ].join(" ")}>
                        {r.overdue}
                      </span>
                    </td>
                    <td className="py-3 text-gray-900 dark:text-white font-semibold">
                      {r.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
