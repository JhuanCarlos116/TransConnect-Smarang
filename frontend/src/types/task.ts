import type { ConditionLabel } from "@/types/halte";

export type TaskStatus = "belum_dikerjakan" | "proses" | "selesai";

export interface Task {
  task_id: string;
  halte_id: string;
  citizen_report_id: string | null;
  nama_halte: string;
  kelurahan: string;
  condition_label: ConditionLabel;
  description: string;
  assigned_to: string | null;
  status: TaskStatus;
  technician_report: string | null;
  technician_photo_url: string | null;
  approved_for_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateInput {
  halte_id: string;
  description: string;
  assigned_to?: string;
  citizen_report_id?: string;
}

export interface ApprovedRepairPhoto {
  technician_report: string;
  technician_photo_url: string;
  updated_at: string;
}
