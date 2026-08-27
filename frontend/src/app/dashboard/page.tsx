"use client";

import { useEffect, useState } from "react";

import { fetchCommunityReports } from "@/lib/fetchCommunityReports";
import type { CommunityReportFeature } from "@/types/communityReport";

export default function DashboardPage() {
  const [reports, setReports] = useState<CommunityReportFeature[] | null>(null);

  useEffect(() => {
    fetchCommunityReports().then((data) => setReports(data.features));
  }, []);

  const verified = reports?.filter((f) => f.properties.verification_status === "verified") ?? [];
  const pending = reports?.filter((f) => f.properties.verification_status !== "verified") ?? [];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
      <a href="/" style={{ fontSize: 13, color: "#1d4ed8", textDecoration: "none" }}>
        ← Kembali ke peta
      </a>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 12, marginBottom: 4 }}>
        Dashboard DISHUB — Laporan Warga
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
        Alur yang didemokan: warga melapor (Community Maps) → verifikasi otomatis oleh YOLOv8 →
        laporan yang lolos tampil di sini untuk ditindaklanjuti DISHUB. Data di bawah adalah{" "}
        <strong>data contoh</strong> — memakai hasil survei tim (yang sudah melalui QA manual) sebagai
        pengganti sementara untuk laporan warga asli dan verifikasi YOLOv8, karena keduanya belum
        tersedia di tahap ini.
      </p>

      {reports === null && <p style={{ fontSize: 13, color: "#6b7280" }}>Memuat...</p>}

      {reports !== null && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <StatCard label="Lolos verifikasi" value={verified.length} color="#3b82f6" />
            <StatCard label="Menunggu verifikasi" value={pending.length} color="#9ca3af" />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "8px 6px" }}>Laporan</th>
                  <th style={{ padding: "8px 6px" }}>Kelurahan</th>
                  <th style={{ padding: "8px 6px" }}>Tanggal</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {verified.map((f) => (
                  <tr key={f.properties.report_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 500 }}>{f.properties.judul}</td>
                    <td style={{ padding: "8px 6px", color: "#6b7280" }}>{f.properties.kelurahan}</td>
                    <td style={{ padding: "8px 6px", color: "#6b7280" }}>
                      {f.properties.tanggal_lapor ?? "-"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#fff",
                          backgroundColor: "#3b82f6",
                        }}
                      >
                        ✓ Lolos Verifikasi
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
    </div>
  );
}
