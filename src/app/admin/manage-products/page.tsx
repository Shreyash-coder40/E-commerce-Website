import React from "react";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ManageProductsClient from "./ManageProductsClient";

export const revalidate = 0;

export default async function ManageProductsPage() {
  // 1. Secure verification layer
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!isAdmin) {
    redirect("/");
  }

  // 2. Fetch all current products
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">Manage Inventory</h1>
            <p className="text-sm text-gray-600 mt-1">Modify prices, track stock levels, or remove active products.</p>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition w-fit"
          >
            🏠 Back to Home
          </Link>
        </div>

        {/* Inject interactive client component table layout */}
        <ManageProductsClient initialProducts={products} />
      </div>
    </div>
  );
}