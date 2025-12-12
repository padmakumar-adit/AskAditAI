"use client";

import { useEffect } from "react";

export function ChatKitScriptLoader() {
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-chatkit-script="true"]'
    );
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.platform.openai.com/deployments/chatkit/chatkit.js";
    script.async = true;
    script.setAttribute("data-chatkit-script", "true");

    script.onload = () => {
      window.dispatchEvent(new Event("chatkit-script-loaded"));
    };

    script.onerror = () => {
      window.dispatchEvent(
        new CustomEvent("chatkit-script-error", {
          detail: "Failed to load ChatKit script",
        })
      );
    };

    document.head.appendChild(script);

    return () => {
      // we don't remove the script so it stays available across navigations
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}
