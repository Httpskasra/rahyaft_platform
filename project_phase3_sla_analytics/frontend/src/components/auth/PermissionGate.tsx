"use client";

import React from "react";
import { usePermission } from "@/hooks/usePermission";

interface PermissionGateProps {
  action: string;
  resource: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  action,
  resource,
  children,
  fallback = null,
}: PermissionGateProps) {
  const allowed = usePermission(
    action,
    resource,
  );

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}