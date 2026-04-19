"use client";
import { useAuth } from "@/context/AuthContext";

/**
 * Usage:
 *   const canDelete = usePermission("delete", "users");
 *   const canReadRoles = usePermission("read", "roles");
 */
export function usePermission(action: string, resource: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(action, resource);
}