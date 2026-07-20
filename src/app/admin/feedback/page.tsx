import React from "react";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import FeedbackModerationClient from "./FeedbackModerationClient";

export const revalidate = 0;

export default async function AdminFeedbackPage() {
  // 1. Secure Authentication & Admin check
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!isAdmin) {
    redirect("/");
  }

  // 2. Fetch all reviews across all products
  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
    },
  });

  // 3. Fetch all Q&As across all products
  const qas = await db.questionAnswer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Huge Semi-Transparent Logo Watermark in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        <div className="text-[12vw] font-black tracking-tighter text-indigo-500/[0.04] rotate-12 flex items-center gap-4 whitespace-nowrap">
          <span>🛒</span> NEXT<span>SHOP</span>
        </div>
      </div>

      {/* Glowing Ambient Background Orbs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-indigo-500/[0.04] rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-500/[0.04] rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-orange-500/[0.02] rounded-full blur-3xl animate-pulse" />
      
      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Storewide Customer Feedback</h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor latest shopper reviews, answer customer product questions, and manage storefront reputation.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs hover:bg-slate-50 hover:text-slate-900 transition w-fit"
          >
            🏠 Back to Home
          </Link>
        </div>

        {/* Inject Interactive Admin Feed Handler */}
        <FeedbackModerationClient initialReviews={reviews} initialQas={qas} />
      </div>
    </div>
  );
}
