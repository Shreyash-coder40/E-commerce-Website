import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PricingEngineClient from "./PricingEngineClient";

export default async function PricingEnginePage() {
  // 1. Secure verification layer
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Title Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">Demand Pricing Engine</h1>
            <p className="text-sm text-gray-600 mt-1">Autonomous sales optimization optimizing margins based on real-time velocity metrics.</p>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/" className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition w-fit">
              🏠 Back to Home
            </Link>
            <Link href="/admin/dashboard" className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition w-fit">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Render the interactive client data table */}
        <PricingEngineClient />
      </div>
    </div>
  );
}