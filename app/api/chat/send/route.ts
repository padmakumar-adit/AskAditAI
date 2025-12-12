import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { conversationId, messages } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    return NextResponse.json({
      conversationId,
      answer: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error("Chat send error:", err);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
