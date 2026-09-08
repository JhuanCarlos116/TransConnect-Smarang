import type { ApprovedRepairPhoto, Task, TaskCreateInput, TaskStatus } from "@/types/task";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Policy & Task Dispatcher Dashboard -- see backend/app/routers/task.py. Like
 * chat/route, there is no static-file fallback: tasks are live, mutable
 * records in Postgres, not something precomputable into a static file.
 */
function requireApiBase(): string {
  if (!API_BASE_URL) {
    throw new Error(
      "Fitur tugas perbaikan butuh backend lokal aktif. Set NEXT_PUBLIC_API_BASE_URL di frontend/.env.local, lalu jalankan `uvicorn app.main:app` di backend.",
    );
  }
  return API_BASE_URL;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Backend merespons status ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${requireApiBase()}/api/v1/tasks`);
  return parseOrThrow<Task[]>(res);
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const res = await fetch(`${requireApiBase()}/api/v1/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<Task>(res);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const res = await fetch(`${requireApiBase()}/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseOrThrow<Task>(res);
}

export async function submitTechnicianReport(taskId: string, report: string, photo?: File): Promise<Task> {
  const formData = new FormData();
  formData.append("report", report);
  if (photo) formData.append("photo", photo);

  const res = await fetch(`${requireApiBase()}/api/v1/tasks/${taskId}/report`, {
    method: "PATCH",
    body: formData,
  });
  return parseOrThrow<Task>(res);
}

export async function approveTechnicianPhoto(taskId: string): Promise<Task> {
  const res = await fetch(`${requireApiBase()}/api/v1/tasks/${taskId}/approve`, { method: "PATCH" });
  return parseOrThrow<Task>(res);
}

export async function fetchApprovedRepairPhotos(halteId: string): Promise<ApprovedRepairPhoto[]> {
  const res = await fetch(`${requireApiBase()}/api/v1/halte/${halteId}/repair-photos`);
  return parseOrThrow<ApprovedRepairPhoto[]>(res);
}
