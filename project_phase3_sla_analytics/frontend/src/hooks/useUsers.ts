"use client";
import { useState, useEffect, useCallback } from "react";
import { usersApi } from "@/lib/api/users";

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  departmentId: string;
  department?: { name: string };
  roles: Array<{ role: { id: string; name: string } }>;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.findAll();
      setUsers(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "خطا در دریافت کاربران");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createUser = async (body: { name: string; phoneNumber: string; departmentId: string; managerId?: string }) => {
    const { data } = await usersApi.create(body);
    setUsers((prev) => [data, ...prev]);
    return data;
  };

  const removeUser = async (id: string) => {
    await usersApi.remove(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return { users, loading, error, refetch: fetch, createUser, removeUser };
}