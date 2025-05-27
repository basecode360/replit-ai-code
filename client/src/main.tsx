import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure fonts are loaded
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&family=Inter:wght@400;500;600;700&display=swap";
document.head.appendChild(fontLink);

// Set document title
document.title = "Military AAR Management System";

createRoot(document.getElementById("root")!).render(<App />);
