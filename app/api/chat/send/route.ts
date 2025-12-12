import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type IncomingMessage =
  | { role: string; content: string }
  | string;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Incoming body:", body);

    let messages: { role: "system" | "user" | "assistant"; content: string }[] =
      [];

    /**
     * ✅ Case 1: Proper messages array
     */
    if (Array.isArray(body.messages)) {
      messages = body.messages;
    }

    /**
     * ✅ Case 2: Single input string
     */
    else if (typeof body.input === "string") {
      messages = [
        { role: "user", content: body.input },
      ];
    }

    /**
     * ❌ Invalid payload
     */
    else {
      return NextResponse.json(
        { error: "Invalid payload: messages or input required" },
        { status: 400 }
      );
    }

    console.log("Normalized messages:", messages);

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: messages.map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.content }],
      })),
    });

    return NextResponse.json({
      conversationId: body.conversationId ?? null,
      answer: response.output_text,
    });
  } catch (err) {
    console.error("Chat send error:", err);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
