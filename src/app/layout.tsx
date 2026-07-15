import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_CONFIG } from "@/lib/config";
import "./globals.css";
const sans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const mono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
export const metadata:Metadata={title:`${APP_CONFIG.name} – ${APP_CONFIG.tagline}`,description:"Det danske quizspil til venner, familie og fest.",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:APP_CONFIG.name}};
export const viewport:Viewport={themeColor:"#121214",width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="da" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}><body><Providers>{children}</Providers></body></html>}
