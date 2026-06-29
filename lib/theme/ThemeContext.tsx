"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    let resolved: "light" | "dark" = "dark";
    if (newTheme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = newTheme;
    }
    setResolvedTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as Theme) || "system";
    setThemeState(savedTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (localStorage.getItem("theme") === "system" || !localStorage.getItem("theme")) {
        const resolved = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(resolved);
        document.documentElement.setAttribute("data-theme", resolved);
      }
    };

    // Initialize resolved theme
    let resolved: "light" | "dark" = "dark";
    if (savedTheme === "system") {
      resolved = mediaQuery.matches ? "dark" : "light";
    } else {
      resolved = savedTheme;
    }
    setResolvedTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
