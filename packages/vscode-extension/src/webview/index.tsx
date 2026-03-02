import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { NodeGraph } from "@eventcatalog/visualiser";
import type { DslGraph } from "@eventcatalog/visualiser";

const vscode = acquireVsCodeApi();

/** Sync data-theme on <html> to match VS Code's active color theme. */
function syncTheme() {
  const isDark =
    document.body.classList.contains("vscode-dark") ||
    document.body.classList.contains("vscode-high-contrast");
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "dark" : "light",
  );
}

function App() {
  const [graph, setGraph] = useState<DslGraph>({ nodes: [], edges: [] });

  useEffect(() => {
    // Set initial theme and watch for VS Code theme changes
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "update-graph") {
        setGraph(message.graph);
      }
    };
    window.addEventListener("message", handler);

    // Signal to extension that webview is ready to receive messages
    vscode.postMessage({ type: "ready" });

    return () => {
      observer.disconnect();
      window.removeEventListener("message", handler);
    };
  }, []);

  if (graph.nodes.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#888",
          fontFamily: "var(--vscode-font-family, sans-serif)",
          fontSize: "14px",
        }}
      >
        Add a visualizer block to your .ec file to see the preview
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div id="ec-preview-portal" style={{ width: "100%", height: "100%" }} />
      <NodeGraph
        id="ec-preview"
        portalId="ec-preview-portal"
        graph={graph}
        mode="full"
        zoomOnScroll={true}
        showSearch={false}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
