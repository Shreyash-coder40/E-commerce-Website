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
    <div className="space-y-8">
      {/* Back & Info Banner Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={product.images?.[0] || "https://placehold.co/100"}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-2xl border"
          />
          <div>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              {product.category}
            </span>
            <h2 className="text-lg font-black text-gray-950 mt-1">{product.name}</h2>
            <p className="text-xs text-gray-500 font-medium">Product ID: {product.id}</p>
          </div>
        </div>
        <Link
          href="/admin/manage-products"
          className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition w-full md:w-auto text-center"
        >
          ← Back to Inventory
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PANEL 1: REVIEWS MODERATION */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-gray-950 border-b pb-2 flex items-center justify-between">
            <span>⭐ Customer Reviews</span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
              {reviews.length} total
            </span>
          </h3>

          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500 py-12 text-center">
              No customer feedback has been posted for this product.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-gray-950">
                        {review.user?.name || "Verified Shopper"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">{review.user?.email}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold" suppressHydrationWarning>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {renderStars(review.rating)}
                  <p className="text-sm text-black font-semibold whitespace-pre-wrap">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANEL 2: QUESTIONS & ANSWERS MODERATION */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-gray-950 border-b pb-2 flex items-center justify-between">
            <span>❓ Customer Q&A Box</span>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
              {qas.length} total
            </span>
          </h3>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-650 text-xs rounded-xl font-bold">
              ⚠️ {error}
            </div>
          )}

          {qas.length === 0 ? (
            <p className="text-sm text-gray-500 py-12 text-center">
              No customer questions have been asked for this product.
            </p>
          ) : (
            <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2">
              {qas.map((qa) => (
                <div
                  key={qa.id}
                  className="p-5 bg-gray-50/50 border border-gray-150 rounded-2xl shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                        <span>👤 {qa.user?.name || "Shopper"}</span>
                        <span>•</span>
                        <span>{qa.user?.email}</span>
                      </p>
                      <p className="text-sm font-bold text-gray-950 mt-1">Q: {qa.question}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold whitespace-nowrap" suppressHydrationWarning>
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
                        className="w-full p-3 border border-gray-250 bg-white rounded-xl text-sm text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingQaId(null)}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAnswerSubmit(qa.id)}
                          disabled={submittingId === qa.id}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
                        >
                          {submittingId === qa.id ? "Saving..." : "Save Answer"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display and actions */
                    <div className="pl-4 border-l-2 border-indigo-600 bg-white p-3 rounded-r-xl flex justify-between items-start gap-4">
                      <div className="flex-1">
                        {qa.answer ? (
                          <>
                            <p className="text-xs text-indigo-600 font-bold">📢 Answered:</p>
                            <p className="text-sm text-gray-700 font-medium mt-0.5">{qa.answer}</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            Awaiting response from Seller Support.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => startAnswering(qa)}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition"
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
