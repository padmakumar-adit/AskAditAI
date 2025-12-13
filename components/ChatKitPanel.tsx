"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import {
  STARTER_PROMPTS,
  PLACEHOLDER_INPUT,
  GREETING,
  CREATE_SESSION_ENDPOINT,
  WORKFLOW_ID,
  getThemeConfig,
} from "@/lib/config";
import { ErrorOverlay } from "./ErrorOverlay";
import type { ColorScheme } from "@/hooks/useColorScheme";

export type FactAction = {
  type: "save";
  factId: string;
  factText: string;
};

type ChatKitPanelProps = {
  theme: ColorScheme;
  idToken?: string | null;
  onWidgetAction: (action: FactAction) => Promise<void>;
  onResponseEnd: () => void;
  onThemeRequest: (scheme: ColorScheme) => void;
};

type ErrorState = {
  script: string | null;
  session: string | null;
  integration: string | null;
  retryable: boolean;
};

const isDev = process.env.NODE_ENV !== "production";

const createInitialErrors = (): ErrorState => ({
  script: null,
  session: null,
  integration: null,
  retryable: false,
});

export function ChatKitPanel({
  theme,
  idToken,
  onWidgetAction,
  onResponseEnd,
  onThemeRequest,
}: ChatKitPanelProps) {
  const processedFacts = useRef(new Set<string>());
  const isMountedRef = useRef(true);

  const [errors, setErrors] = useState<ErrorState>(createInitialErrors);
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const [instanceKey, setInstanceKey] = useState(0);

  const setErrorState = useCallback((updates: Partial<ErrorState>) => {
    setErrors((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isWorkflowConfigured =
    Boolean(WORKFLOW_ID) && !WORKFLOW_ID.startsWith("wf_replace");

  useEffect(() => {
    if (!isWorkflowConfigured) {
      setErrorState({
        session: "Workflow ID is not configured.",
        retryable: false,
      });
      setIsInitializingSession(false);
    }
  }, [isWorkflowConfigured, setErrorState]);

  const handleResetChat = useCallback(() => {
    if (isDev) {
      console.info("[ChatKitPanel] Restarting chat session");
    }

    processedFacts.current.clear();
    setErrors(createInitialErrors());
    setIsInitializingSession(true);
    setInstanceKey((k) => k + 1);
  }, []);

  const getClientSecret = useCallback(async () => {
    if (!isWorkflowConfigured) {
      throw new Error("Workflow not configured");
    }

    setIsInitializingSession(true);
    setErrorState({ session: null, integration: null, retryable: false });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    const response = await fetch(CREATE_SESSION_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workflow: { id: WORKFLOW_ID },
        chatkit_configuration: {
          file_upload: { enabled: true },
        },
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { client_secret?: string }
      | null;

    if (!response.ok || !data?.client_secret) {
      throw new Error("Failed to create ChatKit session");
    }

    setIsInitializingSession(false);
    return data.client_secret;
  }, [idToken, isWorkflowConfigured, setErrorState]);

  const chatkit = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: theme,
      ...getThemeConfig(theme),
    },
    startScreen: {
      greeting: GREETING,
      prompts: STARTER_PROMPTS,
    },
    composer: {
      placeholder: PLACEHOLDER_INPUT,
      attachments: { enabled: true },
    },
    threadItemActions: {
      feedback: true,
    },
    onClientTool: async (invocation) => {
      if (invocation.name === "switch_theme") {
        const requested = invocation.params?.theme;
        if (requested === "light" || requested === "dark") {
          onThemeRequest(requested);
          return { success: true };
        }
      }

      if (invocation.name === "record_fact") {
        const id = String(invocation.params?.fact_id ?? "");
        const text = String(invocation.params?.fact_text ?? "");

        if (!id || processedFacts.current.has(id)) {
          return { success: true };
        }

        processedFacts.current.add(id);
        void onWidgetAction({
          type: "save",
          factId: id,
          factText: text.replace(/\s+/g, " ").trim(),
        });
        return { success: true };
      }

      return { success: false };
    },
    onResponseEnd,
    onThreadChange: () => {
      processedFacts.current.clear();
    },
    onError: ({ error }) => {
      console.error("ChatKit error", error);

      if (!isMountedRef.current) return;

      setErrorState({
        integration:
          "Your session has expired or encountered an error. Please restart the chat.",
        retryable: true,
      });

      setIsInitializingSession(false);
    },
  });

  const blockingError =
    errors.script ?? errors.session ?? errors.integration;

  return (
    <div className="relative flex h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
      <ChatKit
        key={instanceKey}
        control={chatkit.control}
        className={
          blockingError || isInitializingSession
            ? "pointer-events-none opacity-0"
            : "block h-full w-full"
        }
      />

      <ErrorOverlay
        error={blockingError}
        fallbackMessage={
          blockingError || !isInitializingSession
            ? null
            : "Loading assistant session..."
        }
        onRetry={blockingError && errors.retryable ? handleResetChat : null}
        retryLabel="Restart chat"
      />
    </div>
  );
}
