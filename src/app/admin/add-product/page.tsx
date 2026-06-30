import React from "react";
import ProductFormClient from "./ProductFormClient";

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminAddProductPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight">Register Marketplace Asset</h1>
            <p className="text-xs text-gray-500 mt-1">
              Publish freshly curated product listings into the live public database cluster.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition w-fit"
          >
            🏠 Back to Home
          </Link>
        </div>

        <ProductFormClient />
      </div>
    </div>
  );
}