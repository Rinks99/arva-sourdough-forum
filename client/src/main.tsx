import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./components/AuthContext";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
