/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  departmentsApi,
  OrganizationChartResponse,
} from "@/lib/api/departments";

export function useOrganizationChart() {
  const [data, setData] = useState<OrganizationChartResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await departmentsApi.getOrganizationChart();

      setData(response.data);
    } catch (error: any) {
      setError(error?.response?.data?.message ?? "خطا در دریافت چارت سازمانی");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  return {
    data,
    loading,
    error,
    refetch: fetchChart,
  };
}
