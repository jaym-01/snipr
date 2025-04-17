import ReactDOM from "react-dom/client";
import "./App.css";
import Home from "@/components/pages/Home.tsx";
import Settings from "@/components/pages/Settings.tsx";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeProvider } from "@/utils/theme.tsx";
const WINDOW_MAPPING: { [key: string]: JSX.Element } = {
  main: <Home></Home>,
  settings: <Settings></Settings>,
};

const curWindow = getCurrentWindow();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ThemeProvider>{WINDOW_MAPPING[curWindow.label] ?? <Home />}</ThemeProvider>
);
