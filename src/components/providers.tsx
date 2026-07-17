"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [showPortraitGuard, setShowPortraitGuard] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reloading = false;
    const useNewVersion = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", useNewVersion);
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => undefined);
    return () =>
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        useNewVersion,
      );
  }, []);

  useEffect(() => {
    const standaloneNavigator = navigator as Navigator & {
      standalone?: boolean;
    };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(standaloneNavigator.standalone);
    if (!standalone) return;
    const landscapeQuery = window.matchMedia("(orientation: landscape)");
    const orientation = (screen.orientation ?? undefined) as
      | (ScreenOrientation & {
          lock?: (value: "portrait") => Promise<void>;
        })
      | undefined;
    const lockPortrait = () => {
      if (document.visibilityState === "visible") {
        void orientation?.lock?.("portrait").catch(() => undefined);
      }
    };
    const enforcePortrait = () => {
      setShowPortraitGuard(landscapeQuery.matches);
      lockPortrait();
    };
    enforcePortrait();
    document.addEventListener("visibilitychange", lockPortrait);
    window.addEventListener("pageshow", enforcePortrait);
    window.addEventListener("pointerdown", lockPortrait, { passive: true });
    landscapeQuery.addEventListener("change", enforcePortrait);
    orientation?.addEventListener("change", enforcePortrait);
    return () => {
      document.removeEventListener("visibilitychange", lockPortrait);
      window.removeEventListener("pageshow", enforcePortrait);
      window.removeEventListener("pointerdown", lockPortrait);
      landscapeQuery.removeEventListener("change", enforcePortrait);
      orientation?.removeEventListener("change", enforcePortrait);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        {children}
        {showPortraitGuard && (
          <div className="portrait-guard" role="status" aria-live="polite">
            <div>
              <span aria-hidden="true">📱</span>
              <b>KVIZY spilles stående</b>
              <p>Drej telefonen tilbage til stående visning.</p>
            </div>
          </div>
        )}
      </TooltipProvider>
    </ThemeProvider>
  );
}
