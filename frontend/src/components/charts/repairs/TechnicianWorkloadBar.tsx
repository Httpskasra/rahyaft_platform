"use client";

import type { EChartsOption } from "echarts";
import EChart from "../EChart";
import { baseChartOption, getChartTokens } from "../chartTheme";

type TechnicianRow = {
  name: string;
  active: number;
  overdue: number;
};

type Props = {
  rows: TechnicianRow[];
  height?: number | string;
};

export default function TechnicianWorkloadBar({ rows, height = 340 }: Props) {
  const t = getChartTokens();

  // مرتب‌سازی نزولی بر اساس (active + overdue)
  const sorted = [...rows].sort(
    (a, b) => b.active + b.overdue - (a.active + a.overdue)
  );

  const names = sorted.map((x) => x.name);
  const active = sorted.map((x) => x.active);
  const overdue = sorted.map((x) => x.overdue);

  const option: EChartsOption = {
    ...baseChartOption(),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      extraCssText: "border-radius: 12px; padding: 10px 12px;",
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: t.muted },
      itemWidth: 10,
      itemHeight: 10,
    },
    grid: { left: 12, right: 12, top: 40, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: t.muted },
      splitLine: { lineStyle: { color: t.border, opacity: 0.6 } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: t.muted },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        name: "فعال",
        type: "bar",
        stack: "total",
        data: active,
        barWidth: 14,
        itemStyle: { color: t.primary, borderRadius: [10, 0, 0, 10] },
        emphasis: { focus: "series" },
      },
      {
        name: "عقب‌افتاده",
        type: "bar",
        stack: "total",
        data: overdue,
        barWidth: 14,
        itemStyle: { color: t.warning, borderRadius: [0, 10, 10, 0] },
        emphasis: { focus: "series" },
      },
    ],
  };

  return <EChart option={option} height={height} />;
}
