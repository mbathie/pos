"use client";

import React, { useState, useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}