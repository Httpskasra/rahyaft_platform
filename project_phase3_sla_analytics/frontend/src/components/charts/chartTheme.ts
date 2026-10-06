"use client";

import type { EChartsOption } from "echarts";

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export function getChartTokens() {
  return {
    text: cssVar("--text", "#111827"),
    muted: cssVar("--muted", "#6B7280"),
    border: cssVar("--border-1", "rgba(0,0,0,0.10)"),
    surface: cssVar("--surface-2", "rgba(255,255,255,0.85)"),
    primary: cssVar("--accent", "#06b6d4"), // teal/cyan
    success: cssVar("--success", "#22c55e"),
    warning: cssVar("--warning", "#f59e0b"),
    danger: cssVar("--danger", "#ef4444"),
  };
}

export function baseChartOption(): EChartsOption {
  const t = getChartTokens();

  return {
    textStyle: { color: t.text, fontFamily: "inherit" },
    grid: { left: 12, right: 12, top: 36, bottom: 12, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      extraCssText: "border-radius: 12px; padding: 10px 12px;",
    },
    xAxis: {
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.muted },
      splitLine: { show: false },
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: t.muted },
      splitLine: { lineStyle: { color: t.border, opacity: 0.6 } },
    },
  };
}
