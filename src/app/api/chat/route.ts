import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const productsList = await db.product.findMany({
      select: { id: true, name: true, price: true, stock: true, category: true, description: true, specifications: true }
    });

    const reviewsList = await db.review.findMany({
      select: { productId: true, rating: true, comment: true }
    });

    const qasList = await db.questionAnswer.findMany({
      select: { productId: true, question: true, answer: true }
    });

    const geminiApiKey = process.env.GEMINI_API_KEY;
    let aiResponseText = "";
    let resolvedFilters: any = null;
    let matchedProducts = productsList;

    // Strict user/model history formatting
    const cleanedHistory = [];
    let expectedRole = "user";
    for (const h of history) {
      const role = h.sender === "user" ? "user" : "model";
      if (cleanedHistory.length === 0 && role === "model") {
        continue;
      }
      if (role === expectedRole) {
        cleanedHistory.push({
          role,
          parts: [{ text: h.text }]
        });
        expectedRole = role === "user" ? "model" : "user";
      }
    }

    if (geminiApiKey) {
      // STAGE 1: STRICT EXTRACTOR & INTENT PARSER LAYER
      const intentParserPrompt = `You are a strict Intent Parser Layer for an e-commerce assistant. Your job is to extract structured JSON search parameters from the user's query and conversation history.

You must output a JSON object matching this exact schema:
{
  "extracted_filters": {
    "category": string or null,
    "product_type": string or null,
    "color": array of strings or null,
    "material": array of strings or null,
    "vibe_or_style": string or null,
    "max_price": number or null,
    "occasion": string or null
  },
  "metadata": {
    "is_follow_up": boolean,
    "wants_to_browse": boolean
  },
  "resolved_filters": {
    "category": string or null,
    "product_type": string or null,
    "color": array of strings or null,
    "material": array of strings or null,
    "vibe_or_style": string or null,
    "max_price": number or null,
    "occasion": string or null
  }
}

Guidelines for "resolved_filters":
1. If "is_follow_up" is true, you must merge the category, product_type, color, material, vibe_or_style, max_price, and occasion from the previous turns in the conversation history with the new query. For example, if the previous query was for "traditional kurtas" and the user asks "do you have blue?", the resolved_filters color should contain ["blue"], category should be "clothing", and product_type should be "kurta".
2. If "is_follow_up" is false, "resolved_filters" should match "extracted_filters".
3. Return ONLY a single, clean JSON object conforming to the schema. Do not include markdown code wrapping blocks.`;

      // Copy cleaned history array
      const parserHistory = [...cleanedHistory];
      if (parserHistory.length > 0 && parserHistory[parserHistory.length - 1].role === "user") {
        parserHistory[parserHistory.length - 1].parts[0].text += "\n" + message;
      } else {
        parserHistory.push({
          role: "user",
          parts: [{ text: message }]
        });
      }

      try {
        const parserResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: parserHistory,
              systemInstruction: {
                parts: [{ text: intentParserPrompt }]
              },
              generationConfig: {
                responseMimeType: "application/json"
              }
            }),
          }
        );

        if (parserResponse.ok) {
          const parserData = await parserResponse.json();
          const jsonText = parserData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            try {
              const parsed = JSON.parse(jsonText);
              resolvedFilters = parsed.resolved_filters || parsed.extracted_filters;
            } catch (jsonErr) {
              console.error("JSON parsing error on customer intent parser:", jsonErr, jsonText);
            }
          }
        }
      } catch (err) {
        console.error("Stage 1 Customer Intent Parser API call failed:", err);
      }

      // STAGE 2: DATABASE FILTERING & SCORING
      if (resolvedFilters) {
        matchedProducts = productsList.filter((p) => {
          // A. Category matching
          if (resolvedFilters.category && p.category.toLowerCase() !== resolvedFilters.category.toLowerCase()) {
            return false;
          }
          // B. Max Price constraint
          if (resolvedFilters.max_price && p.price > resolvedFilters.max_price) {
            return false;
          }
          return true;
        });

        // Relevancy scoring
        const scoredProducts = matchedProducts.map((p) => {
          let score = 0;
          const searchFields = `${p.name} ${p.description} ${p.category} ${JSON.stringify(p.specifications || {})}`.toLowerCase();

          if (resolvedFilters.product_type && searchFields.includes(resolvedFilters.product_type.toLowerCase())) {
            score += 15;
          }
          if (resolvedFilters.color && Array.isArray(resolvedFilters.color)) {
            resolvedFilters.color.forEach((c: string) => {
              if (searchFields.includes(c.toLowerCase())) score += 10;
            });
          }
          if (resolvedFilters.material && Array.isArray(resolvedFilters.material)) {
            resolvedFilters.material.forEach((m: string) => {
              if (searchFields.includes(m.toLowerCase())) score += 10;
            });
          }
          if (resolvedFilters.vibe_or_style && searchFields.includes(resolvedFilters.vibe_or_style.toLowerCase())) {
            score += 8;
          }
          if (resolvedFilters.occasion && searchFields.includes(resolvedFilters.occasion.toLowerCase())) {
            score += 8;
          }

          return { product: p, score };
        });

        scoredProducts.sort((a, b) => b.score - a.score);
        matchedProducts = scoredProducts.map(sp => sp.product);
      }

      // STAGE 3: RESPONSE SYNTHESIS
      const responseGeneratorPrompt = `You are a helpful, expert AI Shopping Assistant for our NextShop e-commerce store.

We have resolved the customer's search filter criteria from their message and conversation context history:
${JSON.stringify(resolvedFilters || {})}

Here is the real-time matching database catalog of items:
${JSON.stringify(matchedProducts.slice(0, 5))}

And here is the customer reviews index for these matches:
${JSON.stringify(reviewsList.filter(r => matchedProducts.some(p => p.id === r.productId)).slice(0, 10))}

And the Q&As log for context:
${JSON.stringify(qasList.filter(q => matchedProducts.some(p => p.id === q.productId)).slice(0, 10))}

Write a friendly, highly interactive, and context-aware conversational response.
1. Present the matching products to the customer. Explain naturally why they match their criteria (e.g. noting material cotton/linen/leather, color, and occasion vibe if they mentioned any).
2. If no products are found, politely inform them, and list 2-3 categories or products that we *do* have as recommendations.
3. Keep the conversation engaging, interactive, and personalized (like ChatGPT/Gemini). Avoid stating the technical search filters directly; talk to them like a helpful salesperson!
4. If they decided to add a product to their cart, output this exact action block on a separate line at the end:
\`\`\`action
{
  "type": "ADD_TO_CART",
  "productId": "insert_matching_product_id"
}
\`\`\``;

      // Copy cleaned history and append user query
      const responseHistory = [...cleanedHistory];
      if (responseHistory.length > 0 && responseHistory[responseHistory.length - 1].role === "user") {
        responseHistory[responseHistory.length - 1].parts[0].text += "\n" + message;
      } else {
        responseHistory.push({
          role: "user",
          parts: [{ text: message }]
        });
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: responseHistory,
              systemInstruction: {
                parts: [{ text: responseGeneratorPrompt }]
              }
            }),
          }
        );

        if (response.ok) {
          const resData = await response.json();
          aiResponseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "No response text found from Gemini.";
        } else {
          const errText = await response.text();
          console.error("Gemini Public API call failed:", response.status, errText);
          throw new Error("Gemini API request failed.");
        }
      } catch (geminiErr) {
        console.error("Gemini fetch error:", geminiErr);
        aiResponseText = handleLocalFallback(message, productsList, reviewsList, qasList, history);
      }
    } else {
      aiResponseText = handleLocalFallback(message, productsList, reviewsList, qasList, history);
    }

    // 3. Parse action block and perform cart additions
    const actionRegex = /```action\s*([\s\S]*?)\`\`\`/i;
    const match = aiResponseText.match(actionRegex);
    let matchedProduct = null;

    if (match) {
      try {
        const actionObj = JSON.parse(match[1].trim());
        if (actionObj.type === "ADD_TO_CART") {
          const prod = productsList.find((p) => p.id === actionObj.productId);
          if (prod) {
            matchedProduct = prod;
            aiResponseText = aiResponseText.replace(actionRegex, "").trim();
            aiResponseText += `\n\n🛒 **[Cart Update]**: Successfully added **${prod.name}** (₹${prod.price.toLocaleString("en-IN")}) to your shopping cart!`;
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse cart action payload:", parseErr);
      }
    }

    return NextResponse.json({ success: true, text: aiResponseText, product: matchedProduct });
  } catch (error: any) {
    console.error("PUBLIC_CHAT_API_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to contact shopping assistant." }, { status: 500 });
  }
}

// Client-facing rule-based fallback
function handleLocalFallback(msg: string, products: any[], reviews: any[], qas: any[], history: any[] = []): string {
  const query = msg.toLowerCase().trim();

  // 0. General Greetings Fallback
  if (query === "hi" || query === "hello" || query === "hey" || query === "whats up" || query === "whats new" || query.startsWith("greeting") || query.startsWith("hii")) {
    return `Hello! I am your NextShop Shopping Assistant. 🤖 How can I help you find products today? You can search for laptops, shoes, apparel, and more!`;
  }

  // 1. Define keyword lists
  const colors = ["blue", "red", "green", "black", "white", "yellow", "orange", "pink", "brown", "gray", "silver", "gold"];
  const materials = ["cotton", "linen", "leather", "polyester", "silk", "wool", "metal", "plastic", "glass"];
  const styles = ["traditional", "casual", "formal", "sporty", "modern", "vintage", "premium", "classic"];
  
  // Category mapping
  let categoryKeyword = null;
  if (query.includes("cloth") || query.includes("wear") || query.includes("kurta") || query.includes("kurtii") || query.includes("kurti") || query.includes("hoodie") || query.includes("shirt") || query.includes("pant") || query.includes("apparel")) {
    categoryKeyword = "Clothing";
  } else if (query.includes("foot") || query.includes("shoe") || query.includes("sneaker") || query.includes("slipper")) {
    categoryKeyword = "Footwear";
  } else if (query.includes("electr") || query.includes("laptop") || query.includes("phone") || query.includes("iphone") || query.includes("monitor") || query.includes("mouse") || query.includes("earbud") || query.includes("headphone") || query.includes("audio")) {
    categoryKeyword = "Electronics";
  }

  // Product type mapping
  let productTypeKeyword = null;
  const productTypes = ["laptop", "phone", "iphone", "sneaker", "shoe", "kurta", "kurtii", "kurti", "monitor", "mouse", "earbud", "headphone", "hoodie"];
  for (const pt of productTypes) {
    if (query.includes(pt)) {
      productTypeKeyword = pt;
      break;
    }
  }

  // 2. Parse current message attributes
  let currentAttrs: string[] = [];
  colors.forEach(c => { if (query.includes(c)) currentAttrs.push(c); });
  materials.forEach(m => { if (query.includes(m)) currentAttrs.push(m); });
  styles.forEach(s => { if (query.includes(s)) currentAttrs.push(s); });

  // Parse price constraints
  let maxPrice: number | null = null;
  const priceMatch = query.match(/(?:under|below|less than|price of|budget of)\s*(\d+)/i);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1]);
  }

  // 3. Check if follow-up
  const isFollowUp = query.includes("them") || query.includes("those") || query.includes("that") || query.includes("it") || 
                     (history.length > 0 && currentAttrs.length > 0 && !query.includes("show") && !query.includes("find"));

  // 4. Resolve active attributes by merging history if it's a follow-up
  let activeAttrs = [...currentAttrs];
  let activeMaxPrice = maxPrice;

  if (isFollowUp && history.length > 0) {
    const prevUserMessages = history.filter(h => h.sender === "user");
    if (prevUserMessages.length > 0) {
      const prevQuery = prevUserMessages[prevUserMessages.length - 1].text.toLowerCase();
      colors.forEach(c => { if (prevQuery.includes(c) && !activeAttrs.includes(c)) activeAttrs.push(c); });
      materials.forEach(m => { if (prevQuery.includes(m) && !activeAttrs.includes(m)) activeAttrs.push(m); });
      styles.forEach(s => { if (prevQuery.includes(s) && !activeAttrs.includes(s)) activeAttrs.push(s); });
      
      if (activeMaxPrice === null) {
        const prevPriceMatch = prevQuery.match(/(?:under|below|less than|price of|budget of)\s*(\d+)/i);
        if (prevPriceMatch) {
          activeMaxPrice = parseInt(prevPriceMatch[1]);
        }
      }
    }
  }

  // 5. Filter products database matching active criteria
  let matched = products;
  
  // Filter by category if matched
  if (categoryKeyword) {
    matched = matched.filter(p => p.category.toLowerCase() === categoryKeyword.toLowerCase());
  }

  // Filter by product type if matched
  if (productTypeKeyword) {
    matched = matched.filter(p => {
      const searchStr = `${p.name} ${p.description}`.toLowerCase();
      const targetType = productTypeKeyword === "kurtii" || productTypeKeyword === "kurti" ? "kurta" : productTypeKeyword;
      return searchStr.includes(targetType);
    });
  }

  if (activeAttrs.length > 0) {
    matched = matched.filter(p => {
      const searchStr = `${p.name} ${p.description} ${p.category} ${JSON.stringify(p.specifications || {})}`.toLowerCase();
      return activeAttrs.every(attr => searchStr.includes(attr));
    });
  }
  if (activeMaxPrice !== null) {
    matched = matched.filter(p => p.price <= activeMaxPrice!);
  }

  // Sort by price if they ask for sales/cheapest
  if (query.includes("sale") || query.includes("cheap") || query.includes("offer") || query.includes("best deal")) {
    matched = [...matched].sort((a, b) => a.price - b.price);
  }

  // 6. Build response
  if (matched.length > 0) {
    if (query.includes("add") || query.includes("buy") || query.includes("cart") || query.includes("get")) {
      const targetProd = matched[0];
      return `I've found **${targetProd.name}** which matches your criteria. I am adding it to your cart!
