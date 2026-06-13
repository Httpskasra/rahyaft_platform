export class AttendanceImportResultDto {
  totalRowsProcessed: number;
  matchedUsers: number;
  unmatchedEmployeeCodes: string[];
  recordsCreated: number;
  recordsSkippedExisting: number;
  invalidTimeEntries: number;
}
