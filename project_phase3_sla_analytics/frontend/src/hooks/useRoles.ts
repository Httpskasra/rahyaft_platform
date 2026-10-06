"use client";
import { useState, useEffect, useCallback } from "react";
import { rolesApi } from "@/lib/api/roles";

export interface RolePermission {
  id: string;
  permissionId: string;
  scope: string;
  relationType: string | null;
  constraints: unknown;
  permission: { id: string; action: string; resource: string };
}

export interface Role {
  id: string;
  name: string;
  permissions: RolePermission[];
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await rolesApi.findAll();
      setRoles(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "خطا در دریافت نقش‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = async (name: string): Promise<Role> => {
    const { data } = await rolesApi.create({ name });
    // Ensure permissions array always exists (backend may omit it on create)
    const safe: Role = { ...data, permissions: data.permissions ?? [] };
    setRoles((prev) => [safe, ...prev]);
    return safe;
  };

  const renameRole = async (roleId: string, name: string): Promise<void> => {
    await rolesApi.rename(roleId, { name });
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, name } : r))
    );
  };

  const deleteRole = async (roleId: string): Promise<void> => {
    await rolesApi.remove(roleId);
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
  };

  const addPermission = async (
    roleId: string,
    payload: {
      action: string;
      resource: string;
      scope: string;
      relationType?: string;
    }
  ) => {
    const { data } = await rolesApi.addPermission(roleId, payload);
    await fetchRoles();
    return data;
  };

  const savePermissions = async (
    roleId: string,
    tasks: Array<{ action: string; resource: string; scope: string }>
  ): Promise<void> => {
    await Promise.all(
      tasks.map((t) =>
        rolesApi.addPermission(roleId, {
          action: t.action,
          resource: t.resource,
          scope: t.scope,
        })
      )
    );
    await fetchRoles();
  };

  return {
    roles,
    loading,
    error,
    refetch: fetchRoles,
    createRole,
    renameRole,
    deleteRole,
    addPermission,
    savePermissions,
  };
}
