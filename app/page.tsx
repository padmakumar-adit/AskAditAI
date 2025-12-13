"use client";

import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { ChatRenderer } from "@/components/ChatRenderer";
import { useColorScheme } from "@/hooks/useColorScheme";

type DecodedToken = {
  email?: string;
  name?: string;
  picture?: string;
};

export default function HomePage() {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { scheme } = useColorScheme();

  const handleLoginSuccess = (credentialResponse: CredentialResponse) => {
    const token = credentialResponse.credential;
    if (!token) {
      setError("Login failed.");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const userEmail = decoded.email;

      if (!userEmail || !userEmail.toLowerCase().endsWith("@adit.com")) {
        setError("Only @adit.com accounts are allowed.");
        return;
      }

      setIdToken(token);
      setEmail(userEmail);
      setDisplayName(decoded.name ?? userEmail);
      setAvatarUrl(decoded.picture ?? null);
      setError(null);
    } catch {
      setError("Invalid login token.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("chatkit_session_secret");
    localStorage.removeItem("chatkit_session_expires");

    setIdToken(null);
    setEmail(null);
    setDisplayName(null);
    setAvatarUrl(null);
    setMenuOpen(false);
  };

  const isLoggedIn = Boolean(idToken && email);

  // ---------------- LOGIN PAGE ----------------
  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex w-full max-w-md flex-col items-center">
          <img src="/logo.svg" className="h-10 mb-6" alt="AskAditAI" />

          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome to <span className="text-[#21AAE0]">AskAditAI</span>
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in with your Adit account
          </p>

          <div className="mt-8">
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => setError("Login failed")}
              theme="filled_black"
              shape="pill"
              width="260"
            />
          </div>

          {error && (
            <p className="mt-4 text-xs text-rose-600">{error}</p>
          )}
        </div>
      </main>
    );
  }

  // ---------------- CHAT PAGE ----------------
  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      {/* Header */}
      <header className="z-30 flex items-center justify-between border-b bg-white px-4 py-2">
        <img src="/logo.svg" className="h-7" alt="AskAditAI" />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2"
          >
            <img
              src={avatarUrl ?? ""}
              alt="User"
              className="h-8 w-8 rounded-full"
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-md bg-white shadow-lg z-50">
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 p-4">
        <ChatRenderer theme={scheme} idToken={idToken!} />
      </div>
    </main>
  );
}
