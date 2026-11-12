"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PrintShopProvider } from "@/context/PrintShopContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <PrintShopProvider>{children}</PrintShopProvider>
    </NextThemesProvider>
  );
}
