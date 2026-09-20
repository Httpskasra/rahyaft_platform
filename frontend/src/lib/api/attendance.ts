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
  departmentId: string | null;
  departmentName: string | null;
  date: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalEvents: number;
  workedMinutes: number;
  lateArrival: boolean;
  earlyDeparture: boolean;
  incomplete: boolean;
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
  departmentId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface AttendanceReport {
  generatedAt: string;
  assumptions: {
    lateAfter: string;
    earlyBefore: string;
    workedTimeDefinition: string;
  };
  overview: {
    attendanceDays: number;
    uniqueUsers: number;
    totalHours: number;
    averageHoursPerAttendanceDay: number;
    lateCount: number;
    earlyDepartureCount: number;
    incompleteCount: number;
  };
  departments: { id: string; name: string }[];
  dailyTrend: {
    date: string;
    presentUsers: number;
    totalHours: number;
    averageHours: number;
    lateCount: number;
    incompleteCount: number;
  }[];
  departmentStats: {
    departmentId: string | null;
    departmentName: string;
    uniqueUsers: number;
    attendanceDays: number;
    totalHours: number;
    averageHoursPerDay: number;
    lateCount: number;
    earlyDepartureCount: number;
    incompleteCount: number;
  }[];
  userStats: {
    userId: string;
    userName: string;
    departmentName: string;
    days: number;
    totalHours: number;
    averageHoursPerDay: number;
    late: number;
    early: number;
    incomplete: number;
  }[];
  records: AttendanceDailySummary[];
}

export const attendanceApi = {
  import: (file: File): Promise<{ data: AttendanceImportResult }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/attendance/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  findAll: (query?: AttendanceQuery): Promise<{ data: AttendanceRecord[] }> =>
    apiClient.get("/attendance", { params: query }),

  getDailySummary: (
    query?: AttendanceQuery
  ): Promise<{ data: AttendanceDailySummary[] }> =>
    apiClient.get("/attendance/daily-summary", { params: query }),

  getReport: (query?: AttendanceQuery): Promise<{ data: AttendanceReport }> =>
    apiClient.get("/attendance/report", { params: query }),
};
