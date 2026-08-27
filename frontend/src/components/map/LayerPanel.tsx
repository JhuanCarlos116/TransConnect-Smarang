import LayerToggle from "@/components/map/LayerToggle";

interface LayerPanelProps {
  halteVisible: boolean;
  onHalteChange: (visible: boolean) => void;
  communityVisible: boolean;
  onCommunityChange: (visible: boolean) => void;
}

export default function LayerPanel({
  halteVisible,
  onHalteChange,
  communityVisible,
  onCommunityChange,
}: LayerPanelProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1,
        background: "#fff",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <LayerToggle label="Titik Survei Halte" visible={halteVisible} onChange={onHalteChange} />
      <LayerToggle
        label="Laporan Warga (contoh)"
        visible={communityVisible}
        onChange={onCommunityChange}
      />
    </div>
  );
}
