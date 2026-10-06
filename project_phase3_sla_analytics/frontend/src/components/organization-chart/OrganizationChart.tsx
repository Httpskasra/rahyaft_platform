"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import { Maximize2, RefreshCcw, Scan } from "lucide-react";

import type { OrganizationChartResponse } from "@/lib/api/departments";

import { DepartmentNode } from "./DepartmentNode";
import {
  createOrganizationChartElements,
  type DepartmentChartNode,
} from "./chart-layout";

interface OrganizationChartProps {
  chart: OrganizationChartResponse;
  onRefresh: () => void;
  refreshing?: boolean;
}

const nodeTypes = {
  department: DepartmentNode,
};

function OrganizationChartCanvas({
  chart,
  onRefresh,
  refreshing = false,
}: OrganizationChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState<
    Set<string>
  >(new Set());

  const { fitView } = useReactFlow<DepartmentChartNode, Edge>();

  const elements = useMemo(() => {
    return createOrganizationChartElements(chart, expandedDepartmentIds);
  }, [chart, expandedDepartmentIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState<DepartmentChartNode>(
    elements.nodes,
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(elements.edges);

  const fitChart = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        fitView({
          padding: 0.18,
          duration: 600,
          minZoom: 0.15,
          maxZoom: 1,
        });
      });
    });
  }, [fitView]);

  useEffect(() => {
    setNodes(elements.nodes);
    setEdges(elements.edges);

    const timeout = window.setTimeout(() => {
      fitChart();
    }, 100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [elements, fitChart, setEdges, setNodes]);

  const toggleDepartment = useCallback((departmentId: string) => {
    setExpandedDepartmentIds((current) => {
      const next = new Set(current);

      if (next.has(departmentId)) {
        next.delete(departmentId);
      } else {
        next.add(departmentId);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        departmentId: string;
      }>;

      toggleDepartment(customEvent.detail.departmentId);
    };

    window.addEventListener("organization-chart:toggle-department", handler);

    return () => {
      window.removeEventListener(
        "organization-chart:toggle-department",
        handler,
      );
    };
  }, [toggleDepartment]);

  const handleInit = useCallback(() => {
    fitChart();
  }, [fitChart]);

  const handleFullscreen = useCallback(async () => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }

      window.setTimeout(() => {
        fitChart();
      }, 250);
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, [fitChart]);

  return (
    <div
      ref={containerRef}
      className="
        organization-chart-wrapper
        relative
        h-[750px]
        min-h-[600px]
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-gray-200
        bg-white
        dark:border-gray-800
        dark:bg-gray-950
      "
      dir="ltr">
      <div
        className="
          absolute
          left-4
          top-4
          z-20
          flex
          flex-wrap
          items-center
          gap-2
        "
        dir="rtl">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="
            flex
            h-10
            items-center
            gap-2
            rounded-xl
            border
            border-gray-200
            bg-white
            px-3
            text-xs
            font-medium
            text-gray-700
            shadow-sm
            transition
            hover:bg-gray-50
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:border-gray-700
            dark:bg-gray-900
            dark:text-gray-200
            dark:hover:bg-gray-800
          ">
          <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
          بروزرسانی
        </button>

        <button
          type="button"
          onClick={fitChart}
          className="
            flex
            h-10
            items-center
            gap-2
            rounded-xl
            border
            border-gray-200
            bg-white
            px-3
            text-xs
            font-medium
            text-gray-700
            shadow-sm
            transition
            hover:bg-gray-50
            dark:border-gray-700
            dark:bg-gray-900
            dark:text-gray-200
            dark:hover:bg-gray-800
          ">
          <Scan size={16} />
          تنظیم در صفحه
        </button>

        <button
          type="button"
          onClick={handleFullscreen}
          className="
            flex
            h-10
            items-center
            gap-2
            rounded-xl
            border
            border-gray-200
            bg-white
            px-3
            text-xs
            font-medium
            text-gray-700
            shadow-sm
            transition
            hover:bg-gray-50
            dark:border-gray-700
            dark:bg-gray-900
            dark:text-gray-200
            dark:hover:bg-gray-800
          ">
          <Maximize2 size={16} />
          تمام صفحه
        </button>
      </div>

      <ReactFlow<DepartmentChartNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={handleInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{
          padding: 0.18,
          minZoom: 0.15,
          maxZoom: 1,
        }}
        minZoom={0.1}
        maxZoom={1.6}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
        onlyRenderVisibleElements={false}
        attributionPosition="bottom-right"
        proOptions={{
          hideAttribution: true,
        }}
        style={{
          width: "100%",
          height: "100%",
          direction: "ltr",
        }}>
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} />

        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function OrganizationChart(props: OrganizationChartProps) {
  return (
    <ReactFlowProvider>
      <OrganizationChartCanvas {...props} />
    </ReactFlowProvider>
  );
}
