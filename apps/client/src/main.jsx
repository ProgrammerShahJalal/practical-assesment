import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider, StudentAuthProvider } from "./auth";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StudentAuthProvider>
          <App />
        </StudentAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
