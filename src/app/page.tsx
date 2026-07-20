import React from "react";
import { db } from "@/app/lib/db";
import Link from "next/link";
import ProductFilters from "@/app/components/ProductFilters";
import Image from "next/image";
import HomeAddToCartButton from "@/app/components/HomeAddToCartButton";
import CopyCouponButton from "@/app/components/CopyCouponButton";
import FlipkartDealsBanner from "@/app/components/FlipkartDealsBanner";
import { fetchGemini, embedText } from "@/app/lib/gemini";
import { cosineSimilarity } from "@/app/lib/vector";

export const dynamic = "force-dynamic";

// In-memory cache for semantic search queries to bypass API latency (L1 Cache)
const semanticSearchCache = new Map<string, {
  productsList: any[];
  timestamp: number;
}>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes TTL

export default async function HomePage({ searchParams }: { searchParams: Promise<any> }) {
  const resolvedSearchParams = await searchParams;
  const category = resolvedSearchParams?.category || "";
  const search = resolvedSearchParams?.search || "";
  const semantic = resolvedSearchParams?.semantic === "true";

  // 1. Fetch live categories for the filter component layout
  const rawCategories = await db.product.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  const categoriesList = rawCategories.map((c) => c.category);

  // 2. Query products using regular filter parameters
  let productsList = await db.product.findMany({
    where: {
      category: category ? category : undefined,
      // If semantic search is active, we fetch all products in the category and rank them via AI.
      // Otherwise, we do standard SQL contains matching.
      name: (search && !semantic) ? { contains: search, mode: "insensitive" } : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  if (search && semantic && productsList.length > 0) {
    const cacheKey = `${category}::${search.trim().toLowerCase()}`;
    const cachedEntry = semanticSearchCache.get(cacheKey);

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
      console.log(`[Semantic Cache]: HIT for key "${cacheKey}"`);
      productsList = cachedEntry.productsList;
    } else {
      try {
        console.log(`--> [Vector Search]: Generating embedding for query "${search}"...`);
        let ratedProducts = productsList.map((p) => ({ ...p, searchScore: 0, searchExplanation: "" }));

        try {
          const queryVector = await embedText(search.trim());
          ratedProducts = productsList.map((p) => {
            const productVector = p.embedding as number[] | null;
            let similarity = 0;
            if (Array.isArray(productVector) && productVector.length > 0) {
              similarity = cosineSimilarity(queryVector, productVector);
            }

            const queryLower = search.trim().toLowerCase();
            const nameMatches = p.name.toLowerCase().includes(queryLower);
            const descMatches = p.description.toLowerCase().includes(queryLower);
            const catMatches = p.category.toLowerCase().includes(queryLower);

            let baseScore = Math.round(similarity * 100);
            if (nameMatches) baseScore = Math.max(baseScore + 40, 80);
            else if (descMatches || catMatches) baseScore = Math.max(baseScore + 25, 60);
            else if (!Array.isArray(productVector) || productVector.length === 0) {
              const words = queryLower.split(/\s+/).filter(Boolean);
              const partialMatches = words.some((w: string) => p.name.toLowerCase().includes(w) || p.description.toLowerCase().includes(w));
              if (partialMatches) baseScore = 45;
            }

            return {
              ...p,
              searchScore: Math.min(100, baseScore),
              searchExplanation: `Vector & Keyword Match Score: ${Math.min(100, baseScore)}% (Cosine: ${Math.round(similarity * 100)}%)`
            };
          });
        } catch (embedErr) {
          console.warn("--> [Vector Search]: embedText call failed, proceeding to Gemini Live Re-rank:", embedErr);
        }

        // If vector matching didn't yield strong scores or embeddings are missing, use Gemini 3.1 Flash-Lite for real-time semantic evaluation
        const topScore = Math.max(...ratedProducts.map(p => p.searchScore || 0));
        if (topScore < 50 && productsList.length > 0) {
          try {
            console.log(`--> [Gemini Live Re-rank]: Running real-time semantic scoring for query "${search}"...`);
            const simplifiedCatalog = productsList.map(p => ({
              id: p.id,
              name: p.name,
              category: p.category,
              description: p.description.slice(0, 180),
            }));

            const prompt = `You are the AI Semantic Search Engine for NextShop.
The shopper is searching for: "${search}"

Evaluate each product in our catalog and assign a conceptual match score from 0 to 100 based on meaning, utility, category fit, or alternative relevance to "${search}". Also provide a concise 1-sentence reason why it matches.
Return ONLY valid JSON array:
[
  { "id": "product_id", "score": 85, "reason": "Matches because..." }
]

Catalog:
${JSON.stringify(simplifiedCatalog, null, 2)}`;

            const aiRes = await fetchGemini("gemini-3.1-flash-lite", {
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
              }
            });

            const aiText = await aiRes.text();
            let aiRankings: any[] = [];
            try {
              aiRankings = JSON.parse(aiText);
            } catch (jsonErr) {
              const cleanText = aiText.replace(/```json|```/g, "").trim();
              aiRankings = JSON.parse(cleanText);
            }

            if (Array.isArray(aiRankings) && aiRankings.length > 0) {
              const rankMap = new Map(aiRankings.map(r => [r.id, r]));
              ratedProducts = ratedProducts.map(p => {
                const aiData = rankMap.get(p.id);
                const currentScore = p.searchScore || 0;
                if (aiData && typeof aiData.score === "number") {
                  const finalScore = Math.max(currentScore, aiData.score);
                  return {
                    ...p,
                    searchScore: finalScore,
                    searchExplanation: `🧠 AI Semantic Match (${finalScore}%): ${aiData.reason || "Matches shopper intent conceptually."}`
                  };
                }
                return p;
              });
            }
          } catch (liveAiErr) {
            console.error("--> [Gemini Live Re-rank]: Live ranking failed:", liveAiErr);
          }
        }

        // Sort all products descending by their semantic/hybrid score
        const sortedProducts = ratedProducts.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
        
        // Only filter out items with score < 10 IF there are relevant products matching >= 10, preventing empty screens
        const relevantProducts = sortedProducts.filter((p) => (p.searchScore || 0) >= 10);
        productsList = (relevantProducts.length > 0 ? relevantProducts : sortedProducts) as any;

        // Save to memory cache
        semanticSearchCache.set(cacheKey, {
          productsList,
          timestamp: Date.now()
        });
      } catch (geminiErr) {
        console.error("--> [Vector Search]: Semantic evaluation failed, falling back to keyword search:", geminiErr);
        productsList = productsList.filter(p => 
          p.name.toLowerCase().includes(search.toLowerCase()) || 
          p.description.toLowerCase().includes(search.toLowerCase())
        );
      }
    }
  } else if (search && semantic) {
    // If search is active but products are empty, fall back to standard keyword matching
    productsList = productsList.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  const products = productsList;
  const featuredProduct = products[0] || null;

  return (
    <div className="bg-background text-foreground min-h-screen py-6 sm:py-8 transition-colors duration-300 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Brand Header Banner Card (Curved deep blue banner with pills) */}
        <div className="w-full bg-gradient-to-r from-indigo-650 to-indigo-700 rounded-3xl p-6 sm:p-10 mb-8 text-white relative overflow-hidden shadow-lg border border-indigo-700/60">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(255,107,53,0.12),transparent_60%)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-orange-400 bg-white/10 px-3 py-1 rounded-full border border-white/10">Premium Marketplace</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mt-4">
              NEXT<span className="text-orange-600">SHOP</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-2 font-medium">
              Browse authentic items across multiple categories with verified pricing and real-time smart product matching.
            </p>
            {/* Category Pills inside Banner */}
            <div className="flex gap-2 sm:gap-3 mt-6 flex-wrap items-center">
              <Link 
                href="/"
                className={`text-xs font-bold px-4 py-2 rounded-xl transition ${!category ? 'bg-orange-600 text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'}`}
              >
                All Categories
              </Link>
              {categoriesList.map((cat) => (
                <Link
                  key={cat}
                  href={`/?category=${encodeURIComponent(cat)}`}
                  className={`text-xs font-bold px-4 py-2 rounded-xl transition ${category === cat ? 'bg-orange-600 text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'}`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Flipkart-Style Best Deals of the Day Horizontal Scroll Banner */}
        {!category && !search && <FlipkartDealsBanner products={productsList} />}

        {/* Search & Filtering Control Row */}
        <ProductFilters categories={categoriesList} currentPage={1} totalPages={1} />

        {/* Sidebar & Products grid Layout */}
        <div className="flex flex-col md:flex-row gap-8 mt-4">
          
          {/* Left Sidebar (Desktop Filters & Top Sellers) */}
          <div className="hidden md:block w-64 shrink-0 space-y-6">
            
            {/* Widget 1: Categories filter list */}
            <div className="bg-white border border-card-border rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">Best Category</h4>
              <div className="space-y-3">
                <Link 
                  href="/"
                  className={`flex items-center text-xs font-bold transition hover:text-indigo-600 ${!category ? 'text-indigo-600' : 'text-slate-500'}`}
                >
                  <span className="mr-2">📁</span> All Products
                </Link>
                {categoriesList.map((cat) => (
                  <Link
                    key={cat}
                    href={`/?category=${encodeURIComponent(cat)}`}
                    className={`flex items-center text-xs font-bold transition hover:text-indigo-600 ${category === cat ? 'text-indigo-600' : 'text-slate-500'}`}
                  >
                    <span className="mr-2">🏷️</span> {cat}
                  </Link>
                ))}
              </div>
            </div>

            {/* Widget 2: Mock Price Range Slider */}
            <div className="bg-white border border-card-border rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">Price Range</h4>
              <div className="space-y-2">
                <input 
                  type="range" 
                  min="0" 
                  max="150000" 
                  defaultValue="80000" 
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-450 font-bold mt-1">
                  <span>Min: ₹0</span>
                  <span>Max: ₹1,50,000</span>
                </div>
              </div>
            </div>

            {/* Widget 3: Top Selling List (First 5 products in dataset) */}
            <div className="bg-white border border-card-border rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2">Top Sellers</h4>
              <div className="space-y-4">
                {products.slice(0, 5).map((prod) => (
                  <Link href={`/products/${prod.id}`} key={prod.id} className="flex items-center gap-3 group">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden shrink-0 flex items-center justify-center">
                      <img 
                        src={prod.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100"} 
                        alt={prod.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-[11px] font-extrabold text-slate-800 group-hover:text-indigo-600 transition truncate">{prod.name}</h5>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-black text-indigo-600">₹{prod.price.toLocaleString("en-IN")}</span>
                        <span className="text-[9px] text-slate-400 line-through">₹{(prod.price * 1.3).toLocaleString("en-IN", {maximumFractionDigits:0})}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Widget 4: Vertical Promotional banner (Safety Orange highlight) */}
            <div className="bg-gradient-to-br from-indigo-700 to-indigo-850 rounded-2xl p-5 text-white relative overflow-hidden shadow-md text-center">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/20 rounded-full blur-2xl pointer-events-none" />
              <span className="text-[10px] font-black uppercase tracking-wider bg-orange-600 px-2 py-0.5 rounded-md">Promotion</span>
              <h4 className="text-base font-black tracking-tight mt-3">30% Flat Discount</h4>
              <p className="text-[10px] text-white/70 mt-1">On newly added flagship smartphones & sarees</p>
              <Link 
                href="/?category=Electronics"
                className="inline-block mt-4 text-[10px] font-black text-indigo-900 bg-white hover:bg-orange-505 hover:text-white transition px-4 py-2 rounded-xl uppercase tracking-wider"
              >
                Shop Now →
              </Link>
            </div>

          </div>

          {/* Right Column: Main Grid Area */}
          <div className="flex-1">
            
            {/* Filter Results Status Sub-bar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {products.length} Item Results found
                </span>
                {category && (
                  <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                    Category: {category}
                    <Link href="/" className="hover:text-rose-500 font-extrabold text-[8px]">✕</Link>
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-400 select-none cursor-default">
                Sort: <span className="text-indigo-600">Most Popular</span>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-20 bg-white border border-card-border rounded-3xl p-8 shadow-xs">
                <h2 className="text-lg font-black text-slate-800 mb-2">🛍️ No Products Found</h2>
                <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
                  Your search criteria didn't match any listings in our database.
                </p>
                <Link
                  href="/admin/add-product"
                  className="inline-flex items-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-750 px-5 py-3 rounded-xl transition shadow-md"
                >
                  ➕ Register New Product
                </Link>
              </div>
            ) : (
              /* Main Marketplace Catalog Grid (3-columns on desktop) */
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product) => {
                  const discountPercentage = product.mrp && product.mrp > product.price 
                    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                    : 20; // default mockup tag if no MRP
                  
                  return (
                    <div 
                      key={product.id} 
                      className="bg-white border border-card-border rounded-2xl overflow-hidden shadow-xs hover:shadow-[0_15px_30px_rgba(0,119,182,0.06)] hover:scale-[1.01] hover:border-indigo-500/25 transition-all duration-300 p-4 flex flex-col justify-between group relative text-slate-800"
                    >
                      {/* Product Content Clickable Container */}
                      <Link href={`/products/${product.id}`} className="block group cursor-pointer flex-1">
                        
                        {/* Top Badge Overlay elements */}
                        <div className="absolute top-3 left-3 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md z-10 uppercase shadow-sm">
                          -{discountPercentage}%
                        </div>
                        <div 
                          className="absolute top-3 right-3 text-slate-350 hover:text-rose-500 hover:scale-110 transition z-10 p-1 cursor-pointer bg-transparent border-0 select-none"
                        >
                          ♥
                        </div>

                        {/* Image Container */}
                        <div className="relative aspect-square w-full bg-slate-50/65 rounded-xl overflow-hidden mb-3 flex items-center justify-center p-3 border border-slate-100">
                          <Image
                            src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"}
                            alt={product.name}
                            fill
                            className="object-contain p-2 group-hover:scale-[1.03] transition-transform duration-300"
                          />
                        </div>

                        {/* Dot slider indicators (Mockup decoration) */}
                        <div className="flex gap-1 justify-center mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                        </div>

                        {/* AI Match Alert Badge */}
                        {(product as any).searchScore !== undefined && (
                          <div 
                            className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 mb-2 flex items-center gap-1"
                            title={(product as any).searchExplanation}
                          >
                            <span>🧠 AI Match:</span>
                            <span>{(product as any).searchScore}%</span>
                          </div>
                        )}

                        {/* Brand Category Tag */}
                        <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">{product.category}</span>
                        
                        {/* Title */}
                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2 mt-0.5 leading-tight mb-2 min-h-[36px]">
                          {product.name}
                        </h3>

                        {/* Rating stars */}
                        <div className="flex items-center gap-0.5 text-xs text-amber-500 mb-4">
                          <span>★</span><span>★</span><span>★</span><span>★</span>
                          <span className="text-slate-300">★</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1">(12)</span>
                        </div>

                      </Link>

                      {/* Card Footer Price & Floating Circular Add to Cart button */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm sm:text-base font-black text-indigo-600">₹{product.price.toLocaleString("en-IN")}</span>
                            {product.mrp && product.mrp > product.price ? (
                              <span className="text-[10px] sm:text-xs text-slate-400 line-through font-medium">₹{product.mrp.toLocaleString("en-IN")}</span>
                            ) : (
                              <span className="text-[10px] sm:text-xs text-slate-400 line-through font-medium">₹{(product.price * 1.3).toLocaleString("en-IN", {maximumFractionDigits:0})}</span>
                            )}
                          </div>
                        </div>

                        {/* Circular add to cart action */}
                        <div className="relative shrink-0 z-20">
                          <HomeAddToCartButton product={product} variant="circular" />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Promotional Banner Row & Coupon Box (Clean Alabaster Card with custom shadow) */}
        {!category && !search && (
          <div className="mt-16 space-y-12">
            
            {/* Interactive Brands Spotlight */}
            <div className="bg-white border border-card-border rounded-3xl p-6 shadow-xs max-w-4xl mx-auto">
              <div className="text-center max-w-lg mx-auto mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Curated Collections</span>
                <h3 className="text-lg font-black text-slate-800 mt-1">Official Brand Partners</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-center justify-items-center">
                {/* Samsung */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-20 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-500/30 hover:bg-white transition-all duration-300 cursor-default gap-1.5">
                  <img src="https://images.samsung.com/is/image/samsung/assets/global/about-us/brand/logo/256_144_4.png?$512_N_PNG$" alt="Samsung" className="h-6 object-contain mix-blend-multiply" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 group-hover:text-slate-700 transition">Samsung</span>
                </div>
                {/* Nike */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-20 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-500/30 hover:bg-white transition-all duration-300 cursor-default gap-1.5">
                  <img src="https://nmp.about.nike.com/originals/about/prod/cf68f541-fc92-4373-91cb-086ae0fe2f88/002-nike-logos-swoosh-white.jpg?s=0d91b6d512f3b96eb15376bfb84bd503140904583667147c21ca3d6c4594e7d2" alt="Nike" className="h-6 object-contain mix-blend-multiply invert" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 group-hover:text-slate-700 transition">Nike</span>
                </div>
                {/* Apple */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-20 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-500/30 hover:bg-white transition-all duration-300 cursor-default gap-1.5">
                  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrrlnydtYrQvW8qJkFeha6TSYKGScNLtuBQd7j-WsavbrlZJxrKwCGHLU&s=10" alt="Apple" className="h-6 object-contain mix-blend-multiply" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 group-hover:text-slate-700 transition">Apple</span>
                </div>
                {/* Wrangler */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-20 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-500/30 hover:bg-white transition-all duration-300 cursor-default gap-1.5">
                  <span className="text-base font-black text-slate-800 italic group-hover:text-indigo-600 transition">Wrangler</span>
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 group-hover:text-slate-700 transition">Denim</span>
                </div>
                {/* Dyson */}
                <div className="group flex flex-col items-center justify-center p-3 w-full h-20 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-500/30 hover:bg-white transition-all duration-300 cursor-default gap-1.5">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-widest group-hover:text-indigo-600 transition">DYSON</span>
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 group-hover:text-slate-700 transition">Appliances</span>
                </div>
              </div>
            </div>

            {/* Premium Coupon Promo Box (Light theme with blue border and orange button copy) */}
            <div className="relative overflow-hidden rounded-3xl bg-white border border-indigo-200 text-slate-800 shadow-sm p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
              <div className="z-10 text-center md:text-left">
                <span className="bg-indigo-55 text-indigo-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-200">Limited Offer</span>
                <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-4 text-slate-900">Get Flat 15% Off Your First Purchase</h3>
                <p className="text-xs sm:text-sm text-slate-505 mt-2 max-w-md">Join our newsletter to unlock dynamic pricing suggestions and coupon vouchers.</p>
              </div>
              <div className="z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between sm:w-64">
                  <span className="text-xs font-bold text-slate-500 uppercase">Coupon:</span>
                  <span className="text-sm font-black text-indigo-600 tracking-wider font-mono">NEXT15</span>
                </div>
                <CopyCouponButton code="NEXT15" />
              </div>
            </div>

          </div>
        )}

        {/* Trust Signals Section */}
        <div className="mt-20 border-t border-slate-200 pt-12 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-center gap-4 p-4 bg-white border border-card-border rounded-2xl shadow-xs hover:border-indigo-500/20 transition-all duration-300">
              <span className="text-2xl">🛡️</span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">SSL Secure Checkout</h4>
                <p className="text-[10px] sm:text-xs text-slate-400">256-bit encrypted connection</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-card-border rounded-2xl shadow-xs hover:border-indigo-500/20 transition-all duration-300">
              <span className="text-2xl">📦</span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">Guaranteed Safe Delivery</h4>
                <p className="text-[10px] sm:text-xs text-slate-400">Insured trackable shipping</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-card-border rounded-2xl shadow-xs hover:border-indigo-500/20 transition-all duration-300">
              <span className="text-2xl">🤝</span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">30-Day Return Window</h4>
                <p className="text-[10px] sm:text-xs text-slate-400">No questions asked refunds</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-card-border rounded-2xl shadow-xs hover:border-indigo-500/20 transition-all duration-300">
              <span className="text-2xl">💬</span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">24/7 Shopper Support</h4>
                <p className="text-[10px] sm:text-xs text-slate-400">Expert live assistance</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}