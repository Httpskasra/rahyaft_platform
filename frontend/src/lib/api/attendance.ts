import { apiClient } from "./client";

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkTime: string;
  source: string;
  createdAt: string;
}

export interface AttendanceDailySummary {
  userId: string;
  userName: string | null;
  date: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalEvents: number;
}

export interface AttendanceImportResult {
  totalRowsProcessed: number;
  matchedUsers: number;
  unmatchedEmployeeCodes: string[];
  recordsCreated: number;
  recordsSkippedExisting: number;
  invalidTimeEntries: number;
}

export interface AttendanceQuery {
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export const attendanceApi = {
  import: (file: File): Promise<{ data: AttendanceImportResult }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/attendance/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  findAll: (
    query?: AttendanceQuery
  ): Promise<{ data: AttendanceRecord[] }> =>
    apiClient.get("/attendance", { params: query }),

  getDailySummary: (
    query?: AttendanceQuery
  ): Promise<{ data: AttendanceDailySummary[] }> =>
    apiClient.get("/attendance/daily-summary", { params: query }),
};