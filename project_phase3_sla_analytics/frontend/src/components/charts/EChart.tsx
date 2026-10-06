"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type EChartProps = {
  option: EChartsOption;
  height?: number | string;
  className?: string;
};

export default function EChart({
  option,
  height = 320,
  className,
}: EChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
