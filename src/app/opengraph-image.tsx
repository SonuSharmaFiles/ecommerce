import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/constants";

export const runtime = "edge";
export const alt = APP_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          fontFamily: "system-ui",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 60, background: "#0f172a", borderRadius: 12 }} />
          <div style={{ fontSize: 80, fontWeight: 800, color: "#0f172a" }}>{APP_NAME}</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: "#475569" }}>
          Premium products, fast worldwide delivery
        </div>
      </div>
    ),
    size
  );
}
