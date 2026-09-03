export type ThemePreference = "light" | "dark" | "system";

const storageKey = "stylecraft.theme";

function prefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return prefersDark() ? "dark" : "light";
  }

  return preference;
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(storageKey);

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage can be unavailable; the default preference still works.
  }

  return "system";
}

export function storeThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(storageKey, preference);
  } catch {
    // A theme that cannot be remembered is better than a crash.
  }
}

export function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}
