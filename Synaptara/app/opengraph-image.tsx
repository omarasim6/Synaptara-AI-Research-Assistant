import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Synaptara — Your AI Research Assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#EDEADE",
          position: "relative",
        }}
      >
        {/* Subtle background accent circles echoing the logo motif */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -140,
            width: 420,
            height: 420,
            borderRadius: "50%",
            border: "28px solid #1a3a35",
            opacity: 0.08,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -160,
            width: 460,
            height: 460,
            borderRadius: "50%",
            border: "28px solid #1a3a35",
            opacity: 0.08,
            display: "flex",
          }}
        />

        {/* Logo mark: two interlocking arcs around a cream dot, matching /public/logo.png */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 36 }}>
          <svg width="92" height="92" viewBox="0 0 92 92" fill="none">
            <path
              d="M66 12c-11 0-20 9-20 20s9 20 20 20"
              stroke="#1a3a35"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M26 80c11 0 20-9 20-20S37 40 26 40"
              stroke="#1a3a35"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="46" cy="46" r="15" fill="#EDEADE" />
            <circle cx="46" cy="46" r="8" fill="#1a3a35" />
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 600,
            color: "#1a3a35",
            letterSpacing: "-0.02em",
          }}
        >
          Synaptara
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 30,
            color: "#4a7c6f",
            textAlign: "center",
            maxWidth: 860,
          }}
        >
          Your AI Research Assistant
        </div>
      </div>
    ),
    { ...size }
  );
}
