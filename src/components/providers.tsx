"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangProvider, useLang } from "@/components/lang-provider";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <ProvidersInner>{children}</ProvidersInner>
    </LangProvider>
  );
}

function ProvidersInner({ children }: { children: React.ReactNode }) {
  // Læser sproget, så vagten tegnes igen ved sprogskift.
  useLang();
  const [showPortraitGuard, setShowPortraitGuard] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    const useNewVersion = () => {
      // En førstegangsinstallation overtager siden via clients.claim(). Det er
      // ikke en opdatering og må derfor ikke ligne en ekstra genindlæsning.
      if (!hadControllerAtStartup) return;
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
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      Boolean(standaloneNavigator.standalone);
    const landscapePhoneQuery = window.matchMedia(
      "(orientation: landscape) and (max-height: 600px) and (pointer: coarse)",
    );
    const orientation = (screen.orientation ?? undefined) as
      | (ScreenOrientation & {
          lock?: (value: "portrait") => Promise<void>;
        })
      | undefined;
    const lockPortrait = () => {
      if (installed && document.visibilityState === "visible") {
        void orientation?.lock?.("portrait").catch(() => undefined);
      }
    };
    const enforcePortrait = () => {
      const blocked = landscapePhoneQuery.matches;
      setShowPortraitGuard(blocked);
      document.documentElement.toggleAttribute("data-phone-landscape", blocked);
      lockPortrait();
    };
    enforcePortrait();
    document.addEventListener("visibilitychange", lockPortrait);
    window.addEventListener("pageshow", enforcePortrait);
    window.addEventListener("resize", enforcePortrait);
    window.addEventListener("orientationchange", enforcePortrait);
    window.addEventListener("pointerdown", lockPortrait, { passive: true });
    landscapePhoneQuery.addEventListener("change", enforcePortrait);
    orientation?.addEventListener("change", enforcePortrait);
    return () => {
      document.documentElement.removeAttribute("data-phone-landscape");
      document.removeEventListener("visibilitychange", lockPortrait);
      window.removeEventListener("pageshow", enforcePortrait);
      window.removeEventListener("resize", enforcePortrait);
      window.removeEventListener("orientationchange", enforcePortrait);
      window.removeEventListener("pointerdown", lockPortrait);
      landscapePhoneQuery.removeEventListener("change", enforcePortrait);
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
              <b>{t("KVIZY spilles stående")}</b>
              <p>{t("Drej telefonen tilbage til stående visning.")}</p>
            </div>
          </div>
        )}
      </TooltipProvider>
    </ThemeProvider>
  );
}
