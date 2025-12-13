"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { useChatKit } from "@openai/chatkit-react";
import type { ColorScheme } from "@/hooks/useColorScheme";

type Props = {
  theme: ColorScheme;
};

export function ChatRenderer({ theme }: Props) {
  const { control, messages, isResponding } = useChatKit();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !control) return;
    control.sendMessage(input);
    setInput("");
  };

  return (
    <div className="h-full rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl flex flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            role={m.role}
            content={m.content}
          />
        ))}

        {isResponding && (
          <div className="text-xs text-slate-400">Thinking…</div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 rounded-full bg-slate-800 px-4 py-2">
          <span className="text-slate-400">＋</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={sendMessage}
            className="text-slate-200 hover:text-white"
            aria-label="Send"
          >
            ⬆
          </button>
        </div>
      </div>
    </div>
  );
}
