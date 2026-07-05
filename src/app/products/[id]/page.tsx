import React from "react";
import { db } from "@/app/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import AddToCartButton from "@/app/components/DetailsAddToCartButton";
import ProductInteractiveTabs from "./ProductInteractiveTabs";
import PincodeChecker from "@/app/components/PincodeChecker";
import AlertSubscriptionManager from "@/app/components/AlertSubscriptionManager";

// FIXED: Global dynamic flags to stop Next.js from aggressively caching old product documents
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailsPage({ params }: ProductPageProps) {
  try {
    // Await the dynamic parameters promise first to prevent undefined id execution faults
    const resolvedParams = await params;
    console.log("--> ProductDetailsPage resolvedParams:", resolvedParams);

    if (!resolvedParams?.id) {
      return (
        <div className="p-10 max-w-xl mx-auto my-10 bg-red-50 border border-red-200 text-red-800 rounded-2xl">
          <h1 className="text-lg font-bold">Debug Info: ID Parameter Missing</h1>
          <p className="text-xs text-red-600 mt-2">Next.js failed to resolve parameters or the segment is blank.</p>
          <pre className="mt-4 p-4 bg-slate-900 text-slate-100 text-xs rounded-xl overflow-auto">
            {JSON.stringify({ resolvedParams }, null, 2)}
          </pre>
        </div>
      );
    }

    // 1. Fetch data from database engine securely with relations and session check
    const session = await auth();
    let productRaw = null;
    try {
      productRaw = await db.product.findUnique({
        where: { id: resolvedParams.id },
        include: {
          reviews: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { name: true } } },
          },
          qas: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { name: true } } },
          },
        },
      });
    } catch (dbErr: any) {
      console.error("--> ProductDetailsPage: Prisma DB lookup failed with error:", dbErr);
    }

    if (!productRaw) {
      return (
        <div className="p-10 max-w-xl mx-auto my-10 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl">
          <h1 className="text-lg font-bold">Debug Info: Product Not Found in Database</h1>
          <p className="text-xs text-amber-600 mt-2">We queried the database using the ID below, but it returned null.</p>
          <div className="mt-4 space-y-2 text-xs font-semibold">
            <p>Requested ID: <span className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{resolvedParams.id}</span></p>
          </div>
          <pre className="mt-4 p-4 bg-slate-900 text-slate-100 text-xs rounded-xl overflow-auto">
            {JSON.stringify({ resolvedParams }, null, 2)}
          </pre>
        </div>
      );
    }

    // 2. Explicitly cast product parameters to include optional fields to clear TypeScript error
    const product = productRaw as {
      id: string;
      name: string;
      description: string;
      price: number;
      mrp?: number | null;
      images?: string[];
      category: string;
      stock: number;
      warranty: string | null;
      specifications: any;
      reviews: any[];
      qas: any[];
    };

    // Convert numbers explicitly to prevent calculation failures
    const currentPrice = Number(product.price);
    const originalMrp = product.mrp ? Number(product.mrp) : 0;
    const hasDiscount = originalMrp > currentPrice;
    const discountPercentage = hasDiscount ? Math.round(((originalMrp - currentPrice) / originalMrp) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Huge Semi-Transparent Logo Watermark in Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <div className="text-[12vw] font-black tracking-tighter text-indigo-500/[0.09] rotate-12 flex items-center gap-4 whitespace-nowrap">
            <span>🛒</span> NEXT<span>SHOP</span>
          </div>
        </div>

        {/* Glowing Ambient Background Orbs */}
        <div className="absolute top-10 left-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-fuchsia-500/15 rounded-full blur-3xl animate-pulse" />
        
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25" />

        <div className="w-full max-w-6xl mx-auto relative z-10">
          
          {/* Navigation Breadcrumb back to store home grid */}
          <div className="mb-8">
            <Link
              href="/"
              className="text-xs font-bold text-slate-300 bg-slate-800/40 border border-slate-700/60 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-800 hover:text-white transition w-fit inline-flex items-center gap-1.5 backdrop-blur-md"
            >
              🏠 Back to Home
            </Link>
          </div>

          {/* Primary Two-Column Product Matrix Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 p-6 sm:p-10">
            
            {/* Left Column: Product Image Presenter */}
            <div className="relative aspect-square w-full bg-slate-950/45 rounded-2xl overflow-hidden border border-slate-800/60 group flex items-center justify-center p-4">
              <Image
                src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"}
                alt={product.name}
                fill
                priority
                sizes="(max-w-7xl) 50vw, 100vw"
                className="object-contain p-4 group-hover:scale-105 transition duration-300"
              />
            </div>

            {/* Right Column: Details & Actions */}
            <div className="flex flex-col justify-between">
              <div>
                {/* Category tag metadata */}
                <span className="inline-block px-3 py-1 bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-lg mb-4 border border-slate-750">
                  {product.category}
                </span>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
                  {product.name}
                </h1>

                {/* MATCHED PREVIEW COMPONENT: Replicating the exact Admin Add-Product pricing layer */}
                <div className="my-6">
                  {hasDiscount ? (
                    <div className="p-5 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl flex items-baseline gap-3 flex-wrap">
                      <span className="text-4xl font-black text-white tracking-tight">
                        ₹{currentPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm text-slate-500 line-through font-medium">
                        ₹{originalMrp.toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-1 rounded-xl shadow-sm">
                        {discountPercentage}% off
                      </span>
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-baseline gap-3 flex-wrap">
                      <span className="text-4xl font-black text-white tracking-tight">
                        ₹{currentPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl">
                        Everyday Value Price
                      </span>
                    </div>
                  )}

                  {/* Stock tracker message flag */}
                  <p className={`mt-3.5 text-xs font-bold flex items-center gap-1.5 ${
                    product.stock > 0 ? "text-emerald-450" : "text-rose-450"
                  }`}>
                    <span className="h-2 w-2 rounded-full bg-current"></span>
                    {product.stock > 0 
                      ? `In Stock (Only ${product.stock} items remaining)` 
                      : "Out of Stock"
                    }
                  </p>
                </div>

                {/* Description Body Text */}
                <div className="space-y-2 mb-8">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Overview</h3>
                  <p className="text-sm text-slate-350 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Pincode Availability Checker */}
              <PincodeChecker />

              {/* Checkout Action Button Section */}
              <div className="pt-4 border-t border-slate-800/60">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <AddToCartButton product={product} />
                  </div>
                  {product.stock > 0 && (
                    <Link
                      href={`/checkout?productId=${product.id}&quantity=1`}
                      className="flex-1 text-center bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-4 px-4 rounded-xl text-sm transition shadow-md tracking-wide active:scale-[0.98] cursor-pointer shadow-indigo-600/15 hover:shadow-indigo-500/25 flex items-center justify-center gap-1"
                    >
                      ⚡ Buy Now
                    </Link>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 text-center mt-3 font-medium">
                  🔒 Secured transaction verification managed via encrypted platform databases.
                </p>
              </div>

              {/* Smart Price Drop & Back in Stock Alerts Engine */}
              <AlertSubscriptionManager 
                productId={product.id} 
                stock={product.stock} 
                currentPrice={currentPrice} 
                session={session}
              />

            </div>

          </div>

          {/* Interactive Tabs Section (Specs, Reviews, Q&A, Policies) */}
          <ProductInteractiveTabs
            productId={product.id}
            initialReviews={product.reviews}
            initialQas={product.qas}
            specifications={product.specifications}
            warranty={product.warranty}
            category={product.category}
            session={session}
          />

        </div>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="p-10 max-w-2xl mx-auto my-10 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl space-y-4">
        <h1 className="text-xl font-black">💥 Server-Side Component Crash Log</h1>
        <p className="text-sm font-bold text-rose-600">The server encountered an error while rendering this page:</p>
        <pre className="p-4 bg-slate-900 text-slate-100 text-xs rounded-xl overflow-auto whitespace-pre-wrap">
          {err.stack || err.message || String(err)}
        </pre>
      </div>
    );
  }
}