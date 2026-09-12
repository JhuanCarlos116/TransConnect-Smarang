import type { ConditionLabel, FacilityVariable } from "@/types/halte";

export type TaskStatus = "belum_dikerjakan" | "proses" | "selesai";

// Only "ada"/"tidak" -- a technician reports what they observed directly,
// there's no "-" (unknown) case for a facility they're actively filing a
// report about.
export type TaskFacilityState = "ada" | "tidak";

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
  // Every repair photo on the task, in submission order; technician_photo_url
  // is the first entry. Render this list rather than the single URL -- tasks
  // reported before multi-photo uploads existed come back as a one-entry list.
  technician_photo_urls: string[];
  technician_video_url: string | null;
  approved_for_public: boolean;
  // An explicit "no" from DISHUB on the repair photo, as opposed to "not
  // reviewed yet" -- both look like approved_for_public: false otherwise.
  technician_photo_rejected: boolean;
  facility_updates: Partial<Record<FacilityVariable, TaskFacilityState>> | null;
  facility_updates_approved: boolean;
  // Same idea for the facility batch: reviewed and turned down, versus still
  // waiting for a decision.
  facility_updates_rejected: boolean;
  // Whether an approved batch can still be undone (see revertFacilityUpdate)
  // -- false once reverted, or if nothing has been approved yet.
  facility_updates_revertible: boolean;
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
  // All of the task's approved repair photos, in submission order;
  // technician_photo_url is the first one. The public strip shows every entry.
  technician_photo_urls: string[];
  updated_at: string;
}
