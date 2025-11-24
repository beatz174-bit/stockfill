export type ImportExportType = 'import' | 'export';

export interface ImportExportLogSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface ImportExportLog {
  id: string;
  type: ImportExportType;
  timestamp: number;
  selectedTypes: string[];
  summary: ImportExportLogSummary;
  details: string[];
  fileNames?: string[];
}
