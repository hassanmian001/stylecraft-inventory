import { useCallback, useEffect, useState } from "react";

import { applyTheme, readThemePreference, storeThemePreference, type ThemePreference } from "./theme";

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference());
  const [resolved, setResolved] = useState<"light" | "dark">(() => applyTheme(readThemePreference()));

  useEffect(() => {
    setResolved(applyTheme(preference));
    storeThemePreference(preference);
  }, [preference]);

  // Following the system means following it as it changes, not only at startup.
  useEffect(() => {
    if (preference !== "system" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved]);

  return { preference, resolvedTheme: resolved, setPreference, toggle };
}
