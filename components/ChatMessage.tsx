"use client";

import React from "react";

type Props = {
  role: "user" | "assistant";
  content: string;
  onFeedback?: (value: "positive" | "negative") => void;
};

export function ChatMessage({ role, content, onFeedback }: Props) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-100">
          {content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-3 text-sm leading-relaxed text-slate-100">
        {content}
      </div>

      {/* Feedback */}
      <div className="flex items-center gap-3 text-slate-400">
        <button
          type="button"
          onClick={() => onFeedback?.("positive")}
          className="hover:text-green-400"
          aria-label="Thumbs up"
        >
          👍
        </button>
        <button
          type="button"
          onClick={() => onFeedback?.("negative")}
          className="hover:text-rose-400"
          aria-label="Thumbs down"
        >
          👎
        </button>
      </div>
    </div>
  );
}
