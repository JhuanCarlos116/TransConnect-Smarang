"use client";

// Fixed roster rather than free text -- DISHUB asked for a button choice
// (Tim 1..4) instead of typing a team name into every dispatch, for both
// manual dispatch (TaskCreateSection) and dispatching a citizen report
// (CitizenReportSection's ReportCard) so the two stay identical per that
// request. Generic numbered labels, not named/specialized teams -- confirmed
// with the user rather than assumed.
export const ASSIGNEE_OPTIONS = ["Tim 1", "Tim 2", "Tim 3", "Tim 4"] as const;

interface AssigneePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function AssigneePicker({ value, onChange }: AssigneePickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-label-sm text-[12px] font-bold text-on-surface">Ditugaskan ke (opsional)</span>
      <div className="flex flex-wrap gap-1.5">
        {ASSIGNEE_OPTIONS.map((team) => (
          <button
            key={team}
            type="button"
            onClick={() => onChange(value === team ? "" : team)}
            aria-pressed={value === team}
            className={
              value === team
                ? "rounded-full bg-transport-blue px-3 py-1.5 text-[12px] font-bold text-on-primary"
                : "rounded-full border border-border-low px-3 py-1.5 text-[12px] text-on-surface-variant transition-colors hover:border-transport-blue hover:text-transport-blue"
            }
          >
            {team}
          </button>
        ))}
      </div>
    </div>
  );
}
