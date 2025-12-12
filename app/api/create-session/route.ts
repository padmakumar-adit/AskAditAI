import { WORKFLOW_ID } from "@/lib/config";
import { OAuth2Client } from "google-auth-library";

export const runtime = "nodejs";

interface CreateSessionRequestBody {
  workflow?: { id?: string | null } | null;
  scope?: { user_id?: string | null } | null;
  workflowId?: string | null;
  chatkit_configuration?: {
    file_upload?: {
      enabled?: boolean;
    };
  };
  idToken?: string | null;
}

const DEFAULT_CHATKIT_BASE = "https://api.openai.com";

// Google OAuth client to verify ID tokens
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return buildJsonResponse(
        { error: "Missing OPENAI_API_KEY environment variable" },
        500
      );
    }

    const parsedBody = await safeParseJson<CreateSessionRequestBody>(request);

    // ---------- GOOGLE LOGIN + @adit.com CHECK ----------
    const authHeader = request.headers.get("authorization") || "";
    let idToken = "";

    if (authHeader.toLowerCase().startsWith("bearer ")) {
      idToken = authHeader.slice("bearer ".length).trim();
    }
    if (!idToken && parsedBody?.idToken) {
      idToken = parsedBody.idToken;
    }

    if (!idToken) {
      return buildJsonResponse({ error: "Missing Google ID token" }, 401);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      return buildJsonResponse(
        { error: "Unable to read email from Google token" },
        401
      );
    }

    if (!email.toLowerCase().endsWith("@adit.com")) {
      return buildJsonResponse({ error: "Email domain not allowed" }, 403);
    }

    const userId = email;
    // ---------- END GOOGLE CHECK ----------

    const resolvedWorkflowId =
      parsedBody?.workflow?.id ?? parsedBody?.workflowId ?? WORKFLOW_ID;

    if (process.env.NODE_ENV !== "production") {
      console.info("[create-session] handling request", {
        resolvedWorkflowId,
        body: JSON.stringify(parsedBody),
        userId,
      });
    }

    if (!resolvedWorkflowId) {
      return buildJsonResponse({ error: "Missing workflow id" }, 400);
    }

    const apiBase = process.env.CHATKIT_API_BASE ?? DEFAULT_CHATKIT_BASE;
    const url = `${apiBase}/v1/chatkit/sessions`;

    const upstreamResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        workflow: { id: resolvedWorkflowId },
        user: userId,
        chatkit_configuration: {
          file_upload: {
            enabled:
              parsedBody?.chatkit_configuration?.file_upload?.enabled ?? false,
          },
        },
      }),
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[create-session] upstream response", {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
    }

    const upstreamJson = (await upstreamResponse.json().catch(() => ({}))) as
      | Record<string, unknown>
      | undefined;

    if (!upstreamResponse.ok) {
      const upstreamError = extractUpstreamError(upstreamJson);
      console.error("OpenAI ChatKit session creation failed", {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        body: upstreamJson,
      });
      return buildJsonResponse(
        {
          error:
            upstreamError ??
            `Failed to create session: ${upstreamResponse.statusText}`,
          details: upstreamJson,
        },
        upstreamResponse.status
      );
    }

    const clientSecret = upstreamJson?.client_secret ?? null;
    const expiresAfter = upstreamJson?.expires_after ?? null;

    return buildJsonResponse(
      {
        client_secret: clientSecret,
        expires_after: expiresAfter,
      },
      200
    );
  } catch (error) {
    console.error("Create session error", error);
    return buildJsonResponse({ error: "Unexpected error" }, 500);
  }
}

export async function GET(): Promise<Response> {
  return methodNotAllowedResponse();
}

function methodNotAllowedResponse(): Response {
  return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}

function buildJsonResponse(payload: unknown, status: number): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

async function safeParseJson<T>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractUpstreamError(
  payload: Record<string, unknown> | undefined
): string | null {
  if (!payload) {
    return null;
  }

  const error = payload.error;
  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  const details = payload.details;
  if (typeof details === "string") {
    return details;
  }

  if (details && typeof details === "object" && "error" in details) {
    const nestedError = (details as { error?: unknown }).error;
    if (typeof nestedError === "string") {
      return nestedError;
    }
    if (
      nestedError &&
      typeof nestedError === "object" &&
      "message" in nestedError &&
      typeof (nestedError as { message?: unknown }).message === "string"
    ) {
      return (nestedError as { message: string }).message;
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }
  return null;
}
