"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();

export default function BuilderLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?type=builder`,
          },
        });
        if (signUpError) throw signUpError;

        // After signup, try to sign in immediately (if email confirmation is disabled)
        if (data.session) {
          // Check if builder account already exists
          const res = await fetch("/api/builder/auth/check", {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          const result = await res.json();

          if (result.hasAccount) {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/builder/onboarding";
          }
        } else {
          setMessage("Check your email to confirm your account, then log in!");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // Check if builder has completed onboarding
        const res = await fetch("/api/builder/auth/check", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const result = await res.json();

        if (result.hasAccount && result.onboardingStatus === "completed") {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/builder/onboarding";
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏗️</div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isSignUp ? "Create Builder Account" : "Builder Login"}
          </h1>
          <p className="text-slate-600 mt-2 font-medium">
            {isSignUp
              ? "Sign up to manage your homes and service requests"
              : "Sign in to your builder dashboard"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium text-sm">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </button>

          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setMessage("");
            }}
            className="w-full py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700 font-medium">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
