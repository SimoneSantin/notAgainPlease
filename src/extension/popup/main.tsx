import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function Popup() {
  return (
    <main>
      <h1>notAgainPlease</h1>
      <p>Your application profile will live here.</p>
      <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
        Open profile
      </button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Popup />
  </StrictMode>
);
