// src/context/ThemeContext.tsx
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { load } from "@tauri-apps/plugin-store";
import { storage } from "@/utils/settings.ts";

const key = "theme";

enum Theme {
  light = "light",
  dark = "dark",
  system = "system",
}

type TrueTheme = Exclude<Theme, "system">;

async function saveTheme(theme: Theme) {
  const store = await load(storage, { autoSave: false });
  await store.set(key, theme);
  await store.save();
  // await store.close();
}

async function loadTheme(): Promise<Theme> {
  const store = await load(storage, { autoSave: false });
  const theme = await store.get(key);
  // await store.close();
  if (theme !== "system" && theme !== "light" && theme !== "dark") {
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? Theme.dark
      : Theme.light;
  }
  return theme as Theme;
}

export function resolveTheme(theme: Theme): TrueTheme {
  if (theme === "system") {
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? Theme.dark
      : Theme.light;
  }
  return theme;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const theme = globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? Theme.dark
      : Theme.light;
    document.documentElement.setAttribute("data-theme", resolveTheme(theme));
    return theme;
  });

  useEffect(() => {
    loadTheme().then((storedTheme) => {
      console.log("here", storedTheme);
      setTheme(storedTheme);
      document.documentElement.setAttribute(
        "data-theme",
        resolveTheme(storedTheme),
      );
    });
  }, []);

  const toggleTheme = async () => {
    const themeObj = Object.values(Theme);
    const currentThemeIndex = themeObj.indexOf(theme);
    const nextTheme = themeObj[(currentThemeIndex + 1) % themeObj.length];
    setTheme(nextTheme);
    document.documentElement.setAttribute(
      "data-theme",
      resolveTheme(nextTheme),
    );
    await saveTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
