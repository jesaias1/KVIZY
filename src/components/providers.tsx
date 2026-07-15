"use client";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
export function Providers({children}:{children:React.ReactNode}){useEffect(()=>{if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>undefined)},[]);return <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}><TooltipProvider>{children}</TooltipProvider></ThemeProvider>}
