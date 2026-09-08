export interface CitizenReport {
  report_id: string;
  lat: number;
  lon: number;
  description: string;
  photo_url: string | null;
  status: string;
  created_at: string;
}

export interface CitizenReportCreateInput {
  lat: number;
  lon: number;
  description: string;
  photo?: File;
}
