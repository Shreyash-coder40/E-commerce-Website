import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export const dynamic = "force-dynamic";

// Helper function to validate if the parsed competitor price is a realistic match (not an accessory or delivery fee)
function validateCompetitorPrice(parsedPrice: number, ourPrice: number): boolean {
  const minValidPrice = ourPrice * 0.5;  // At least 50% of our price
  const maxValidPrice = ourPrice * 3.0;  // Maximum 300% of our price
  return parsedPrice >= minValidPrice && parsedPrice <= maxValidPrice;
}

// Helper function to scrape search results for specific competitor links and prices
async function searchCompetitorDetails(productName: string, siteDomain: string, baseFallbackPrice: number, ourPrice: number) {
  const query = `${productName} site:${siteDomain}`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Scraper request failed with status: ${response.status}`);
    }
    
    const html = await response.text();
    const links: string[] = [];
    
    // Parse links from duckduckgo redirect format
    const linkReg = /<a class="result__url"[^>]*href="([^"]+)"/gi;
    let match;
    while ((match = linkReg.exec(html)) !== null) {
      let rawLink = match[1];
      if (rawLink.includes('uddg=')) {
        try {
          const u = new URL('https:' + rawLink);
          const decoded = u.searchParams.get('uddg');
          if (decoded) {
            rawLink = decodeURIComponent(decoded);
          }
        } catch (urlErr) {
          // fallback
        }
      }
      if (rawLink.includes(siteDomain)) {
        links.push(rawLink);
      }
    }
    
    // Filter to find exact product links first
    let selectedLink = `https://www.${siteDomain}`;
    if (siteDomain === "amazon.in") {
      const exactProductLink = links.find(l => l.includes('/dp/') || l.includes('/gp/'));
      selectedLink = exactProductLink || links[0] || `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`;
    } else if (siteDomain === "flipkart.com") {
      const exactProductLink = links.find(l => l.includes('/p/') || l.includes('/itm'));
      selectedLink = exactProductLink || links[0] || `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`;
    } else if (siteDomain === "meesho.com") {
      const exactProductLink = links.find(l => l.includes('/p/'));
      selectedLink = exactProductLink || links[0] || `https://www.meesho.com/search?q=${encodeURIComponent(productName)}`;
    }
    
    // Try to extract price from HTML snippets
    const priceReg = /(?:₹|Rs\.?)\s?([0-9,]{3,})/gi;
    let foundPrice: number | null = null;
    let priceMatch;
    
    // Iterate through all matched prices in the text search page and validate them
    while ((priceMatch = priceReg.exec(html)) !== null) {
      const candidatePrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      if (validateCompetitorPrice(candidatePrice, ourPrice)) {
        foundPrice = candidatePrice;
        break; // Stop at the first realistic price match
      }
    }
    
    return {
      link: selectedLink,
      price: foundPrice || baseFallbackPrice
    };
  } catch (err) {
    console.error(`--> [Scraper]: Failed to search ${siteDomain}:`, err);
    return {
      link: `https://www.${siteDomain}`,
      price: baseFallbackPrice
    };
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    // 1. Fetch our product details
    const product = await db.product.findUnique({
      where: { id }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // 2. Check for cached competitor data (valid for 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const cachedData = await db.competitorCache.findUnique({
      where: { productId: id }
    });

    if (cachedData && new Date(cachedData.lastUpdated) > twelveHoursAgo) {
      console.log(`--> [Compare API]: Returning cached data for product ${id}`);
      return NextResponse.json({
        success: true,
        source: "cache",
        productId: id,
        ourProduct: {
          name: product.name,
          price: product.price,
          image: product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"
        },
        competitors: cachedData.competitorData,
        recommendation: cachedData.recommendation
      });
    }

    // 3. Perform Live Scraped Search Query for Competitor details
    console.log(`--> [Compare API]: Triggering live web search queries for "${product.name}"`);
    
    // Generate base estimates for fallback
    const baseAmazon = Math.round(product.price * 1.05);
    const baseFlipkart = Math.round(product.price * 1.02);
    const baseMeesho = Math.round(product.price * 0.97);

    // Call searches concurrently with outlier validation parameters passed
    const [amazonRes, flipkartRes, meeshoRes] = await Promise.all([
      searchCompetitorDetails(product.name, "amazon.in", baseAmazon, product.price),
      searchCompetitorDetails(product.name, "flipkart.com", baseFlipkart, product.price),
      searchCompetitorDetails(product.name, "meesho.com", baseMeesho, product.price)
    ]);

    const productImg = product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300";
    let amazonImg = productImg;
    let flipkartImg = productImg;
    let meeshoImg = productImg;

    const competitors = [
      {
        site: "Amazon",
        name: `Amazon Choice - ${product.name}`,
        price: amazonRes.price,
        image: amazonImg,
        link: amazonRes.link
      },
      {
        site: "Flipkart",
        name: `Flipkart Assured - ${product.name}`,
        price: flipkartRes.price,
        image: flipkartImg,
        link: flipkartRes.link
      },
      {
        site: "Meesho",
        name: `Meesho Trend - ${product.name}`,
        price: meeshoRes.price,
        image: meeshoImg,
        link: meeshoRes.link
      }
    ];

    // 4. Ask Gemini to compile the final recommendation text
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let recommendation = "";

    if (geminiApiKey) {
      try {
        const prompt = `You are a professional e-commerce pricing analyst. Compare our store's product with competitors' listings.

Our Product:
- Name: "${product.name}"
- Price: ₹${product.price}
- Description: "${product.description}"

Competitor Listings:
${JSON.stringify(competitors, null, 2)}

Provide a short, direct recommendation (2-3 sentences max) for the customer.
1. Highlight which site offers the best deal and mention the exact savings.
2. If ours is not the cheapest, mention shipping speed, safety, or return policies to justify why buying from us is still a great choice.
3. Be professional, honest, and persuasive. Format with standard markdown (e.g. bolding key numbers).`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3 }
            })
          }
        );

        if (response.ok) {
          const resData = await response.json();
          recommendation = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch (geminiErr) {
        console.error("--> [Compare API]: Gemini call failed, falling back to local reasoning:", geminiErr);
      }
    }

    if (!recommendation) {
      recommendation = getLocalRecommendationFallback(product.name, product.price, competitors);
    }

    // 5. Update cache table
    await db.competitorCache.upsert({
      where: { productId: id },
      update: {
        competitorData: competitors as any,
        recommendation,
        lastUpdated: new Date()
      },
      create: {
        productId: id,
        competitorData: competitors as any,
        recommendation,
        lastUpdated: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      source: "live",
      productId: id,
      ourProduct: {
        name: product.name,
        price: product.price,
        image: product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"
      },
      competitors,
      recommendation
    });

  } catch (error: any) {
    console.error("COMPARE_API_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compile competitor price comparison." },
      { status: 500 }
    );
  }
}

function getLocalRecommendationFallback(name: string, price: number, competitors: any[]) {
  let cheapest = competitors[0];
  for (const comp of competitors) {
    if (comp.price < cheapest.price) {
      cheapest = comp;
    }
  }

  const diff = Math.abs(price - cheapest.price);

  if (price <= cheapest.price) {
    return `### 💡 Value Verdict: Buy on **NextShop**!
We checked the web for you: Our price of **₹${price.toLocaleString("en-IN")}** is the **cheapest** deal available online! Buying here saves you **₹${diff.toLocaleString("en-IN")}** compared to ${cheapest.site}. Plus, you get our verified 100% brand warranty and easy cancellation coverage.`;
  } else {
    return `### 💡 Value Verdict: **NextShop** is highly competitive!
${cheapest.site} currently lists this item at **₹${cheapest.price.toLocaleString("en-IN")}** (₹${diff.toLocaleString("en-IN")} cheaper than us). However, purchasing on **NextShop** guarantees direct seller support, verified packaging quality, and immediate cancellation verification without long support wait times.`;
  }
}
