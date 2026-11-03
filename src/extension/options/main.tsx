import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function Options() {
  return (
    <main>
      <h1>notAgainPlease</h1>
      <p>Your profile settings will live here.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Options />
  </StrictMode>
);
