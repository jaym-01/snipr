import {ThemeProvider} from "@/utils/theme.tsx";
import {JSX} from "react";

export default function App({children}: { children?: JSX.Element | JSX.Element[] }) {
  return <ThemeProvider>
    {children}
  </ThemeProvider>;
}