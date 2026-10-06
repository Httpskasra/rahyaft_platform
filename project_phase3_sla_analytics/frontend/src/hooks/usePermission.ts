"use client";
import { useAuth } from "@/context/AuthContext";
import { useMemo } from "react";
/**
 * Usage:
 *   const canDelete = usePermission("delete", "users");
 *   const canReadRoles = usePermission("read", "roles");
 */
export function usePermission(action: string, resource: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(action, resource);
}



export function useHasPermission(action: string, resource: string, scope?: string) {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return false;
    return user.roles.some((r) =>
      r.permissions.some(
        (p) =>
          p.action === action &&
          p.resource === resource &&
          (scope ? p.scope === scope : true)
      )
    );
  }, [user, action, resource, scope]);
}

// تشخیص اینکه کاربر «تکنسین»‌مانند است: یعنی دسترسی repairs.read با scope SELF دارد
// و دسترسی assign (که مخصوص اپراتور/مسئول است) را ندارد.
export function useIsTechnician() {
  const isSelfScopedReader = useHasPermission("read", "repairs", "SELF");
  const canAssign = useHasPermission("assign", "repairs");
  return isSelfScopedReader && !canAssign;
}

export function useCanAssignRepairs() {
  return useHasPermission("assign", "repairs");
}