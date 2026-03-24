"use client";

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
