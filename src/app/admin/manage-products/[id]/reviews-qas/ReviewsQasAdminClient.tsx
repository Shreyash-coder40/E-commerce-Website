"use client";

import React, { useState } from "react";
import Link from "next/link";

interface UserCompact {
  name: string | null;
  email: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  user: UserCompact;
  verifiedPurchase?: boolean;
  isSuspicious?: boolean;
  spamExplanation?: string | null;
}

interface QuestionAnswer {
  id: string;
  question: string;
  answer: string | null;
  createdAt: string | Date;
  user: UserCompact;
}

interface ProductDetails {
  id: string;
  name: string;
  category: string;
  price: number;
  images: string[];
}

interface ReviewsQasAdminClientProps {
  product: ProductDetails;
  initialReviews: Review[];
  initialQas: QuestionAnswer[];
}

export default function ReviewsQasAdminClient({
  product,
  initialReviews,
  initialQas,
}: ReviewsQasAdminClientProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [qas, setQas] = useState<QuestionAnswer[]>(initialQas);
  
  // Track which question IDs are currently in "answering" or "editing" mode
  const [editingQaId, setEditingQaId] = useState<string | null>(null);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleReviewDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete review.");
      }
      setReviews(reviews.filter((r) => r.id !== reviewId));
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting the review.");
    }
  };

  const startAnswering = (qa: QuestionAnswer) => {
    setEditingQaId(qa.id);
    setAnswerInputs({
      ...answerInputs,
      [qa.id]: qa.answer || "",
    });
    setError("");
  };

  const handleAnswerSubmit = async (qaId: string) => {
    const text = answerInputs[qaId] || "";
    if (text.trim().length === 0) {
      setError("Please write an answer before submitting.");
      return;
    }

    setSubmittingId(qaId);
    setError("");

    try {
      const response = await fetch(`/api/qas/${qaId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit answer.");
      }

      // Update local state
      setQas(
        qas.map((qa) =>
          qa.id === qaId ? { ...qa, answer: text.trim() } : qa
        )
      );
      setEditingQaId(null);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingId(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="text-sm">
            {i < rating ? "★" : "☆"}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Back & Info Banner Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={product.images?.[0] || "https://placehold.co/100"}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-2xl border border-slate-200"
          />
          <div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-indigo-200">
              {product.category}
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-1">{product.name}</h2>
            <p className="text-xs text-slate-500 font-medium">Product ID: {product.id}</p>
          </div>
        </div>
        <Link
          href="/admin/manage-products"
          className="text-xs font-bold text-slate-650 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 hover:text-slate-900 transition w-full md:w-auto text-center"
        >
          ← Back to Inventory
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PANEL 1: REVIEWS MODERATION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>⭐ Customer Reviews</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-lg">
              {reviews.length} total
            </span>
          </h3>

          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">
              No customer feedback has been posted for this product.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {reviews.map((review) => {
                const isFlagged = !!review.isSuspicious;
                return (
                  <div 
                    key={review.id} 
                    className={`py-4 px-4 rounded-2xl first:pt-4 last:pb-4 space-y-3 border transition ${
                      isFlagged 
                        ? "bg-rose-50/50 border-rose-200" 
                        : "bg-slate-50 border-transparent hover:border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-slate-900">
                            {review.user?.name || "Verified Shopper"}
                          </p>
                          {review.verifiedPurchase && (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 px-1.5 py-0.5 rounded">
                              ✓ Verified
                            </span>
                          )}
                          {isFlagged && (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-rose-700 bg-rose-50 border border-rose-250 px-1.5 py-0.5 rounded animate-pulse">
                              ⚠️ Suspicious
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{review.user?.email}</p>
                      </div>
                      <span className="text-[10px] text-slate-450 font-semibold" suppressHydrationWarning>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-4">
                      {renderStars(review.rating)}
                      <button
                        onClick={() => handleReviewDelete(review.id)}
                        className="text-[10px] font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-105 border border-rose-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        Delete Review
                      </button>
                    </div>

                    <p className="text-sm text-slate-700 font-semibold whitespace-pre-wrap leading-relaxed">{review.comment}</p>

                    {isFlagged && (
                      <div className="bg-rose-50 border border-rose-250 rounded-xl p-3 text-[11px] text-rose-700 space-y-0.5 leading-relaxed">
                        <p className="font-bold text-xs">⚠️ AI Spam Inspector Flagged:</p>
                        <p className="text-rose-700 font-medium">
                          {review.spamExplanation || "Identified mismatch, advertising template, or repetitive text pattern."}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PANEL 2: QUESTIONS & ANSWERS MODERATION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>❓ Customer Q&A Box</span>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg">
              {qas.length} total
            </span>
          </h3>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              ⚠️ {error}
            </div>
          )}

          {qas.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">
              No customer questions have been asked for this product.
            </p>
          ) : (
            <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2">
              {qas.map((qa) => (
                <div
                  key={qa.id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                        <span>👤 {qa.user?.name || "Shopper"}</span>
                        <span>•</span>
                        <span>{qa.user?.email}</span>
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">Q: {qa.question}</p>
                    </div>
                    <span className="text-[10px] text-slate-450 font-semibold whitespace-nowrap" suppressHydrationWarning>
                      {new Date(qa.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {editingQaId === qa.id ? (
                    /* Answering / Editing Form */
                    <div className="space-y-3 pt-2">
                      <textarea
                        rows={2}
                        value={answerInputs[qa.id] || ""}
                        onChange={(e) =>
                          setAnswerInputs({ ...answerInputs, [qa.id]: e.target.value })
                        }
                        placeholder="Write the official response here..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] transition"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingQaId(null)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-650 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAnswerSubmit(qa.id)}
                          disabled={submittingId === qa.id}
                          className="px-3 py-1.5 bg-[#0077B6] hover:bg-[#005f91] text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                        >
                          {submittingId === qa.id ? "Saving..." : "Save Answer"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display and actions */
                    <div className="pl-4 border-l-2 border-[#0077B6] bg-white p-3 rounded-r-xl border border-slate-200 flex justify-between items-start gap-4">
                      <div className="flex-1">
                        {qa.answer ? (
                          <>
                            <p className="text-xs text-[#0077B6] font-bold">📢 Answered:</p>
                            <p className="text-sm text-slate-700 font-medium mt-0.5">{qa.answer}</p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            Awaiting response from Seller Support.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => startAnswering(qa)}
                        className="text-xs font-bold text-[#0077B6] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded transition cursor-pointer"
                      >
                        {qa.answer ? "Edit" : "Answer"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
