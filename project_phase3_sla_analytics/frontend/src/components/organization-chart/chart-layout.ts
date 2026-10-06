import dagre from "dagre";

import {
  MarkerType,
  Position,
  type Edge,
  type Node,
} from "@xyflow/react";

import type {
  OrganizationChartDepartment,
  OrganizationChartResponse,
} from "@/lib/api/departments";

const NODE_WIDTH = 340;
const COLLAPSED_NODE_HEIGHT = 190;
const EXPANDED_EMPLOYEE_HEIGHT = 92;
const EXPANDED_MAX_VISIBLE_EMPLOYEES = 5;

export interface DepartmentNodeData
  extends Record<string, unknown> {
  department: OrganizationChartDepartment;
  isExpanded: boolean;
}
export type DepartmentChartNode =
  Node<DepartmentNodeData, "department">;
export function createOrganizationChartElements(
  chart: OrganizationChartResponse,
  expandedDepartmentIds: Set<string>,
): {
  nodes: DepartmentChartNode[];
  edges: Edge[];
} {
  const graph =
    new dagre.graphlib.Graph();

  graph.setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: "TB",
    ranksep: 130,
    nodesep: 80,
    edgesep: 40,
    marginx: 80,
    marginy: 80,
    align: "UL",
  });

  const nodes: DepartmentChartNode[] =
    chart.departments.map(
      (department) => {
        const isExpanded =
          expandedDepartmentIds.has(
            department.id,
          );

        const visibleEmployeeCount =
          Math.min(
            department.employees.length,
            EXPANDED_MAX_VISIBLE_EMPLOYEES,
          );

        const nodeHeight = isExpanded
          ? COLLAPSED_NODE_HEIGHT +
            visibleEmployeeCount *
              EXPANDED_EMPLOYEE_HEIGHT
          : COLLAPSED_NODE_HEIGHT;

        const nodeId = getDepartmentNodeId(
          department.id,
        );

        graph.setNode(nodeId, {
          width: NODE_WIDTH,
          height: nodeHeight,
        });

        return {
          id: nodeId,
          type: "department",

          position: {
            x: 0,
            y: 0,
          },

          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,

          data: {
            department,
            isExpanded,
          },

          style: {
            width: NODE_WIDTH,
          },
        };
      },
    );

  const hierarchyEdges: Edge[] =
    chart.departments
      .filter(
        (
          department,
        ): department is OrganizationChartDepartment & {
          parentId: string;
        } => Boolean(department.parentId),
      )
      .map((department) => {
        const source =
          getDepartmentNodeId(
            department.parentId,
          );

        const target =
          getDepartmentNodeId(
            department.id,
          );

        graph.setEdge(source, target);

        return {
          id: `hierarchy-${department.parentId}-${department.id}`,
          source,
          target,
          type: "smoothstep",

          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
          },

          style: {
            stroke: "#94a3b8",
            strokeWidth: 2,
          },
        };
      });

  dagre.layout(graph);

  const positionedNodes =
    nodes.map((node) => {
      const calculatedPosition =
        graph.node(node.id);

      const nodeDimensions =
        graph.node(node.id);

      return {
        ...node,

        position: {
          x:
            calculatedPosition.x -
            nodeDimensions.width / 2,

          y:
            calculatedPosition.y -
            nodeDimensions.height / 2,
        },
      };
    });

  const availableDepartmentIds =
    new Set(
      chart.departments.map(
        (department) => department.id,
      ),
    );

  const relationEdges: Edge[] =
    chart.relations.departments
      .filter(
        (relation) =>
          availableDepartmentIds.has(
            relation.sourceDepartmentId,
          ) &&
          availableDepartmentIds.has(
            relation.targetDepartmentId,
          ),
      )
      .map((relation) => ({
        id: `relation-${relation.id}`,

        source: getDepartmentNodeId(
          relation.sourceDepartmentId,
        ),

        target: getDepartmentNodeId(
          relation.targetDepartmentId,
        ),

        type: "bezier",

        label: getRelationLabel(
          relation.type,
        ),

        animated:
          relation.type ===
          "COLLABORATES",

        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
        },

        labelStyle: {
          fontSize: 11,
          fontWeight: 600,
          fill: "#475569",
        },

        labelBgStyle: {
          fill: "#ffffff",
          fillOpacity: 0.95,
        },

        labelBgPadding: [6, 4],

        labelBgBorderRadius: 6,

        style: {
          stroke:
            getRelationColor(
              relation.type,
            ),
          strokeWidth: 1.8,
          strokeDasharray: "7 5",
        },
      }));

  return {
    nodes: positionedNodes,
    edges: [
      ...hierarchyEdges,
      ...relationEdges,
    ],
  };
}

function getDepartmentNodeId(
  departmentId: string,
): string {
  return `department-${departmentId}`;
}

function getRelationLabel(
  type:
    | "SUPPORTS"
    | "COLLABORATES"
    | "AUDITS"
    | "SERVES",
): string {
  const labels = {
    SUPPORTS: "پشتیبانی",
    COLLABORATES: "همکاری",
    AUDITS: "نظارت",
    SERVES: "خدمت‌رسانی",
  };

  return labels[type];
}

function getRelationColor(
  type:
    | "SUPPORTS"
    | "COLLABORATES"
    | "AUDITS"
    | "SERVES",
): string {
  const colors = {
    SUPPORTS: "#2563eb",
    COLLABORATES: "#7c3aed",
    AUDITS: "#dc2626",
    SERVES: "#059669",
  };

  return colors[type];
}