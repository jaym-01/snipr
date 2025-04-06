import ReactDOM from "react-dom/client";
import "@/App.css";

function Settings() {
    return (
        <div className="container">
            <div className="main-wrapper">
                <h1>Settings</h1>
                <p>Settings page content goes here.</p>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Settings />,
);