import { WORKFLOW_ID } from "@/lib/config";
import { OAuth2Client } from "google-auth-library";
import OpenAI from "openai";

export const runtime = "nodejs";

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request): Promise<Response> {
  try {
    // ------------------ AUTH ------------------
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice("bearer ".length).trim()
      : null;

    if (!idToken) {
      return json({ error: "Missing Google ID token" }, 401);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email || !email.toLowerCase().endsWith("@adit.com")) {
      return json({ error: "Email domain not allowed" }, 403);
    }

    // ------------------ BODY ------------------
    const body = await request.json().catch(() => ({}));
    const workflowId =
      body?.workflow?.id ?? body?.workflowId ?? WORKFLOW_ID;

    if (!workflowId) {
      return json({ error: "Missing workflow id" }, 400);
    }

    // ------------------ CREATE SESSION (CORRECT WAY) ------------------
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      workflow: { id: workflowId },
      user: email,
    });

    if (!response.client_secret) {
      console.error("No client_secret returned", response);
      return json({ error: "Failed to create session" }, 500);
    }

    // ------------------ RETURN ------------------
    return json({
      client_secret: response.client_secret,
      expires_after: response.expires_after,
    });
  } catch (err) {
    console.error("Create session error", err);
    return json({ error: "Unexpected error" }, 500);
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
