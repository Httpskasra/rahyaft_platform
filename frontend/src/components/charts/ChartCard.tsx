import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
};

export default function ChartCard({
  title,
  subtitle,
  rightSlot,
  children,
}: Props) {
  return (
    <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4 md:p-5">
        <div>
          <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-white/60">
              {subtitle}
            </p>
          ) : null}
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      <div className="px-4 pb-4 md:px-5 md:pb-5">{children}</div>
    </section>
  );
}
