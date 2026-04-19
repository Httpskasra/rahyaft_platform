"use client";

import type { EChartsOption } from "echarts";
import EChart from "../EChart";
import { baseChartOption, getChartTokens } from "../chartTheme";

type Props = {
  labels: string[];        // هفته‌ها یا روزها
  withinSla: number[];     // تعداد تحویل/اتمام داخل SLA
  breachedSla: number[];   // تعداد نقض SLA
  height?: number | string;
};

export default function SLABreachStackedBar({
  labels,
  withinSla,
  breachedSla,
  height = 340,
}: Props) {
  const t = getChartTokens();

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
      icon: "circle",
      itemWidth: 10,
      itemHeight: 10,
    },
    grid: { left: 12, right: 12, top: 40, bottom: 12, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { color: t.muted },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: t.border } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: t.muted },
      axisTick: { show: false },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: t.border, opacity: 0.6 } },
    },
    series: [
      {
        name: "داخل SLA",
        type: "bar",
        stack: "sla",
        data: withinSla,
        barWidth: 16,
        itemStyle: { color: t.success, borderRadius: [10, 10, 0, 0] },
        emphasis: { focus: "series" },
      },
      {
        name: "نقض SLA",
        type: "bar",
        stack: "sla",
        data: breachedSla,
        barWidth: 16,
        itemStyle: { color: t.warning },
        emphasis: { focus: "series" },
      },
    ],
  };

  return <EChart option={option} height={height} />;
}
