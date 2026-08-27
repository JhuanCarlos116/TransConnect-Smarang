"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, MAPID_API_KEY, mapStyleUrl } from "@/lib/maplibre";
import HalteLayer from "@/components/map/HalteLayer";
import CommunityMapsLayer from "@/components/map/CommunityMapsLayer";
import ConditionLegend from "@/components/map/ConditionLegend";
import LayerPanel from "@/components/map/LayerPanel";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [halteVisible, setHalteVisible] = useState(true);
  const [communityVisible, setCommunityVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !MAPID_API_KEY) return;

    // Bundlers (both Turbopack and Webpack) mis-resolve maplibre-gl's
    // internal `import.meta.url`-based worker lookup in this Next.js setup,
    // leaking the local disk path instead of a servable URL. Point it at the
    // worker file copied into public/ instead. See MapView.tsx history.
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl(),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    instance.addControl(new maplibregl.NavigationControl(), "top-left");
    instance.on("load", () => setMap(instance));

    return () => {
      instance.remove();
      setMap(null);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {map && (
        <>
          <HalteLayer map={map} visible={halteVisible} />
          <CommunityMapsLayer map={map} visible={communityVisible} />
          <ConditionLegend />
          <LayerPanel
            halteVisible={halteVisible}
            onHalteChange={setHalteVisible}
            communityVisible={communityVisible}
            onCommunityChange={setCommunityVisible}
          />
          <a
            href="/dashboard"
            style={{
              position: "absolute",
              top: 100,
              left: 12,
              zIndex: 1,
              background: "#fff",
              borderRadius: 8,
              padding: "8px 14px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
              color: "#1d4ed8",
              textDecoration: "none",
            }}
          >
            Dashboard DISHUB →
          </a>
        </>
      )}
      {!MAPID_API_KEY && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 2,
            background: "#fef2f2",
            color: "#991b1b",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          NEXT_PUBLIC_MAPID_API_KEY belum diisi di frontend/.env.local
        </div>
      )}
    </div>
  );
}
