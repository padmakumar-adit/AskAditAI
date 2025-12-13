import { WORKFLOW_ID } from "@/lib/config";
import { OAuth2Client } from "google-auth-library";

export const runtime = "nodejs";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const OPENAI_API_BASE = "https://api.openai.com";

export async function POST(request: Request): Promise<Response> {
  try {
    // ---------- ENV CHECK ----------
    if (!process.env.OPENAI_API_KEY) {
      return json({ error: "Missing OPENAI_API_KEY" }, 500);
    }

    // ---------- AUTH ----------
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
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

    // ---------- BODY ----------
    const body = await request.json().catch(() => ({}));
    const workflowId =
      body?.workflow?.id ?? body?.workflowId ?? WORKFLOW_ID;

    if (!workflowId) {
      return json({ error: "Missing workflow id" }, 400);
    }

    // ---------- CHATKIT SESSION (CORRECT) ----------
    const res = await fetch(`${OPENAI_API_BASE}/v1/chatkit/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        workflow: { id: workflowId },
        user: email,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.client_secret) {
      console.error("ChatKit session error", data);
      return json(
        { error: "Failed to create ChatKit session", details: data },
        res.status
      );
    }

    return json({
      client_secret: data.client_secret,
      expires_after: data.expires_after,
    });
  } catch (err) {
    console.error("Create-session error", err);
    return json({ error: "Unexpected error" }, 500);
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
