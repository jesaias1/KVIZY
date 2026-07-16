import Image from "next/image";
import { APP_CONFIG } from "@/lib/config";

export function LoadingScreen({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      className={`brand-loading-screen ${overlay ? "brand-loading-overlay" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="KVIZY indlæses"
    >
      <div className="brand-loading-glow" aria-hidden="true" />
      <Image
        src="/brand/kvizy-mark.png"
        alt=""
        width={220}
        height={220}
        className="brand-loading-mark"
        priority
      />
      <strong>{APP_CONFIG.name}</strong>
      <span>{APP_CONFIG.tagline}</span>
      <div className="brand-loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <span className="sr-only">Spillet gøres klar</span>
    </div>
  );
}
