import ChartCard from "@/components/charts/ChartCard";
import RepairsVolumeLine from "@/components/charts/repairs/RepairsVolumeLine";
import OrdersStatusDonut from "@/components/charts/repairs/OrdersStatusDonut";
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

export default function RepairsOverviewPage() {
  // ✅ Mock data (بعداً از API میاد)
  const labels = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
  ];
  const created = [18, 22, 16, 28, 25, 20, 24];
  const completed = [12, 19, 14, 21, 23, 18, 20];

  const donutData = [
    { name: "در انتظار", value: 24 },
    { name: "در حال تعمیر", value: 18 },
    { name: "آماده تحویل", value: 12 },
    { name: "لغو شده", value: 4 },
  ];

  const attentionRows = [
    {
      id: "R-10421",
      customer: "Rahyaft Clinic",
      due: "امروز",
      priority: "High",
    },
    { id: "R-10418", customer: "MedTech GmbH", due: "دیروز", priority: "High" },
    { id: "R-10397", customer: "VIP — Dr. X", due: "فردا", priority: "Medium" },
  ];

  return (
    <div className="space-y-6">
      {/* عنوان */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
            داشبورد تعمیرات
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
            وضعیت کلی سفارشات، گلوگاه‌ها و کارهای فوری
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/repairs/orders"
            className="rounded-xl px-3 py-2 text-sm font-medium bg-gray-900 text-white hover:opacity-90 dark:bg-white dark:text-gray-900">
            سفارشات
          </Link>
        </div>
      </div>

      {/* KPI ها */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <KpiCard title="سفارشات فعال" value="54" hint="اکنون" />
        <KpiCard title="عقب‌افتاده" value="7" hint="SLA در خطر" />
        <KpiCard title="تکمیل‌شده" value="21" hint="این هفته" />
        <KpiCard title="نرخ برگشتی" value="3.2%" hint="۳۰ روز" />
        <KpiCard title="MTTR" value="2.6 روز" hint="میانگین" />
      </div>

      {/* نمودارها */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="حجم تعمیرات"
          subtitle="مقایسه سفارشات جدید و تکمیل‌شده در طول هفته"
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
          <RepairsVolumeLine
            labels={labels}
            created={created}
            completed={completed}
          />
        </ChartCard>

        <ChartCard
          title="وضعیت سفارشات"
          subtitle="توزیع وضعیت فعلی سفارشات تعمیر">
          <OrdersStatusDonut data={donutData} />
        </ChartCard>
      </div>

      {/* نیاز به توجه */}
      <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-sm">
        <div className="flex items-start justify-between gap-3 p-4 md:p-5">
          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
              نیاز به توجه
            </h3>
            <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-white/60">
              سفارشات overdue و موارد با اولویت بالا
            </p>
          </div>

          <Link
            href="/dashboard/repairs/orders"
            className="text-sm font-medium text-gray-900 dark:text-white underline underline-offset-4 opacity-80 hover:opacity-100">
            مشاهده همه
          </Link>
        </div>

        <div className="px-4 pb-4 md:px-5 md:pb-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-white/60">
                <th className="py-2">سفارش</th>
                <th className="py-2">مشتری</th>
                <th className="py-2">Due</th>
                <th className="py-2">اولویت</th>
              </tr>
            </thead>
            <tbody>
              {attentionRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 font-medium text-gray-900 dark:text-white">
                    <Link
                      href={`/dashboard/repairs/orders`}
                      className="hover:underline">
                      {r.id}
                    </Link>
                  </td>
                  <td className="py-3 text-gray-700 dark:text-white/80">
                    {r.customer}
                  </td>
                  <td className="py-3 text-gray-700 dark:text-white/80">
                    {r.due}
                  </td>
                  <td className="py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        r.priority === "High"
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
                          : "bg-cyan-100 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-200",
                      ].join(" ")}>
                      {r.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
