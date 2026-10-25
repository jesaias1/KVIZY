"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { t } from "@/lib/i18n";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = "hidden" | "prompt" | "ios";

/** Knap på forsiden, der lægger KVIZY på telefonens hjemmeskærm. Kun på telefoner. */
export function InstallButton() {
  const [state, setState] = useState<InstallState>("hidden");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const phone =
      window.matchMedia("(pointer: coarse)").matches &&
      Math.min(window.innerWidth, window.innerHeight) < 820;
    if (standalone || !phone) return;
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Timeren holder opdateringen ude af effektens synkrone del.
    const timer = window.setTimeout(() => {
      if (ios) setState("ios");
    }, 0);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setState("prompt");
    };
    const onInstalled = () => setState("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (state === "hidden") return null;

  if (state === "prompt")
    return (
      <button
        type="button"
        className="install-pill"
        onClick={async () => {
          if (!promptEvent) return;
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice.outcome === "accepted") setState("hidden");
        }}
      >
        <Download aria-hidden="true" />
        {t("Gem KVIZY som app på din telefon")}
      </button>
    );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" className="install-pill">
          <Download aria-hidden="true" />
          {t("Gem KVIZY som app på din telefon")}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>{t("Læg KVIZY på hjemmeskærmen")}</SheetTitle>
        </SheetHeader>
        <ol className="install-steps">
          <li>
            <Share aria-hidden="true" />
            <span>{t("Tryk på Del-knappen i Safari")}</span>
          </li>
          <li>
            <SquarePlus aria-hidden="true" />
            <span>{t("Vælg “Føj til hjemmeskærm”")}</span>
          </li>
          <li>
            <Download aria-hidden="true" />
            <span>{t("Tryk “Tilføj” – så åbner KVIZY som en rigtig app")}</span>
          </li>
        </ol>
      </SheetContent>
    </Sheet>
  );
}
