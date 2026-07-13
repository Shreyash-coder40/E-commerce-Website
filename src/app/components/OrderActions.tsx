"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface OrderActionsProps {
  order: any;
}

export default function OrderActions({ order }: OrderActionsProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Cancellation states
  const [cancelReason, setCancelReason] = useState("Order placed by mistake");
  const [cancelDescription, setCancelDescription] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Return states
  const [returnReason, setReturnReason] = useState("Defective or damaged product");
  const [returnDescription, setReturnDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const handleOpenCancel = () => {
    setCancelReason("Order placed by mistake");
    setCancelDescription("");
    setImageFile(null);
    setImageUrl(null);
    setShowCancelModal(true);
  };

  const handleOpenReturn = () => {
    setReturnReason("Defective or damaged product");
    setReturnDescription("");
    setImageFile(null);
    setImageUrl(null);
    setShowReturnModal(true);
  };

  // Check cancellation eligibility (PENDING or PROCESSING)
  const canCancel = ["PENDING", "PROCESSING"].includes(order.status);

  // Check return eligibility (DELIVERED and within 7 days of delivery / updatedAt)
  const isDelivered = order.status === "DELIVERED";
  const deliveryDate = new Date(order.updatedAt);
  const daysSinceDelivery = (new Date().getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
  const canReturn = isDelivered && daysSinceDelivery <= 7;

  // Handle image upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      setImageUrl(data.url);
    } catch (err: any) {
      alert(`Image upload error: ${err.message}`);
      setImageFile(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Submit Cancellation Request
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCancelling(true);

    try {
      const reasonText = `Reason: ${cancelReason} | Description: ${cancelDescription}${imageUrl ? ` | Image: ${imageUrl}` : ""}`;
      const res = await fetch(`/api/orders/${order.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CANCEL",
          reason: reasonText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit cancellation request.");
      }

      alert("Cancellation request submitted successfully!");
      setShowCancelModal(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  // Submit Return Request
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReturning(true);

    try {
      const reasonText = `Reason: ${returnReason} | Description: ${returnDescription}${imageUrl ? ` | Image: ${imageUrl}` : ""}`;
      const res = await fetch(`/api/orders/${order.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "RETURN",
          reason: reasonText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit return request.");
      }

      alert("Return request submitted successfully!");
      setShowReturnModal(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsReturning(false);
    }
  };

  // Skip rendering actions if neither button should be active
  if (!canCancel && !canReturn) return null;

  return (
    <div className="flex gap-2 items-center flex-wrap pt-4 border-t border-gray-100 mt-4">
      {canCancel && (
        <button
          onClick={handleOpenCancel}
          className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2.5 rounded-xl shadow-sm border border-rose-100 transition duration-200 cursor-pointer"
        >
          🚫 Cancel Order
        </button>
      )}

      {canReturn && (
        <button
          onClick={handleOpenReturn}
          className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl shadow-sm border border-indigo-100 transition duration-200 cursor-pointer"
        >
          🔄 Return Order
        </button>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 mb-2">Cancel Order Request</h3>
            <p className="text-xs text-gray-500 mb-4">
              Please let us know why you would like to cancel order reference <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{order.id.substring(0, 8)}</code>.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="Order placed by mistake">Order placed by mistake</option>
                  <option value="Incorrect shipping address">Incorrect shipping address</option>
                  <option value="Found better price elsewhere">Found better price elsewhere</option>
                  <option value="Delayed delivery estimate">Delayed delivery estimate</option>
                  <option value="Changed my mind">Changed my mind</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Additional Description</label>
                <textarea
                  value={cancelDescription}
                  onChange={(e) => setCancelDescription(e.target.value)}
                  placeholder="Tell us more about the reason..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Upload Proof Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                />
                {isUploadingImage && <p className="text-[10px] text-rose-600 animate-pulse mt-1.5 font-bold">Uploading proof photo...</p>}
                {imageUrl && (
                  <div className="mt-3 relative w-full h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                    <img src={imageUrl} alt="Cancellation proof preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition duration-200 cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || isUploadingImage}
                  className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-4 py-2.5 rounded-xl shadow-lg shadow-rose-600/10 transition duration-200 cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? "Submitting..." : "Submit Cancel Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Order Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 mb-2">Request Order Return</h3>
            <p className="text-xs text-gray-500 mb-4">
              Return window is eligible for 7 days post delivery. Upload proof images to expedite approval.
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Return Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Defective or damaged product">Defective or damaged product</option>
                  <option value="Item different from image/description">Item different from image/description</option>
                  <option value="Size or fit issue">Size or fit issue</option>
                  <option value="Missing items or accessories">Missing items or accessories</option>
                  <option value="No longer needed">No longer needed</option>
                  <option value="Wrong product received">Wrong product received</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Explain the Issue</label>
                <textarea
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  required
                  placeholder="Provide details about the issue..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Upload Proof Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                {isUploadingImage && <p className="text-[10px] text-indigo-600 animate-pulse mt-1.5 font-bold">Uploading proof photo...</p>}
                {imageUrl && (
                  <div className="mt-3 relative w-full h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                    <img src={imageUrl} alt="Return proof preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition duration-200 cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={isReturning || isUploadingImage}
                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 transition duration-200 cursor-pointer disabled:opacity-50"
                >
                  {isReturning ? "Submitting..." : "Submit Return Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
