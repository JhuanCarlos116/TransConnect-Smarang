export interface CitizenReport {
  report_id: string;
  halte_id: string;
  reporter_name: string;
  lat: number;
  lon: number;
  description: string;
  photo_url: string | null;
  // The detector's own render of photo_url with its boxes drawn on it --
  // what "Laporan Warga" shows DISHUB. Null when the photo produced no
  // detection (or the render failed); photo_url is always the fallback.
  photo_annotated_url: string | null;
  video_url: string | null;
  status: string;
  created_at: string;
  // Detector output for photo_url and which halte_survey facility variables
  // it filled in -- see backend/app/services/photo_detection.py. None/empty
  // when no photo was attached or the detector found nothing new.
  ai_detections: Record<string, unknown> | null;
  ai_analyzed_at: string | null;
  halte_updated: Record<string, string>;
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
