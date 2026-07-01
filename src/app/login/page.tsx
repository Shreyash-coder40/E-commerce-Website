"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMode, setLoginMode] = useState<"PASSWORD" | "OTP">("PASSWORD");
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    setError("");
    if (!phoneNumber || phoneNumber.trim().length < 8) {
      setError("Please enter a valid phone number (including country code, e.g., +919999999999).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate OTP.");
      }

      setOtpSent(true);
      alert("✅ OTP has been sent successfully to your phone number!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Handle User Registration
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Something went wrong during registration.");
        }

        // Auto-login user after successful sign-up
        const loginRes = await signIn("credentials", {
          redirect: false,
          email: formData.email,
          password: formData.password,
        });

        if (loginRes?.error) {
          setError("Account created, but failed to sign in automatically.");
          return;
        }

        router.push("/");
        router.refresh();
      } else {
        if (loginMode === "PASSWORD") {
          // Handle Standard User Login
          const loginRes = await signIn("credentials", {
            redirect: false,
            email: formData.email,
            password: formData.password,
          });

          if (loginRes?.error) {
            setError("Invalid email or password. Please check your credentials and try again.");
            setLoading(false);
            return;
          }

          router.push("/");
          router.refresh();
        } else {
          // Handle OTP Authentication
          if (!phoneNumber || !otp) {
            throw new Error("Phone number and OTP code are required.");
          }

          const loginRes = await signIn("credentials", {
            redirect: false,
            phoneNumber: phoneNumber.trim(),
            otp: otp.trim(),
          });

          if (loginRes?.error) {
            throw new Error("Invalid phone number or verification code. Please check and try again.");
          }

          router.push("/");
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 space-y-6">
      <Link href="/" className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition w-fit inline-flex items-center gap-1.5 self-center">
        🏠 Back to Home
      </Link>
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
            {isSignUp ? "Create your account" : "Sign in to your store"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="font-bold text-indigo-600 hover:text-indigo-500 transition duration-150 ease-in-out"
            >
              {isSignUp ? "already have an account? Sign In" : "register a new account today"}
            </button>
          </p>
        </div>

        {/* Tab Selection (Only shown for Sign In mode) */}
        {!isSignUp && (
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setLoginMode("PASSWORD");
                setError("");
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                loginMode === "PASSWORD"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-950"
              }`}
            >
              🔑 Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("OTP");
                setError("");
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                loginMode === "OTP"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-950"
              }`}
            >
              📱 Phone OTP Login
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 font-bold border border-red-200 shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {loginMode === "OTP" && !isSignUp ? (
          /* Phone number + OTP Verification Form */
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    required
                    disabled={otpSent}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 appearance-none rounded-xl border border-gray-300 px-3 py-3 text-black font-semibold placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="e.g. +919999999999"
                  />
                  <button
                    type="button"
                    disabled={loading || otpSent}
                    onClick={handleSendOtp}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition shadow disabled:bg-indigo-300"
                  >
                    {loading ? "Sending..." : otpSent ? "Sent ✔" : "Send OTP"}
                  </button>
                </div>
              </div>

              {otpSent && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">6-Digit OTP Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-300 px-3 py-3 text-black font-extrabold text-center tracking-widest text-lg placeholder-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="• • • • • •"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400 transition-all shadow-md"
                  >
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* Standard Email/Password Form */
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="-space-y-px rounded-md shadow-sm">
              {isSignUp && (
                <div>
                  <label className="sr-only">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="relative block w-full appearance-none rounded-t-md border border-gray-350 px-3 py-3 text-black font-semibold placeholder-gray-400 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Full Name"
                  />
                </div>
              )}
              <div>
                <label className="sr-only">Email address</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`relative block w-full appearance-none border border-gray-350 px-3 py-3 text-black font-semibold placeholder-gray-400 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${
                    isSignUp ? "" : "rounded-t-md"
                  }`}
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="sr-only">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-b-md border border-gray-350 px-3 py-3 text-black font-semibold placeholder-gray-400 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400 transition-all shadow-md"
              >
                {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
              </button>
            </div>
          </form>
        )}

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
            <span className="bg-white px-4 text-gray-400">Or continue with</span>
          </div>
        </div>

        <div>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="flex w-full justify-center items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}