\`\`\`action
{
  "type": "ADD_TO_CART",
  "productId": "${targetProd.id}"
}
\`\`\``;
    }

    let response = `### 🔍 Resolved Search Filters:
- **Category**: ${categoryKeyword ? `\`${categoryKeyword}\`` : "*Any*"}
- **Product Type**: ${productTypeKeyword ? `\`${productTypeKeyword}\`` : "*Any*"}
- **Attributes**: ${activeAttrs.length > 0 ? activeAttrs.map(a => `\`${a}\``).join(", ") : "*None*"}
- **Max Price Limit**: ${activeMaxPrice ? `₹${activeMaxPrice}` : "*None*"}
- **Context Merged (Follow-Up)**: \`${isFollowUp ? "Yes" : "No"}\`

Here are the items I found matching your criteria:

`;
    matched.slice(0, 3).forEach((p) => {
      response += `* **${p.name}** (₹${p.price.toLocaleString("en-IN")}) - *${p.description.substring(0, 100)}...*\n`;
    });

    response += `\nWould you like me to add one of these to your shopping cart? Just ask!`;
    return response;
  }

  // No products found fallback
  return `I couldn't find any products matching your specific query for "${productTypeKeyword || "items"}" in our catalog. How about browsing our catalog categories (Electronics, Footwear, Apparel)?`;
}
