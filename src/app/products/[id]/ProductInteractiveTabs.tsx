"use client";

import React, { useState } from "react";

interface UserCompact {
  name: string | null;
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

interface ProductInteractiveTabsProps {
  productId: string;
  initialReviews: Review[];
  initialQas: QuestionAnswer[];
  specifications: any;
  warranty: string | null;
  category: string;
  session: any;
}

export default function ProductInteractiveTabs({
  productId,
  initialReviews,
  initialQas,
  specifications,
  warranty,
  category,
  session,
}: ProductInteractiveTabsProps) {
  const [activeTab, setActiveTab] = useState<"specs" | "reviews" | "qas" | "policies">("specs");

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Q&A State
  const [qas, setQas] = useState<QuestionAnswer[]>(initialQas);
  const [newQuestion, setNewQuestion] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState("");

  // Calculate Average Rating
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "No reviews yet";

  // Check if product is in Electronic category
  const isElectronics = ["Mobiles", "Audio", "Electronics"].includes(category);

  // Specifications Parsing
  const specsObj = specifications && typeof specifications === "object" ? specifications : {};
  const hasSpecs = Object.keys(specsObj).length > 0;

  // Star Rating Helper
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (reviewComment.trim().length === 0) {
      setReviewError("Please write your comment.");
      return;
    }

    setSubmittingReview(true);
    setReviewError("");

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review.");
      }

