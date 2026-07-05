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
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={product.images?.[0] || "https://placehold.co/100"}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-2xl border border-slate-800"
          />
          <div>
            <span className="text-[10px] bg-indigo-950/40 text-indigo-400 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-indigo-900/30">
              {product.category}
            </span>
            <h2 className="text-lg font-black text-white mt-1">{product.name}</h2>
            <p className="text-xs text-slate-500 font-medium">Product ID: {product.id}</p>
          </div>
        </div>
        <Link
          href="/admin/manage-products"
          className="text-xs font-bold text-slate-300 bg-slate-800/40 border border-slate-700/60 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-800 hover:text-white transition w-full md:w-auto text-center backdrop-blur-md"
        >
          ← Back to Inventory
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PANEL 1: REVIEWS MODERATION */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-white border-b border-slate-800/60 pb-2 flex items-center justify-between">
            <span>⭐ Customer Reviews</span>
            <span className="text-xs bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 px-2 py-1 rounded-lg">
              {reviews.length} total
            </span>
          </h3>

          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">
              No customer feedback has been posted for this product.
            </p>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-white">
                        {review.user?.name || "Verified Shopper"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">{review.user?.email}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold" suppressHydrationWarning>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {renderStars(review.rating)}
                  <p className="text-sm text-slate-300 font-semibold whitespace-pre-wrap">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANEL 2: QUESTIONS & ANSWERS MODERATION */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-white border-b border-slate-800/60 pb-2 flex items-center justify-between">
            <span>❓ Customer Q&A Box</span>
            <span className="text-xs bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2 py-1 rounded-lg">
              {qas.length} total
            </span>
          </h3>

          {error && (
            <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl font-bold">
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
                  className="p-5 bg-slate-950/20 border border-slate-800/80 rounded-2xl shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                        <span>👤 {qa.user?.name || "Shopper"}</span>
                        <span>•</span>
                        <span>{qa.user?.email}</span>
                      </p>
                      <p className="text-sm font-bold text-white mt-1">Q: {qa.question}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap" suppressHydrationWarning>
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
                        className="w-full p-3 bg-slate-950/45 border border-slate-800 rounded-xl text-sm text-white font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-slate-950/80 transition"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingQaId(null)}
                          className="px-3 py-1.5 bg-slate-950/40 hover:bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAnswerSubmit(qa.id)}
                          disabled={submittingId === qa.id}
                          className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                          {submittingId === qa.id ? "Saving..." : "Save Answer"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display and actions */
                    <div className="pl-4 border-l-2 border-indigo-500 bg-slate-950/40 p-3 rounded-r-xl border border-y-slate-800/80 border-r-slate-800/80 flex justify-between items-start gap-4">
                      <div className="flex-1">
                        {qa.answer ? (
                          <>
                            <p className="text-xs text-indigo-400 font-bold">📢 Answered:</p>
                            <p className="text-sm text-slate-350 font-medium mt-0.5">{qa.answer}</p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            Awaiting response from Seller Support.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => startAnswering(qa)}
                        className="text-xs font-bold text-indigo-400 bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-900/30 px-2.5 py-1 rounded transition cursor-pointer"
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
