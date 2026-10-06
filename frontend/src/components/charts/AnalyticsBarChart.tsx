"use client";

import type { EChartsOption } from "echarts";
import EChart from "./EChart";
import { baseChartOption, getChartTokens } from "./chartTheme";

type Series = { name: string; data: number[] };

type Props = {
  labels: string[];
  series: Series[];
  horizontal?: boolean;
  height?: number | string;
  stacked?: boolean;
};

export default function AnalyticsBarChart({ labels, series, horizontal = false, height = 320, stacked = false }: Props) {
  const t = getChartTokens();
  const categoryAxis = {
    type: "category" as const,
    data: labels,
    axisLabel: { color: t.muted, interval: 0 },
    axisTick: { show: false },
    axisLine: { show: false },
  };
  const valueAxis = {
    type: "value" as const,
    axisLabel: { color: t.muted },
    splitLine: { lineStyle: { color: t.border, opacity: 0.6 } },
  };
  const option: EChartsOption = {
    ...baseChartOption(),
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: series.length > 1 ? { top: 0, textStyle: { color: t.muted } } : undefined,
    grid: { left: 12, right: 12, top: series.length > 1 ? 40 : 18, bottom: 10, containLabel: true },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: series.map((item, index) => ({
      name: item.name,
      type: "bar",
      data: item.data,
      stack: stacked ? "total" : undefined,
      barMaxWidth: 28,
      itemStyle: {
        color: index === 0 ? t.primary : index === 1 ? t.warning : undefined,
        borderRadius: 7,
      },
    })),
  };
  return <EChart option={option} height={height} />;
}
