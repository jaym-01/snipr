import { ThemeProvider } from "@/utils/theme.tsx";
import { CurrentPage } from "@/utils/nav.tsx";

export default function App() {
  return (
    <ThemeProvider>
      <CurrentPage />
    </ThemeProvider>
  );
}
