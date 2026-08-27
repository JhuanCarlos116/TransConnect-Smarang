interface LayerToggleProps {
  label: string;
  visible: boolean;
  onChange: (visible: boolean) => void;
}

export default function LayerToggle({ label, visible, onChange }: LayerToggleProps) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <input type="checkbox" checked={visible} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
