"use client";

import type { ColorScheme } from "@/hooks/useColorScheme";
import { ChatKitPanel } from "./ChatKitPanel";

type Props = {
  theme: ColorScheme;
  idToken: string;
};

export function ChatRenderer({ theme, idToken }: Props) {
  return (
    <ChatKitPanel
      theme={theme}
      idToken={idToken}
      onWidgetAction={async () => {}}
      onResponseEnd={() => {}}
      onThemeRequest={() => {}}
    />
  );
}
