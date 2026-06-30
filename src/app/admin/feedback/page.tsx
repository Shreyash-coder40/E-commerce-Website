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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">Storewide Customer Feedback</h1>
            <p className="text-sm text-gray-600 mt-1">
              Monitor latest shopper reviews, answer customer product questions, and manage storefront reputation.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition w-fit"
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
