import ChartCard from "@/components/charts/ChartCard";
import SLABreachStackedBar from "@/components/charts/repairs/SLABreachStackedBar";
import Link from "next/link";

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl p-4 md:p-5 shadow-sm">
      <p className="text-xs md:text-sm text-gray-600 dark:text-white/60">{title}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {hint ? <p className="text-xs text-gray-500 dark:text-white/50">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function RepairsReportsPage() {
  // ✅ Mock data
  const labels = ["هفته 1", "هفته 2", "هفته 3", "هفته 4", "هفته 5", "هفته 6"];
  const withinSla = [42, 38, 45, 40, 47, 44];
  const breachedSla = [6, 9, 5, 8, 4, 6];

  const totalDone = withinSla.reduce((s, x) => s + x, 0) + breachedSla.reduce((s, x) => s + x, 0);
  const totalBreached = breachedSla.reduce((s, x) => s + x, 0);
  const breachRate = totalDone === 0 ? 0 : (totalBreached / totalDone) * 100;

  const reasons = [
    { reason: "کمبود قطعه", count: 11, impact: "High" },
    { reason: "تخصیص دیرهنگام تکنسین", count: 9, impact: "High" },
    { reason: "تشخیص اولیه ناقص", count: 6, impact: "Medium" },
    { reason: "زمان تست/کالیبراسیون طولانی", count: 4, impact: "Medium" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
            گزارش‌ها و تحلیل
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
            تصمیم‌گیری مدیریتی: SLA، گلوگاه‌ها، و روندها
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/repairs"
            className="rounded-xl px-3 py-2 text-sm font-medium border border-black/10 dark:border-white/10 text-gray-800 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5"
          >
            داشبورد تعمیرات
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="کل تکمیل‌شده‌ها" value={String(totalDone)} hint="۶ هفته" />
        <KpiCard title="نقض SLA" value={String(totalBreached)} hint="۶ هفته" />
        <KpiCard title="نرخ نقض SLA" value={`${breachRate.toFixed(1)}%`} hint="کمتر بهتر" />
        <KpiCard title="میانگین MTTR" value="2.4 روز" hint="نمونه" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="SLA Breach"
          subtitle="داخل SLA در مقابل نقض SLA (برای تشخیص بحران و روند)"
          rightSlot={
            <div className="flex gap-2">
              <button className="rounded-xl px-3 py-2 text-xs md:text-sm border border-black/10 dark:border-white/10 text-gray-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5">
                ۶ هفته
              </button>
              <button className="rounded-xl px-3 py-2 text-xs md:text-sm border border-black/10 dark:border-white/10 text-gray-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5">
                ۳ ماه
              </button>
            </div>
          }
        >
          <SLABreachStackedBar labels={labels} withinSla={withinSla} breachedSla={breachedSla} />
        </ChartCard>

        {/* Top reasons */}
        <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-sm">
          <div className="p-4 md:p-5">
            <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
              دلایل رایج نقض SLA
            </h3>
            <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-white/60">
              تمرکز بهبود روی موارد با “High impact”
            </p>
          </div>

          <div className="px-4 pb-4 md:px-5 md:pb-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-white/60">
                  <th className="py-2">دلیل</th>
                  <th className="py-2">تعداد</th>
                  <th className="py-2">اثر</th>
                </tr>
              </thead>
              <tbody>
                {reasons.map((r) => (
                  <tr
                    key={r.reason}
                    className="border-t border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 font-medium text-gray-900 dark:text-white">{r.reason}</td>
                    <td className="py-3 text-gray-700 dark:text-white/80">{r.count}</td>
                    <td className="py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          r.impact === "High"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
                            : "bg-cyan-100 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-200",
                        ].join(" ")}
                      >
                        {r.impact}
                      </span>
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
