interface LayerToggleProps {
  label: string;
  visible: boolean;
  onChange: (visible: boolean) => void;
}

export default function LayerToggle({ label, visible, onChange }: LayerToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={visible}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-outline text-transport-blue focus:ring-transport-blue"
      />
      <span className="text-label-md text-on-surface">{label}</span>
    </label>
  );
}