      setReviews([data.review, ...reviews]);
      setReviewComment("");
      setReviewRating(5);
    } catch (err: any) {
      setReviewError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (newQuestion.trim().length === 0) {
      setQuestionError("Please type a question.");
      return;
    }

    setSubmittingQuestion(true);
    setQuestionError("");

    try {
      const response = await fetch(`/api/products/${productId}/qas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit question.");
      }

      setQas([data.qa, ...qas]);
      setNewQuestion("");
    } catch (err: any) {
      setQuestionError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  return (
    <div className="mt-12 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Tab Navigation header */}
      <div className="flex border-b border-slate-800 overflow-x-auto bg-slate-900/60">
        <button
          onClick={() => setActiveTab("specs")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "specs"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40"
          }`}
        >
          📋 Specifications
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "reviews"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40"
          }`}
        >
          ⭐ Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab("qas")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "qas"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40"
          }`}
        >
          ❓ Q&A ({qas.length})
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "policies"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40"
          }`}
        >
          🛡️ Return & Policies
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 sm:p-8">
        {/* PANEL 1: SPECIFICATIONS */}
        {activeTab === "specs" && (
          <div className="space-y-6">
            {isElectronics && (
              <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Manufacturer Warranty Cover</h4>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">
                    {warranty || "1 Year Brand Warranty protection coverage included."}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-base font-black text-white mb-4">Technical Specifications</h3>
              {hasSpecs ? (
                <div className="border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <tbody>
                      {Object.entries(specsObj).map(([key, val], idx) => (
                        <tr
                          key={key}
                          className={`${
                            idx % 2 === 0 ? "bg-slate-950/20" : "bg-transparent"
                          } border-b border-slate-800/60 last:border-b-0`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-400 w-1/3">{key}</td>
                          <td className="py-3 px-4 font-semibold text-slate-200">{String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-950/20 rounded-2xl text-sm text-slate-500">
                  No technical parameters detailed for this catalog listing.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL 2: CUSTOMER REVIEWS */}
        {activeTab === "reviews" && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Summary Stats */}
              <div className="w-full md:w-1/3 bg-slate-950/30 border border-slate-800/80 p-6 rounded-2xl">
                <h3 className="text-base font-black text-white mb-3">Overall Rating</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-indigo-400">{averageRating}</span>
                  <span className="text-sm text-slate-400 font-bold">out of 5</span>
                </div>
                <div className="mt-2">{renderStars(Math.round(parseFloat(averageRating) || 0))}</div>
                <p className="text-xs text-slate-500 mt-2">Based on {reviews.length} customer ratings</p>
              </div>

              {/* Review Submit Form */}
              <div className="flex-1 w-full bg-slate-950/30 border border-slate-800/80 p-6 rounded-2xl shadow-sm">
                <h3 className="text-base font-black text-white mb-4">Write a Product Review</h3>
                {session ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    {reviewError && (
                      <p className="text-xs text-red-400 font-semibold bg-red-950/20 p-2 rounded-lg border border-red-900/30">
                        {reviewError}
                      </p>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Select Rating Star
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="text-2xl transition hover:scale-110 cursor-pointer"
                          >
                            <span className={star <= reviewRating ? "text-amber-500" : "text-slate-800"}>
                              ★
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Your Feedback comment
                      </label>
                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience using this product..."
                        className="w-full px-4 py-3 bg-slate-950/45 border border-slate-800 rounded-xl text-sm text-white font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-slate-950/80 transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-400 font-medium">
                    Please{" "}
                    <a href="/login" className="text-indigo-400 font-bold hover:underline">
                      Sign In
                    </a>{" "}
                    to leave feedback comments.
                  </p>
                )}
              </div>
            </div>

            {/* Reviews Feed */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-white border-b border-slate-800/60 pb-2">Customer Feedback</h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No customer feedback has been posted yet.</p>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {reviews.map((review) => (
                    <div key={review.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-white">
                          {review.user?.name || "Verified Shopper"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium" suppressHydrationWarning>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {renderStars(review.rating)}
                      <p className="text-sm text-slate-350 whitespace-pre-wrap">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL 3: Q&A BOX */}
        {activeTab === "qas" && (
          <div className="space-y-8">
            {/* Ask Question Form */}
            <div className="bg-slate-950/30 border border-slate-800/80 p-6 rounded-2xl">
              <h3 className="text-base font-black text-white mb-3">Have a Question?</h3>
              {session ? (
                <form onSubmit={handleQuestionSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ask about dimensions, performance, features..."
                    className="flex-1 px-4 py-3 bg-slate-950/45 border border-slate-800 rounded-xl text-sm text-white font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-slate-950/80 transition"
                  />
                  <button
                    type="submit"
                    disabled={submittingQuestion}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {submittingQuestion ? "Asking..." : "Ask Admin"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-400 font-medium">
                  Please{" "}
                  <a href="/login" className="text-indigo-400 font-bold hover:underline">
                    Sign In
                  </a>{" "}
                  to write a question.
                </p>
              )}
              {questionError && <p className="text-xs text-red-400 font-bold mt-2">{questionError}</p>}
            </div>

            {/* Q&A Feed */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-white border-b border-slate-800/60 pb-2">Questions & Answers</h3>
              {qas.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No questions have been asked yet.</p>
              ) : (
                <div className="space-y-6">
                  {qas.map((qa) => (
                    <div key={qa.id} className="p-5 bg-slate-950/30 border border-slate-800/80 rounded-2xl shadow-sm space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                          <span>👤 {qa.user?.name || "Shopper"}</span>
                          <span>•</span>
                          <span suppressHydrationWarning>{new Date(qa.createdAt).toLocaleDateString()}</span>
                        </p>
                        <p className="text-sm font-bold text-white mt-1">Q: {qa.question}</p>
                      </div>
                      <div className="pl-4 border-l-2 border-indigo-500 bg-slate-950/40 p-3 rounded-r-xl border border-y-slate-800/80 border-r-slate-800/80">
                        {qa.answer ? (
                          <>
                            <p className="text-xs text-indigo-400 font-bold">📢 Seller Support Answer:</p>
                            <p className="text-sm text-slate-350 mt-0.5">{qa.answer}</p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            Awaiting response from Seller/Admin Support team.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL 4: POLICIES */}
        {activeTab === "policies" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-950/30 border border-slate-800/80 rounded-2xl shadow-sm space-y-3">
              <span className="text-3xl">🔄</span>
              <h4 className="text-base font-black text-white">Return & Replacement Policy</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isElectronics
                  ? "7 Days Replacement Policy. Eligible for replacement within 7 days of delivery only in case of manufacturer defect, hardware malfunction, or shipping damages."
                  : "10 Days Return & Exchange. Size or style fit replacement. Full refund available if returned in original condition with tags intact."}
              </p>
            </div>

            <div className="p-6 bg-slate-950/30 border border-slate-800/80 rounded-2xl shadow-sm space-y-3">
              <span className="text-3xl">🚚</span>
              <h4 className="text-base font-black text-white">Shipping & Delivery Policies</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Free standard shipping across India. Orders are processed within 24 hours. Transit takes 3-5 business days. Real-time courier SMS updates will be shared once shipped.
              </p>
            </div>

            <div className="p-6 bg-slate-950/30 border border-slate-800/80 rounded-2xl shadow-sm space-y-3">
              <span className="text-3xl">🔒</span>
              <h4 className="text-base font-black text-white">100% Encrypted Transactions</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                We safeguard your payment data via Razorpay tokenized routing. Supports standard credit/debit cards, Net Banking, and instant UPI. No credentials are saved on store databases.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
