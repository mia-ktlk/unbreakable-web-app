import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for Offline PWA Capabilities
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => console.log("PWA Service Worker registered successfully:", reg.scope))
      .catch((err) => console.error("PWA Service Worker registration failed:", err));
  });
}
