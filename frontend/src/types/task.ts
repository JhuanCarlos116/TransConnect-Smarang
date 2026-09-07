import type { ConditionLabel } from "@/types/halte";

export type TaskStatus = "belum_dikerjakan" | "proses" | "selesai";

export interface Task {
  task_id: string;
  halte_id: string;
  nama_halte: string;
  kelurahan: string;
  condition_label: ConditionLabel;
  description: string;
  assigned_to: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateInput {
  halte_id: string;
  description: string;
  assigned_to?: string;
}
