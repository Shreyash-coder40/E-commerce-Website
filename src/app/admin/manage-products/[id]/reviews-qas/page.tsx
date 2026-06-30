import React from "react";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import ReviewsQasAdminClient from "./ReviewsQasAdminClient";

export const revalidate = 0;

interface AdminReviewsQasPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminReviewsQasPage({ params }: AdminReviewsQasPageProps) {
  // 1. Secure Authentication & Admin check
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!isAdmin) {
    redirect("/");
  }

  // Await dynamic params
  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    notFound();
  }

  // 2. Fetch product details
  const productRaw = await db.product.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      images: true,
    },
  });

  if (!productRaw) {
    notFound();
  }

  // 3. Fetch all reviews for this product
  const reviews = await db.review.findMany({
    where: { productId: resolvedParams.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // 4. Fetch all Q&As for this product
  const qas = await db.questionAnswer.findMany({
    where: { productId: resolvedParams.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-950 tracking-tight">Product Feedback Moderation</h1>
          <p className="text-sm text-gray-600 mt-1">
            Read shopper feedback comments, inspect star ratings, and answer product queries.
          </p>
        </div>

        {/* Inject Interactive Admin Feed Handler */}
        <ReviewsQasAdminClient
          product={productRaw}
          initialReviews={reviews}
          initialQas={qas}
        />
      </div>
    </div>
  );
}
