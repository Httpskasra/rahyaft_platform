"use client";

import type { EChartsOption } from "echarts";
import EChart from "../EChart";
import { baseChartOption, getChartTokens } from "../chartTheme";

type Props = {
  labels: string[];
  created: number[];
  completed: number[];
  height?: number | string;
};

export default function RepairsVolumeLine({
  labels,
  created,
  completed,
  height = 320,
}: Props) {
  const t = getChartTokens();

  const option: EChartsOption = {
    ...baseChartOption(),
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: t.muted },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: { ...(baseChartOption() as any).xAxis, data: labels },
    yAxis: { ...(baseChartOption() as any).yAxis },
    series: [
      {
        name: "جدید",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: created,
        lineStyle: { width: 3, color: t.primary },
        areaStyle: { opacity: 0.1 },
      },
      {
        name: "تکمیل‌شده",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: completed,
        lineStyle: { width: 3, color: t.success },
        areaStyle: { opacity: 0.08 },
      },
    ],
  };

  return <EChart option={option} height={height} />;
}
