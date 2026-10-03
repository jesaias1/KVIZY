import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "KVIZY – dansk quiz til venner, fest og pubquiz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(
    join(process.cwd(), "public/brand/kvizy-wordmark.png"),
  );
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 90px",
        background:
          "radial-gradient(circle at 85% 20%, #5a2a12 0%, #1a0f0b 45%, #0b0707 100%)",
        color: "#f7efe6",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={520} alt="" />
      <div
        style={{
          display: "flex",
          marginTop: 40,
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1.05,
        }}
      >
        Quiz-aftenen starter her.
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 24,
          fontSize: 34,
          color: "#c9b8a8",
        }}
      >
        Dansk quiz til venner, fest og pubquiz · Gratis, uden login
      </div>
    </div>,
    size,
  );
}
