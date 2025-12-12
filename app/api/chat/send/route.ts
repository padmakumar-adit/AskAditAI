import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { conversationId, messages } = await req.json();

    // Convert Chat-style messages → Responses API input
    const input = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: [{ type: "text", text: m.content }],
    }));

    const response = await client.responses.create({
      model: "gpt-4.1-mini", // recommended over gpt-4o for cost + speed
      input,
    });

    return NextResponse.json({
      conversationId,
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
