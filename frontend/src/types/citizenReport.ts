export interface CitizenReport {
  report_id: string;
  halte_id: string;
  reporter_name: string;
  lat: number;
  lon: number;
  description: string;
  photo_url: string | null;
  video_url: string | null;
  status: string;
  created_at: string;
}

export interface CitizenReportCreateInput {
  lat: number;
  lon: number;
  halteId: string;
  reporterName: string;
  description: string;
  photo?: File;
  video?: File;
}
