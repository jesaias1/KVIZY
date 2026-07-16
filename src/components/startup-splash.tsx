"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";

export function StartupSplash() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "hidden">(
    "visible",
  );

  useEffect(() => {
    const leave = window.setTimeout(() => setPhase("leaving"), 220);
    const hide = window.setTimeout(() => setPhase("hidden"), 650);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(hide);
    };
  }, []);

  if (phase === "hidden") return null;
  return (
    <div
      className={`startup-splash ${phase === "leaving" ? "is-leaving" : ""}`}
    >
      <LoadingScreen overlay />
    </div>
  );
}
