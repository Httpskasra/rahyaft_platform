"use client";

import type { EChartsOption } from "echarts";
import EChart from "./EChart";
import { getChartTokens } from "./chartTheme";

export default function AnalyticsDonut({ data, height = 300 }: { data: { name: string; value: number }[]; height?: number | string }) {
  const t = getChartTokens();
  const option: EChartsOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: t.muted } },
    series: [{ type: "pie", radius: ["48%", "72%"], center: ["50%", "44%"], avoidLabelOverlap: true, label: { formatter: "{b}: {c}", color: t.text }, data }],
  };
  return <EChart option={option} height={height} />;
}
