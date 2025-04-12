import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./App.css";
import Home from "@/components/pages/Home.tsx";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <App><Home></Home></App>,
);