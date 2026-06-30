"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ProductFiltersProps {
  categories: string[];
  currentPage: number;
  totalPages: number;
}

export default function ProductFilters({
  categories,
  currentPage,
  totalPages,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State Synchronizer Framework
  const updateQueryParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset back to page 1 whenever search query updates
    if (key !== "page") {
      params.delete("page");
    }

    router.push(`/?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchValue = formData.get("search") as string;
    updateQueryParams("search", searchValue.trim());
  };

  const currentCategory = searchParams.get("category") || "";

  return (
    <div className="mb-8 space-y-4">
      {/* Search and Category Control Bar Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        
        {/* Search Input Box */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            name="search"
            defaultValue={searchParams.get("search") || ""}
            placeholder="Search for items, clothing, electronics..."
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition"
          />
        </form>
 
        {/* Dynamic Category Filtering Dropdown Menu */}
        <div className="sm:w-64">
          <select
            value={currentCategory}
            onChange={(e) => updateQueryParams("category", e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/></svg>")`,
              backgroundPosition: "right 1rem center",
              backgroundSize: "1.25rem",
              backgroundRepeat: "no-repeat",
              paddingRight: "2.5rem"
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
 
      {/* Horizontal Category Pills Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => updateQueryParams("category", "")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-sm ${
            !currentCategory
              ? "bg-blue-600 border-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
              : "bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          🌐 All Items
        </button>
        {categories.map((cat) => {
          let icon = "📦";
          if (cat.toLowerCase().includes("mobile")) icon = "📱";
          else if (cat.toLowerCase().includes("audio")) icon = "🎧";
          else if (cat.toLowerCase().includes("elect")) icon = "💻";
          else if (cat.toLowerCase().includes("foot")) icon = "👟";
          else if (cat.toLowerCase().includes("wear")) icon = "⌚";
          else if (cat.toLowerCase().includes("gaming")) icon = "🎮";
          else if (cat.toLowerCase().includes("access")) icon = "⌨️";
 
          return (
            <button
              key={cat}
              onClick={() => updateQueryParams("category", cat)}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-sm ${
                currentCategory === cat
                  ? "bg-blue-600 border-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                  : "bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{icon}</span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
 
      {/* Pagination Controller Row Layout */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-400">
            Showing page <span className="text-white font-extrabold">{currentPage}</span> of <span className="text-white font-extrabold">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => updateQueryParams("page", String(currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-slate-900 text-xs font-bold text-slate-300 border border-slate-800 rounded-xl shadow-sm hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => updateQueryParams("page", String(currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 bg-slate-900 text-xs font-bold text-slate-300 border border-slate-800 rounded-xl shadow-sm hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}