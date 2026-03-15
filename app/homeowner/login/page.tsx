"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomeownerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/homeowner/reset-password`,
        });
        if (error) throw error;
        setMessage("Password reset email sent! Check your inbox.");
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?type=homeowner`,
          },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then log in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/homeowner/dashboard";
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Homeowner Login"}
          </h1>
          <p className="text-slate-600 mt-2 font-medium">
            {isForgotPassword
              ? "Enter your email and we'll send a reset link"
              : isSignUp
              ? "Sign up to access your home portal"
              : "Sign in to view your service requests"}
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
              placeholder="you@example.com"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || (!isForgotPassword && !password)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {loading
              ? "Please wait..."
              : isForgotPassword
              ? "Send Reset Email"
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </button>

          {!isForgotPassword && (
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
          )}

          {!isSignUp && (
            <button
              onClick={() => {
                setIsForgotPassword(!isForgotPassword);
                setError("");
                setMessage("");
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              {isForgotPassword ? "← Back to Sign In" : "Forgot your password?"}
            </button>
          )}
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