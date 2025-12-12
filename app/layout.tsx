import type { Metadata } from "next";
import "./globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
//import { ChatKitScriptLoader } from "@/components/ChatKitScriptLoader";
import { ChatRenderer } from "@/components/ChatRenderer";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export const metadata: Metadata = {
  title: "AskAdit AI",
  description: "Internal KB Agent for Adit",
  icons: {
    icon: "/logo.svg",       // NEW: use SVG instead of favicon.ico
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={clientId}>
          <ChatKitScriptLoader />
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
