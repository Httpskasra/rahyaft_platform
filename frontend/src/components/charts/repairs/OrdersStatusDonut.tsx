"use client";

import type { EChartsOption } from "echarts";
import EChart from "../EChart";
import { getChartTokens } from "../chartTheme";

type Slice = { name: string; value: number };

type Props = {
  data: Slice[];
  height?: number | string;
};

export default function OrdersStatusDonut({ data, height = 320 }: Props) {
  const t = getChartTokens();
  const total = data.reduce((s, x) => s + x.value, 0);

  const colors = [
    t.muted, // در انتظار (neutral)
    t.primary, // در حال تعمیر
    t.success, // آماده تحویل
    "rgba(148,163,184,0.8)", // لغو شده (neutral gray)
  ];

  const option: EChartsOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      extraCssText: "border-radius: 12px; padding: 10px 12px;",
      formatter: (p: any) => `${p.name}: ${p.value} (${p.percent}%)`,
    },
    legend: {
      orient: "vertical",
      left: "60%",
      top: "middle",
      textStyle: { color: t.muted },
      icon: "circle",
    },
    series: [
      {
        type: "pie",
        radius: ["58%", "78%"],
        center: ["28%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: "transparent",
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        data,
        color: colors,
      },
    ],
    graphic: [
      {
        type: "text",
        left: "28%",
        top: "46%",
        style: {
          text: String(total),
          fill: t.text,
          fontSize: 22,
          fontWeight: 700,
          align: "center",
        },
      },
      {
        type: "text",
        left: "28%",
        top: "56%",
        style: {
          text: "کل سفارشات",
          fill: t.muted,
          fontSize: 12,
          align: "center",
        },
      },
    ],
  };

  return <EChart option={option} height={height} />;
}
