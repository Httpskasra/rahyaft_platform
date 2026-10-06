"use client";

import type { EChartsOption } from "echarts";
import EChart from "./EChart";
import { baseChartOption, getChartTokens } from "./chartTheme";

export default function AnalyticsLineChart({
  labels,
  series,
  height = 300,
}: {
  labels: string[];
  series: { name: string; data: number[] }[];
  height?: number | string;
}) {
  const t = getChartTokens();
  const option: EChartsOption = {
    ...baseChartOption(),
    legend: { top: 0, right: 0, textStyle: { color: t.muted } },
    xAxis: { type: "category", data: labels, axisLabel: { color: t.muted }, axisTick: { show: false }, axisLine: { lineStyle: { color: t.border } } },
    yAxis: { type: "value", minInterval: 1, axisLabel: { color: t.muted }, splitLine: { lineStyle: { color: t.border, opacity: 0.6 } } },
    series: series.map((item) => ({ name: item.name, type: "line", smooth: true, symbolSize: 5, data: item.data, areaStyle: { opacity: 0.06 } })),
  };
  return <EChart option={option} height={height} />;
}
