import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Suppress known-harmless THREE.js deprecation warnings from @react-three/fiber internals
// (THREE.Clock and PCFSoftShadowMap deprecated in three r183+, not yet updated in r3f v9)
const _origWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('THREE.Clock') ||
    msg.includes('PCFSoftShadowMap has been deprecated') ||
    msg.includes('WebGLShadowMap: PCFSoftShadowMap')
  ) return;
  _origWarn(...args);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
