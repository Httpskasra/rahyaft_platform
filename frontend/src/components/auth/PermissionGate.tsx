"use client";
import { useAuth } from "@/context/AuthContext";

interface Props {
  action: string;
  resource: string;
  fallback?: React.ReactNode;   // what to show if no permission (default: null)
  children: React.ReactNode;
}

/**
 * Usage:
 *   <PermissionGate action="create" resource="roles">
 *     <Button>افزودن نقش</Button>
 *   </PermissionGate>
 *
 *   <PermissionGate action="delete" resource="users" fallback={<span>دسترسی ندارید</span>}>
 *     <DeleteButton />
 *   </PermissionGate>
 */
export function PermissionGate({ action, resource, fallback = null, children }: Props) {
  const { hasPermission, loading } = useAuth();
  if (loading) return null;
  if (!hasPermission(action, resource)) return <>{fallback}</>;
  return <>{children}</>;
}