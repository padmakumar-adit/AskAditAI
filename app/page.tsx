"use client";

import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
//import { ChatKitPanel } from "@/components/ChatKitPanel";
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
  const { scheme, setScheme } = useColorScheme();

  const handleLoginSuccess = (credentialResponse: CredentialResponse) => {
    const token = credentialResponse.credential;
    if (!token) {
      setError("Login failed: missing credential.");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const userEmail = decoded.email ?? null;

      if (!userEmail) {
        setError("Unable to read email from Google account.");
        return;
      }

      if (!userEmail.toLowerCase().endsWith("@adit.com")) {
        setError("Only @adit.com emails are allowed. Please use your work account.");
        setIdToken(null);
        setEmail(null);
        setDisplayName(null);
        setAvatarUrl(null);
        return;
      }

      setError(null);
      setIdToken(token);
      setEmail(userEmail);
      setDisplayName(decoded.name ?? userEmail);
      setAvatarUrl(decoded.picture ?? null);
    } catch {
      setError("Login failed: invalid token.");
    }
  };

  const handleLoginError = () => {
    setError("Google login failed. Please try again.");
  };

  const handleLogout = () => {
  // Clear ChatKit locally cached session
  localStorage.removeItem("chatkit_session_secret");
  localStorage.removeItem("chatkit_session_expires");

  // Clear your app state
  setIdToken(null);
  setEmail(null);
  setDisplayName(null);
  setAvatarUrl(null);
  setError(null);
  setMenuOpen(false);

  // Optional: refresh UI to ensure clean re-init
  //window.location.reload();
};


  const isLoggedIn = Boolean(idToken && email);

  const initials = (() => {
    if (displayName) {
      const parts = displayName.split(" ");
      const first = parts[0]?.[0] ?? "";
      const second = parts[1]?.[0] ?? "";
      return (first + second).toUpperCase() || "A";
    }
    if (email) {
      return email[0]?.toUpperCase() ?? "A";
    }
    return "A";
  })();

  // ---------- LOGGED OUT (LOGIN PAGE) ----------
  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex w-full max-w-3xl flex-col items-center px-4">
          {/* Logo */}
          <div className="mb-6">
            {/* Replace /logo.svg with your actual logo path */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="AskAditAI logo"
              className="h-10 w-auto"
            />
          </div>

          {/* Heading */}
<h1 className="text-2xl font-semibold text-slate-900">
  Welcome to{" "}
  <span className="font-semibold">
    <span style={{ color: "#222024" }}>Ask</span>
    <span style={{ color: "#222024" }}>Adit</span>
    <span style={{ color: "#21AAE0" }}>AI</span>
  </span>
</h1>


          {/* Subheading */}
          <p className="mt-3 text-sm text-slate-600">
            Sign in with your Adit company account
          </p>

          {/* Google button */}
          <div className="mt-8">
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              theme="filled_black"
              shape="pill"
              text="signin_with"
              width="270"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="mt-3 text-xs text-rose-600">{error}</p>
          )}

          {/* Divider + footer text */}
          <div className="mt-10 w-full max-w-2xl">
            <div className="h-px w-full bg-slate-200" />
            <p className="mt-4 text-center text-xs text-slate-400">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ---------- LOGGED IN (CHAT VIEW) ----------
  return (
    <main className="flex min-h-screen flex-col bg-slate-100">
      {/* Header sits above ChatKit */}
      <header className="relative z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
        {/* Left side: app title */}
        <div className="flex items-center gap-2">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img
    src="/logo.svg"
    alt="AskAditAI logo"
    className="h-7 w-auto"
  />
</div>


        {/* Right side: profile + dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-slate-100"
          >
            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-slate-200">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName ?? email ?? "User avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-700">
                  {initials}
                </div>
              )}
            </div>
            <div className="hidden flex-col items-start text-left sm:flex">
              <span className="text-sm font-medium text-slate-900">
                {displayName ?? email}
              </span>
              <span className="text-[11px] text-slate-500">{email}</span>
            </div>
            <svg
              className="h-3 w-3 text-slate-500"
              viewBox="0 0 12 12"
              aria-hidden="true"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-md border border-slate-200 bg-white py-1 text-xs text-slate-700 shadow-lg z-50">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center px-3 py-2 text-left hover:bg-slate-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 p-4">
        <ChatKitPanel
          theme={scheme}
          idToken={idToken}
          onWidgetAction={async () => {}}
          onResponseEnd={() => {}}
          onThemeRequest={setScheme}
        />
      </div>
    </main>
  );
}
