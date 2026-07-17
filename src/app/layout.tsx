import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { StartupSplash } from "@/components/startup-splash";
import { APP_CONFIG } from "@/lib/config";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.kvizy.dk"),
  title: `${APP_CONFIG.name} – ${APP_CONFIG.tagline}`,
  description: `${APP_CONFIG.tagline}. Det danske quizspil til venner, familie og fest.`,
  applicationName: APP_CONFIG.name,
  alternates: { canonical: "/" },
  keywords: [
    "dansk quiz",
    "quizspil",
    "paratviden",
    "festspil",
    "familiequiz",
    "pubquiz",
  ],
  openGraph: {
    type: "website",
    locale: "da_DK",
    url: "/",
    siteName: APP_CONFIG.name,
    title: `${APP_CONFIG.name} – ${APP_CONFIG.tagline}`,
    description: "Dansk multiplayer quiz på én skærm.",
    images: [
      {
        url: "/brand/kvizy-app-icon.png",
        width: 1200,
        height: 1200,
        alt: "KVIZY-logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_CONFIG.name} – ${APP_CONFIG.tagline}`,
    description: "Dansk multiplayer quiz på én skærm.",
    images: ["/brand/kvizy-app-icon.png"],
  },
  category: "games",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_CONFIG.name,
  },
};
export const viewport: Viewport = {
  themeColor: "#121214",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: APP_CONFIG.name,
    url: "https://www.kvizy.dk/",
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    inLanguage: "da-DK",
    description: "Dansk multiplayer quiz på én skærm.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
  };
  return (
    <html lang="da" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <StartupSplash />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
