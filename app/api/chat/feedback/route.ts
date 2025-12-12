import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    /**
     * body = {
     *   conversationId,
     *   messageId,
     *   feedback: "positive" | "negative",
     *   comment?: string
     * }
     */

    console.log("Feedback received:", body);

    // TODO: Push to Zoho CRM here

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
