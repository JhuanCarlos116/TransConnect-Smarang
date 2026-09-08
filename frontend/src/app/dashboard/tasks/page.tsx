import AppHeader from "@/components/ui/AppHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import TaskBoard from "@/components/dashboard/TaskBoard";

export default function TasksPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden font-sans">
      <AppHeader />

      <div className="relative flex flex-1 overflow-hidden">
        <nav className="z-40 hidden h-full w-panel-width shrink-0 flex-col overflow-y-auto scrollbar-hide border-r border-border-low bg-surface md:flex">
          <DashboardNav />
        </nav>

        <main className="relative flex-1 overflow-hidden bg-surface-subtle">
          <TaskBoard />
        </main>
      </div>
    </div>
  );
}
