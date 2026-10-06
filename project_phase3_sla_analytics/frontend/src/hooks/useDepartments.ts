"use client";
import { useState, useEffect, useCallback } from "react";
import { departmentsApi, DepartmentRelationType } from "@/lib/api/departments";

export interface DepartmentChild {
  id: string;
  name: string;
}

export interface DepartmentRelation {
  id: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  type: DepartmentRelationType;
  toDepartment: { id: string; name: string };
}

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  children: DepartmentChild[];
  outgoingRelations: DepartmentRelation[];
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await departmentsApi.findAll();
      setDepartments(data);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? "خطا در دریافت دپارتمان‌ها"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const createDepartment = async (body: {
    name: string;
    parentId?: string;
  }): Promise<Department> => {
    const { data } = await departmentsApi.create(body);
    const safe: Department = {
      ...data,
      children: data.children ?? [],
      outgoingRelations: data.outgoingRelations ?? [],
    };
    setDepartments((prev) => [...prev, safe]);
    return safe;
  };

  const updateDepartment = async (
    id: string,
    body: { name?: string; parentId?: string }
  ): Promise<void> => {
    const { data } = await departmentsApi.update(id, body);
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, name: data.name ?? d.name, parentId: data.parentId ?? d.parentId }
          : d
      )
    );
  };

  const deleteDepartment = async (id: string): Promise<void> => {
    await departmentsApi.remove(id);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  const addRelation = async (body: {
    fromDepartmentId: string;
    toDepartmentId: string;
    type: DepartmentRelationType;
  }): Promise<void> => {
    await departmentsApi.createRelation(body);
    await fetchDepartments();
  };

  const removeRelation = async (relationId: string): Promise<void> => {
    await departmentsApi.removeRelation(relationId);
    setDepartments((prev) =>
      prev.map((d) => ({
        ...d,
        outgoingRelations: d.outgoingRelations.filter(
          (r) => r.id !== relationId
        ),
      }))
    );
  };

  return {
    departments,
    loading,
    error,
    refetch: fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    addRelation,
    removeRelation,
  };
}
