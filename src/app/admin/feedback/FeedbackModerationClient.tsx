"use client";

import React, { useState } from "react";
import Link from "next/link";

interface UserCompact {
  name: string | null;
  email: string;
}

interface ProductCompact {
  id: string;
  name: string;
  images: string[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  productId: string;
  user: UserCompact;
  product: ProductCompact;
}

interface QuestionAnswer {
  id: string;
  question: string;
  answer: string | null;
  createdAt: string | Date;
  productId: string;
  user: UserCompact;
  product: ProductCompact;
}

interface FeedbackModerationClientProps {
  initialReviews: Review[];
  initialQas: QuestionAnswer[];
}

export default function FeedbackModerationClient({
  initialReviews,
  initialQas,
}: FeedbackModerationClientProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [qas, setQas] = useState<QuestionAnswer[]>(initialQas);
  const [activeTab, setActiveTab] = useState<"reviews" | "qas">("reviews");
  const [qaFilter, setQaFilter] = useState<"all" | "pending" | "answered">("all");

  // Track which question IDs are currently in "answering" or "editing" mode
  const [editingQaId, setEditingQaId] = useState<string | null>(null);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Stats Calculations
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : "0.0";
  const unansweredQasCount = qas.filter((q) => !q.answer).length;

  // Filtered Q&A list
  const filteredQas = qas.filter((q) => {
    if (qaFilter === "pending") return !q.answer;
    if (qaFilter === "answered") return !!q.answer;
    return true;
  });

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
      {/* 3-Column Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-slate-550 uppercase tracking-wider">Total Customer Reviews</p>
          <h3 className="text-3xl font-black text-[#0077B6] mt-2">{totalReviews}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Submitted across all items</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-slate-555 uppercase tracking-wider">Average Store Rating</p>
          <h3 className="text-3xl font-black text-amber-600 mt-2">★ {avgRating} / 5</h3>
          <p className="text-[11px] text-slate-500 mt-1">Weighted customer satisfaction</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-slate-555 uppercase tracking-wider">Unanswered Questions</p>
          <h3 className={`text-3xl font-black mt-2 ${unansweredQasCount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {unansweredQasCount}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Pending seller responses</p>
        </div>
      </div>

      {/* Main Moderation View Tabbed Panels */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex-1 py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
              activeTab === "reviews"
                ? "border-[#0077B6] text-[#0077B6] bg-white font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            ⭐ Customer Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab("qas")}
            className={`flex-1 py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
              activeTab === "qas"
                ? "border-[#0077B6] text-[#0077B6] bg-white font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            ❓ Customer Q&A Box ({qas.length})
          </button>
        </div>

        {/* Tab Panel Content */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1: REVIEWS FEED */}
          {activeTab === "reviews" && (
            <div>
              {reviews.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  No shopper reviews have been registered yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Top Product Header */}
                        <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                          <img
                            src={review.product?.images?.[0] || "https://placehold.co/80"}
                            alt=""
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-white flex-shrink-0"
                          />
                          <div className="truncate">
                            <Link
                              href={`/products/${review.productId}`}
                              className="font-bold text-xs text-slate-900 hover:text-[#0077B6] hover:underline line-clamp-1"
                            >
                              {review.product?.name}
                            </Link>
                            <span className="text-[10px] text-slate-500 font-semibold">ID: {review.product?.id}</span>
                          </div>
                        </div>

                        {/* Customer Meta & Stars */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-extrabold text-sm text-slate-900">
                              {review.user?.name || "Shopper"}
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold">{review.user?.email}</p>
                          </div>
                          <span className="text-[10px] text-slate-450 font-semibold whitespace-nowrap" suppressHydrationWarning>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {renderStars(review.rating)}
                        <p className="text-sm text-slate-700 font-semibold whitespace-pre-wrap leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUESTIONS & ANSWERS FEED */}
          {activeTab === "qas" && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="flex gap-2 border-b pb-4 border-slate-200 flex-wrap">
                <button
                  onClick={() => setQaFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    qaFilter === "all" ? "bg-[#0077B6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Questions ({qas.length})
                </button>
                <button
                  onClick={() => setQaFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    qaFilter === "pending" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 border border-rose-250 hover:bg-rose-100"
                  }`}
                >
                  Pending Response ({unansweredQasCount})
                </button>
                <button
                  onClick={() => setQaFilter("answered")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    qaFilter === "answered" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100"
                  }`}
                >
                  Answered ({qas.length - unansweredQasCount})
                </button>
              </div>

              {filteredQas.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  No shopper questions found for the selected filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredQas.map((qa) => (
                    <div
                      key={qa.id}
                      className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between"
                    >
                      <div>
                        {/* Top section: Product reference & Meta */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={qa.product?.images?.[0] || "https://placehold.co/80"}
                              alt=""
                              className="w-12 h-12 object-cover rounded-xl border border-slate-200 bg-white flex-shrink-0"
                            />
                            <div>
                              <Link
                                href={`/products/${qa.productId}`}
                                className="font-bold text-xs text-slate-900 hover:text-[#0077B6] hover:underline line-clamp-1"
                              >
                                {qa.product?.name}
                              </Link>
                              <span className="text-[10px] text-slate-500 font-semibold">ID: {qa.productId}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              qa.answer
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-250"
                                : "bg-rose-50 text-rose-700 border border-rose-250"
                            }`}
                          >
                            {qa.answer ? "ANSWERED" : "PENDING"}
                          </span>
                        </div>

                        {/* Question Content */}
                        <div className="flex justify-between items-start gap-4 mt-3">
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
                      </div>

                      {/* Answer Section */}
                      {editingQaId === qa.id ? (
                        <div className="space-y-3 pt-2">
                          <textarea
                            rows={2}
                            value={answerInputs[qa.id] || ""}
                            onChange={(e) =>
                              setAnswerInputs({ ...answerInputs, [qa.id]: e.target.value })
                            }
                            placeholder="Write the official response here..."
                            className="w-full p-3 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingQaId(null)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-650 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-50 transition"
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
                        <div className="pl-4 border-l-2 border-[#0077B6] bg-white p-3 rounded-r-xl border border-slate-200 flex justify-between items-start gap-4 mt-2">
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
          )}
        </div>
      </div>
    </div>
  );
}
