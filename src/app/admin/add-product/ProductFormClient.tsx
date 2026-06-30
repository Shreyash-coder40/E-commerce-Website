"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductFormClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Interactive array manager tracking multiple image strings
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Form states to watch pricing calculations dynamically
  const [mrpInput, setMrpInput] = useState("");
  const [priceInput, setPriceInput] = useState("");

  const handleAddImageField = () => {
    setImageUrls([...imageUrls, ""]);
  };

  const handleRemoveImageField = (index: number) => {
    if (imageUrls.length === 1) {
      setImageUrls([""]);
      return;
    }
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleImageChange = (index: number, value: string) => {
    const updated = [...imageUrls];
    updated[index] = value;
    setImageUrls(updated);
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image file.");
      }

      // Update URL field with returned path
      const updated = [...imageUrls];
      updated[index] = data.url;
      setImageUrls(updated);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during image upload.");
    } finally {
      setUploadingIndex(null);
    }
  };

  // Dynamic calculations for the real-time preview banner
  const mrpVal = parseFloat(mrpInput);
  const priceVal = parseFloat(priceInput);
  const hasLiveDiscount = !isNaN(mrpVal) && !isNaN(priceVal) && mrpVal > priceVal;
  const liveDiscountPercent = hasLiveDiscount ? Math.round(((mrpVal - priceVal) / mrpVal) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const stockStr = formData.get("stock") as string;
    const warranty = formData.get("warranty") as string;
    const specsText = formData.get("specsText") as string;

    const specifications: Record<string, string> = {};
    if (specsText) {
      specsText.split("\n").forEach((line) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join(":").trim();
          if (key && val) {
            specifications[key] = val;
          }
        }
      });
    }

    // FIXED: Added fallback guards to prevent NaN values from crashing your database
    const price = parseFloat(priceInput);
    if (isNaN(price)) {
      setError("Please enter a valid selling price.");
      setLoading(false);
      return;
    }

    const mrp = mrpInput ? parseFloat(mrpInput) : null;
    if (mrp !== null && isNaN(mrp)) {
      setError("Please enter a valid M.R.P. or leave it completely blank.");
      setLoading(false);
      return;
    }

    if (mrp && price > mrp) {
      setError("Selling price cannot be greater than the original M.R.P.");
      setLoading(false);
      return;
    }

    // FIXED: Safely default empty stock values to 0 instead of NaN
    const stock = stockStr ? parseInt(stockStr, 10) : 0;
    const finalStock = isNaN(stock) ? 0 : stock;

    const filteredImages = imageUrls.filter((url) => url.trim() !== "");
    const finalImageArray = filteredImages.length > 0 
      ? filteredImages 
      : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"];

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          price,
          mrp,
          stock: finalStock,
          images: finalImageArray,
          warranty: warranty || null,
          specifications: Object.keys(specifications).length > 0 ? specifications : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to register asset parameters to database.");
      }

      alert("Product published successfully!");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected network execution fault occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-sm font-semibold text-red-600 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Product Name */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          Product Name
        </label>
        <input
          type="text"
          required
          name="name"
          placeholder="e.g. iPhone 15 Pro Max"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          Product Description
        </label>
        <textarea
          required
          name="description"
          rows={4}
          placeholder="Provide features, box inclusions, and specification sheets..."
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition resize-none"
        />
      </div>

      {/* Pricing Input Grid Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Original M.R.P. (₹ / $)
          </label>
          <input
            type="number"
            step="0.01"
            value={mrpInput}
            onChange={(e) => setMrpInput(e.target.value)}
            placeholder="e.g. 79999"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Special Selling Price (₹ / $) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="e.g. 65999"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* DYNAMIC REAL-TIME FLIPKART STYLE PREVIEW BADGE CONTAINER */}
      {hasLiveDiscount && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-baseline gap-3">
          <span className="text-[11px] font-bold text-green-800 uppercase tracking-wider bg-green-100 px-2 py-0.5 rounded-md">
            Live Preview:
          </span>
          <span className="text-2xl font-black text-gray-950">
            ₹{priceVal.toLocaleString("en-IN")}
          </span>
          <span className="text-sm text-gray-400 line-through">
            ₹{mrpVal.toLocaleString("en-IN")}
          </span>
          <span className="text-sm font-black text-green-600">
            {liveDiscountPercent}% off
          </span>
        </div>
      )}

      {/* Category and Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Category Classification
          </label>
          <input
            type="text"
            required
            name="category"
            placeholder="e.g. Mobiles, Electronics"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Initial Warehouse Stock Units
          </label>
          <input
            type="number"
            name="stock"
            placeholder="e.g. 25"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Warranty and Technical Specifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Warranty Information Cover
          </label>
          <input
            type="text"
            name="warranty"
            placeholder="e.g. 1 Year Manufacturer Warranty Cover"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Specs (Write 'Key: Value', one per line)
          </label>
          <textarea
            name="specsText"
            rows={3}
            placeholder={`e.g.\nRAM: 8 GB\nStorage: 128 GB\nProcessor: A17 Pro`}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Multiple Image Component Manager */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Product Showcase Images
          </label>
          <button
            type="button"
            onClick={handleAddImageField}
            className="text-xs font-extrabold text-indigo-600 hover:text-indigo-500 transition flex items-center gap-1"
          >
            ➕ Add More Images
          </button>
        </div>
        
        <div className="space-y-4">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex gap-2 items-center">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleImageChange(idx, e.target.value)}
                  placeholder={`Image URL #${idx + 1} (e.g. https://images.unsplash.com/...)`}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImageField(idx)}
                  className="p-3 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 rounded-xl transition text-sm font-bold shadow-sm"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative flex items-center justify-center px-4 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-sm cursor-pointer transition">
                  {uploadingIndex === idx ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading Image...
                    </span>
                  ) : (
                    <span>📸 Choose File to Upload</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingIndex !== null}
                    onChange={(e) => handleFileUpload(idx, e)}
                    className="sr-only"
                  />
                </label>
                {url && (
                  <span className="text-[11px] text-green-600 font-bold flex items-center gap-1">
                    ✓ Image Link Connected
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submission Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Publishing to Marketplace Catalog..." : "🚀 Publish Product Listing"}
        </button>
      </div>
    </form>
  );
}