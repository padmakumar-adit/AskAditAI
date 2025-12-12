"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as Msg } from "@/types/chat";
import type { ColorScheme } from "@/hooks/useColorScheme";

type Props = {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  theme: ColorScheme;
};

export function ChatRenderer({ email }: Props) {
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Start / resume conversation
  useEffect(() => {
    fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json())
      .then((d) => setConversationId(d.conversationId));
  }, [email]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      createdAt: Date.now(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");

    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        message: userMsg.content,
      }),
    });

    const reader = res.body?.getReader();
    if (!reader) return;

    let assistantText = "";
    const assistantId = crypto.randomUUID();

    setMessages((m) => [
      ...m,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      },
    ]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      assistantText += new TextDecoder().decode(value);

      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: assistantText }
            : msg
        )
      );
    }
  };

  const sendFeedback = async (
    messageId: string,
    value: "positive" | "negative"
  ) => {
    await fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        messageId,
        feedback: value,
      }),
    });
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
            message={m}
            onFeedback={
              m.role === "assistant"
                ? (value) => sendFeedback(m.id, value)
                : undefined
            }
          />
        ))}
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
