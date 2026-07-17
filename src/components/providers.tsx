"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
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
    if (!standalone || !("orientation" in screen)) return;
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (value: "portrait-primary") => Promise<void>;
    };
    const lockPortrait = () => {
      if (document.visibilityState === "visible") {
        void orientation.lock?.("portrait-primary").catch(() => undefined);
      }
    };
    lockPortrait();
    document.addEventListener("visibilitychange", lockPortrait);
    window.addEventListener("pageshow", lockPortrait);
    return () => {
      document.removeEventListener("visibilitychange", lockPortrait);
      window.removeEventListener("pageshow", lockPortrait);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
