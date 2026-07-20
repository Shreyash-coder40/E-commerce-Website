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
  const [activeTab, setActiveTab] = useState<"specs" | "reviews" | "qas" | "policies" | "compare">("specs");

  // Price Comparison Hub State
  const [compareData, setCompareData] = useState<any>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareError, setCompareError] = useState("");

  const fetchComparisonData = async () => {
    if (compareData) return; // already loaded
    setLoadingCompare(true);
    setCompareError("");
    try {
      const res = await fetch(`/api/products/${productId}/compare`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load comparison data.");
      setCompareData(data);
    } catch (err: any) {
      setCompareError(err.message || "An error occurred while comparing prices.");
    } finally {
      setLoadingCompare(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === "compare") {
      fetchComparisonData();
    }
  }, [activeTab]);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [revealedReviews, setRevealedReviews] = useState<string[]>([]);

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
    <div className="mt-12 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Tab Navigation header */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50">
        <button
          onClick={() => setActiveTab("specs")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "specs"
              ? "border-[#0077B6] text-[#0077B6] bg-white font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          📋 Specifications
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "reviews"
              ? "border-[#0077B6] text-[#0077B6] bg-white font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          ⭐ Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab("qas")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "qas"
              ? "border-[#0077B6] text-[#0077B6] bg-white font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          ❓ Q&A ({qas.length})
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "policies"
              ? "border-[#0077B6] text-[#0077B6] bg-white font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          🛡️ Return & Policies
        </button>
        <button
          onClick={() => setActiveTab("compare")}
          className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "compare"
              ? "border-[#0077B6] text-[#0077B6] bg-white font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          🔍 Compare Prices
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 sm:p-8">
        {/* PANEL 1: SPECIFICATIONS */}
        {activeTab === "specs" && (
          <div className="space-y-6">
            {isElectronics && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <div>
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Manufacturer Warranty Cover</h4>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {warranty || "1 Year Brand Warranty protection coverage included."}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-base font-black text-slate-900 mb-4">Technical Specifications</h3>
              {hasSpecs ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <tbody>
                      {Object.entries(specsObj).map(([key, val], idx) => (
                        <tr
                          key={key}
                          className={`${
                            idx % 2 === 0 ? "bg-slate-50/50" : "bg-transparent"
                          } border-b border-slate-100 last:border-b-0`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-550 w-1/3">{key}</td>
                          <td className="py-3 px-4 font-semibold text-slate-750">{String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-2xl text-sm text-slate-500">
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
              <div className="w-full md:w-1/3 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                <h3 className="text-base font-black text-slate-900 mb-3">Overall Rating</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#0077B6]">{averageRating}</span>
                  <span className="text-sm text-slate-500 font-bold">out of 5</span>
                </div>
                <div className="mt-2">{renderStars(Math.round(parseFloat(averageRating) || 0))}</div>
                <p className="text-xs text-slate-500 mt-2">Based on {reviews.length} customer ratings</p>
              </div>

              {/* Review Submit Form */}
              <div className="flex-1 w-full bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-4">Write a Product Review</h3>
                {session ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    {reviewError && (
                      <p className="text-xs text-red-700 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                        {reviewError}
                      </p>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
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
                            <span className={star <= reviewRating ? "text-amber-500" : "text-slate-200"}>
                              ★
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Your Feedback comment
                      </label>
                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience using this product..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-5 py-2.5 bg-[#FF6B35] hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-500 font-medium">
                    Please{" "}
                    <a href="/login" className="text-[#0077B6] font-bold hover:underline">
                      Sign In
                    </a>{" "}
                    to leave feedback comments.
                  </p>
                )}
              </div>
            </div>

            {/* Reviews Feed */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">Customer Feedback</h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No customer feedback has been posted yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reviews.map((review) => {
                    const isFlagged = !!review.isSuspicious;
                    const isRevealed = revealedReviews.includes(review.id);
                    return (
                      <div key={review.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">
                              {review.user?.name || "Verified Shopper"}
                            </span>
                            {review.verifiedPurchase && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-md">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                Verified Purchase
                              </span>
                            )}
                            {isFlagged && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-250 px-2 py-0.5 rounded-md">
                                ⚠️ Flagged
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-450 font-medium" suppressHydrationWarning>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                        </div>

                        {isFlagged && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                            <span className="text-sm">⚠️</span>
                            <div className="flex-1 space-y-1">
                              <p className="font-bold">Flagged by AI Security</p>
                              <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                                This review was flagged as suspicious. {review.spamExplanation || "It exhibits bot-like patterns or generic template wording."}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isRevealed) {
                                    setRevealedReviews(revealedReviews.filter(id => id !== review.id));
                                  } else {
                                    setRevealedReviews([...revealedReviews, review.id]);
                                  }
                                }}
                                className="text-[10px] font-extrabold text-[#0077B6] hover:text-[#005f91] underline cursor-pointer mt-1 block"
                              >
                                {isRevealed ? "Hide Content" : "Show Content Anyway"}
                              </button>
                            </div>
                          </div>
                        )}

                        <p className={`text-sm leading-relaxed transition-all duration-300 font-semibold ${
                          isFlagged && !isRevealed 
                            ? "text-slate-300 blur-sm select-none pointer-events-none" 
                            : "text-slate-705 font-medium"
                        }`}>
                          {review.comment}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL 3: Q&A BOX */}
        {activeTab === "qas" && (
          <div className="space-y-8">
            {/* Ask Question Form */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
              <h3 className="text-base font-black text-slate-900 mb-3">Have a Question?</h3>
              {session ? (
                <form onSubmit={handleQuestionSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ask about dimensions, performance, features..."
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/25 focus:border-[#0077B6] transition"
                  />
                  <button
                    type="submit"
                    disabled={submittingQuestion}
                    className="px-5 py-3 bg-[#FF6B35] hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {submittingQuestion ? "Asking..." : "Ask Admin"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-550 font-medium">
                  Please{" "}
                  <a href="/login" className="text-[#0077B6] font-bold hover:underline">
                    Sign In
                    </a>{" "}
                  to write a question.
                </p>
              )}
              {questionError && <p className="text-xs text-red-750 font-bold mt-2">{questionError}</p>}
            </div>

            {/* Q&A Feed */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">Questions & Answers</h3>
              {qas.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No questions have been asked yet.</p>
              ) : (
                <div className="space-y-6">
                  {qas.map((qa) => (
                    <div key={qa.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                      <div>
                        <p className="text-xs text-slate-450 font-bold flex items-center gap-1.5">
                          <span>👤 {qa.user?.name || "Shopper"}</span>
                          <span>•</span>
                          <span suppressHydrationWarning>{new Date(qa.createdAt).toLocaleDateString()}</span>
                        </p>
                        <p className="text-sm font-bold text-slate-900 mt-1">Q: {qa.question}</p>
                      </div>
                      <div className="pl-4 border-l-2 border-[#0077B6] bg-slate-50 p-3 rounded-r-xl border border-slate-200">
                        {qa.answer ? (
                          <>
                            <p className="text-xs text-[#0077B6] font-bold">📢 Seller Support Answer:</p>
                            <p className="text-sm text-slate-700 mt-0.5 font-medium">{qa.answer}</p>
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
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <span className="text-3xl">🔄</span>
              <h4 className="text-base font-black text-slate-900">Return & Replacement Policy</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                {isElectronics
                  ? "7 Days Replacement Policy. Eligible for replacement within 7 days of delivery only in case of manufacturer defect, hardware malfunction, or shipping damages."
                  : "10 Days Return & Exchange. Size or style fit replacement. Full refund available if returned in original condition with tags intact."}
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <span className="text-3xl">🚚</span>
              <h4 className="text-base font-black text-slate-900">Shipping & Delivery Policies</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Free standard shipping across India. Orders are processed within 24 hours. Transit takes 3-5 business days. Real-time courier SMS updates will be shared once shipped.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <span className="text-3xl">🔒</span>
              <h4 className="text-base font-black text-slate-900">100% Encrypted Transactions</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                We safeguard your payment data via Razorpay tokenized routing. Supports standard credit/debit cards, Net Banking, and instant UPI. No credentials are saved on store databases.
              </p>
            </div>
          </div>
        )}

        {/* PANEL 5: CROSS-WEB PRICE COMPARISON */}
        {activeTab === "compare" && (
          <div className="space-y-8 animate-fadeIn">
            {/* AI Recommendation Verdict Banner */}
            {compareData && (
              <div className="p-6 bg-indigo-50 border border-indigo-200 rounded-3xl relative overflow-hidden shadow-xs">
                {/* Visual neon indicator light */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white border border-indigo-200 px-2.5 py-1 rounded-full text-[10px] font-black text-indigo-700 uppercase tracking-widest shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                  Gemini AI Verdict
                </div>
                <div className="text-slate-700 text-sm leading-relaxed prose font-semibold max-w-none">
                  {/* Clean custom rendering for basic markdown tags */}
                  {compareData.recommendation.split("\n").map((para: string, idx: number) => {
                    if (!para.trim()) return null;
                    const cleanText = para.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                    return (
                      <p 
                        key={idx} 
                        className="mb-2 last:mb-0" 
                        dangerouslySetInnerHTML={{ __html: cleanText }} 
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Message */}
            {compareError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-semibold">
                ⚠️ {compareError}
              </div>
            )}

            {/* Loading Spinner */}
            {loadingCompare && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-t-2 border-[#0077B6] border-r-2 border-transparent animate-spin"></div>
                  <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-[#0077B6]/10"></div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 tracking-wide">Syncing Real-Time Market Prices...</p>
                  <p className="text-xs text-slate-500 mt-1">Calling Google Shopping API & Gemini matching engines</p>
                </div>
              </div>
            )}

            {/* Side-by-Side Pricing Matrix Card Grid */}
            {compareData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. OUR PRODUCT (NextShop) - Highlighted card */}
                <div className="bg-white border-2 border-[#0077B6] rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:scale-[1.02] transition relative group">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#0077B6] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-xs z-10">
                    Our Store
                  </div>
                  <div>
                    <div className="relative aspect-square w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 mb-4 flex items-center justify-center p-3">
                      <img 
                        src={compareData.ourProduct.image} 
                        alt={compareData.ourProduct.name} 
                        className="object-contain max-h-full max-w-full p-1"
                      />
                    </div>
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase tracking-wider rounded border border-indigo-200 mb-2">
                      NextShop Storefront
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">
                      {compareData.ourProduct.name}
                    </h4>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="text-2xl font-black text-[#0077B6] tracking-tight">
                      ₹{Number(compareData.ourProduct.price).toLocaleString("en-IN")}
                    </p>
                    <div className="mt-3 w-full py-2.5 text-center bg-indigo-50 text-indigo-755 border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wide">
                      Selected Offer
                    </div>
                  </div>
                </div>

                {/* 2. Competitors (Amazon, Flipkart, Meesho) */}
                {compareData.competitors.map((comp: any) => {
                  let brandColorText = "text-amber-700 border-amber-200 bg-amber-50";
                  let brandBtnStyle = "bg-amber-600 hover:bg-amber-500";
                  
                  if (comp.site === "Flipkart") {
                    brandColorText = "text-blue-700 border-blue-200 bg-blue-50";
                    brandBtnStyle = "bg-blue-600 hover:bg-blue-550";
                  } else if (comp.site === "Meesho") {
                    brandColorText = "text-pink-700 border-pink-200 bg-pink-50";
                    brandBtnStyle = "bg-pink-650 hover:bg-pink-550";
                  }

                  return (
                    <div key={comp.site} className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between hover:scale-[1.02] transition group">
                      <div>
                        <div className="relative aspect-square w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 mb-4 flex items-center justify-center p-3">
                          <img 
                            src={comp.image} 
                            alt={comp.name} 
                            className="object-contain max-h-full max-w-full p-1"
                          />
                        </div>
                        <span className={`inline-block px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider rounded border ${brandColorText} mb-2`}>
                          {comp.site} Verified
                        </span>
                        <h4 className="text-sm font-bold text-slate-700 line-clamp-2 leading-tight group-hover:text-slate-900 transition">
                          {comp.name}
                        </h4>
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                          ₹{Number(comp.price).toLocaleString("en-IN")}
                        </p>
                        <a
                          href={comp.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-3 block w-full py-2.5 text-center text-white font-extrabold rounded-xl text-xs transition shadow-xs tracking-wide active:scale-[0.98] ${brandBtnStyle}`}
                        >
                          🔗 View Deal
                        </a>
                      </div>
                    </div>
                  );
                })}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
