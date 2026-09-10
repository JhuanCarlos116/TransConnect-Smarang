"use client";

import { useEffect, useState } from "react";

import { deleteTask, fetchTasks, updateTaskStatus } from "@/lib/fetchTasks";
import { conditionColor } from "@/lib/conditionScore";
import TaskDetailModal from "@/components/dashboard/TaskDetailModal";
import type { Task, TaskStatus } from "@/types/task";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "belum_dikerjakan", label: "Belum Dikerjakan" },
  { status: "proses", label: "Sedang Dikerjakan" },
  { status: "selesai", label: "Selesai" },
];

// Cards move one column at a time via buttons rather than drag-and-drop --
// simpler, and works the same on touch as on desktop.
const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  belum_dikerjakan: "proses",
  proses: "selesai",
  selesai: null,
};
const PREV_STATUS: Record<TaskStatus, TaskStatus | null> = {
  belum_dikerjakan: null,
  proses: "belum_dikerjakan",
  selesai: "proses",
};

interface TaskCardProps {
  task: Task;
  onMove: (taskId: string, status: TaskStatus) => void;
  onOpenDetail: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

// Detail (technician report + photo, admin approval) only makes sense once
// work has actually started -- nothing to report on a task still in
// "belum_dikerjakan".
function TaskCard({ task, onMove, onOpenDetail, onDelete }: TaskCardProps) {
  const next = NEXT_STATUS[task.status];
  const prev = PREV_STATUS[task.status];
  const canOpenDetail = task.status === "proses" || task.status === "selesai";

  function handleDelete() {
    if (window.confirm(`Hapus tugas "${task.nama_halte}" ini? Tindakan ini tidak bisa dibatalkan.`)) {
      onDelete(task.task_id);
    }
  }

  return (
    <div
      onClick={canOpenDetail ? () => onOpenDetail(task) : undefined}
      className={`rounded-lg border border-border-low bg-surface p-3 shadow-sm ${canOpenDetail ? "cursor-pointer transition-colors hover:border-transport-blue" : ""}`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: conditionColor(task.condition_label) }}
        />
        <span className="font-label-md text-label-md font-bold text-on-surface">{task.nama_halte}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {task.citizen_report_id && (
            <span className="material-symbols-outlined text-[16px] text-transport-blue" title="Dari laporan warga">
              campaign
            </span>
          )}
          {task.technician_photo_url && (
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant" title="Ada laporan petugas">
              photo_camera
            </span>
          )}
        </div>
      </div>
      <div className="mb-2 text-label-sm text-on-surface-variant">{task.kelurahan}</div>
      <p className="mb-2 text-body-md text-[13px] leading-relaxed text-on-surface">{task.description}</p>
      {task.assigned_to && (
        <div className="mb-2 flex items-center gap-1 text-label-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">person</span>
          {task.assigned_to}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-border-low pt-2">
        <span className="text-[11px] text-on-surface-variant">
          {new Date(task.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
        </span>
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          {prev && (
            <button
              onClick={() => onMove(task.task_id, prev)}
              className="rounded-md border border-border-low px-2 py-1 text-[11px] text-on-surface-variant transition-colors hover:border-transport-blue hover:text-transport-blue"
            >
              &larr; Kembalikan
            </button>
          )}
          {next && (
            <button
              onClick={() => onMove(task.task_id, next)}
              className="rounded-md bg-transport-blue px-2 py-1 text-[11px] font-bold text-on-primary transition-colors hover:bg-primary"
            >
              {task.status === "belum_dikerjakan" ? "Mulai →" : "Selesai →"}
            </button>
          )}
          {task.status === "selesai" && (
            <button
              onClick={handleDelete}
              aria-label="Hapus tugas"
              title="Hapus tugas"
              className="rounded-md border border-alert-red px-2 py-1 text-[11px] text-alert-red transition-colors hover:bg-alert-red hover:text-on-error"
            >
              <span className="material-symbols-outlined text-[14px] leading-none align-middle">delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Policy & Task Dispatcher Dashboard (PRD roadmap item). Tasks are created
 * from HalteDetailModal (linked to a specific surveyed halte) -- this page
 * only lists and moves them between the three statuses.
 */
export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks()
      .then((data) => {
        setTasks(data);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Gagal memuat tugas.");
        setStatus("error");
      });
  }, []);

  async function handleMove(taskId: string, newStatus: TaskStatus) {
    const previous = tasks;
    setTasks((cur) => cur.map((t) => (t.task_id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      setTasks(previous); // revert the optimistic move
      setError(err instanceof Error ? err.message : "Gagal memperbarui status tugas.");
    }
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((cur) => cur.map((t) => (t.task_id === updated.task_id ? updated : t)));
    setDetailTask(updated);
  }

  async function handleDelete(taskId: string) {
    const previous = tasks;
    setTasks((cur) => cur.filter((t) => t.task_id !== taskId));
    try {
      await deleteTask(taskId);
    } catch (err) {
      setTasks(previous); // revert -- the delete didn't actually happen
      setError(err instanceof Error ? err.message : "Gagal menghapus tugas.");
    }
  }

  if (status === "loading") {
    return <div className="p-margin-page text-body-md text-on-surface-variant">Memuat tugas...</div>;
  }

  if (status === "error" && tasks.length === 0) {
    return (
      <div className="m-margin-page rounded-lg bg-error-container p-4 text-body-md text-on-error-container">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {error && (
        <div className="mx-margin-page mt-margin-page rounded-lg bg-error-container p-3 text-label-sm text-on-error-container">
          {error}
        </div>
      )}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-margin-page md:grid-cols-3 md:overflow-hidden">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="flex flex-col overflow-hidden rounded-lg bg-surface-container-low">
              <div className="flex items-center justify-between border-b border-border-low p-3">
                <h3 className="font-label-md text-label-md font-bold text-on-surface">{col.label}</h3>
                <span className="rounded-full bg-surface px-2 py-0.5 text-label-sm font-bold text-on-surface-variant">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                {colTasks.length === 0 && (
                  <p className="mt-2 text-center text-label-sm text-on-surface-variant">Tidak ada tugas.</p>
                )}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.task_id}
                    task={task}
                    onMove={handleMove}
                    onOpenDetail={setDetailTask}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} onUpdated={handleTaskUpdated} />
    </div>
  );
}
