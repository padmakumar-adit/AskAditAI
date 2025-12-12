import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Incoming body:", body);

    let messages: ChatMessage[] = [];

    // ✅ Case 1: Full messages array (future-proof)
    if (Array.isArray(body.messages)) {
      messages = body.messages;
    }

    // ✅ Case 2: Single message string (CURRENT UI)
    else if (typeof body.message === "string") {
      messages = [{ role: "user", content: body.message }];
    }

    // ❌ Invalid payload
    else {
      return NextResponse.json(
        { error: "Invalid payload: message or messages required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.2,
    });

    return NextResponse.json({
      conversationId: body.conversationId ?? crypto.randomUUID(),
      answer: completion.choices[0]?.message?.content ?? "",
    });
  } catch (err) {
    console.error("Chat send error:", err);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
