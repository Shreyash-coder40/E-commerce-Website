import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // 1. Fetch public store catalog & customer reviews & QAs
    const productsList = await db.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        category: true,
        stock: true,
        images: true,
        warranty: true,
        specifications: true
      }
    });

    const reviewsList = await db.review.findMany({
      select: {
        productId: true,
        rating: true,
        comment: true,
        user: { select: { name: true } }
      }
    });

    const qasList = await db.questionAnswer.findMany({
      select: {
        productId: true,
        question: true,
        answer: true
      }
    });

    // 2. Invoke Gemini LLM if key is present, otherwise fallback
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let aiResponseText = "";

    const systemPrompt = `You are the NextShop Shopping Assistant. You help customers browse products, check prices, understand technical specifications, read warranties, and summarize customer reviews/sentiment.

Here is the current catalog:
${JSON.stringify(productsList)}

Product Reviews:
${JSON.stringify(reviewsList)}

Product Q&As:
${JSON.stringify(qasList)}

If the customer decides to buy or add a product to their cart, or expresses clear intent to select an item, output a JSON action block on a separate line at the end:
\`\`\`action
{
  "type": "ADD_TO_CART",
  "productId": "insert_matching_product_id"
}
\`\`\`
If you output this block, the system will automatically place the product in the customer's cart. Do not display the raw JSON code block details in your text conversational text; explain it nicely, e.g. "I've added the Nike Shoes to your cart!"

Respond politely, using clean bullet points. Keep it concise, friendly, and helpful.`;

    if (geminiApiKey) {
      const contents = [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        ...history.map((h: any) => ({
          role: h.sender === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        })),
        {
          role: "user",
          parts: [{ text: message }]
        }
      ];

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
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
        aiResponseText = handleLocalFallback(message, productsList, reviewsList, qasList);
      }
    } else {
      aiResponseText = handleLocalFallback(message, productsList, reviewsList, qasList);
    }

    // 3. Scan response for action block and parse the target product details to send back to client
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
function handleLocalFallback(msg: string, products: any[], reviews: any[], qas: any[]): string {
  const query = msg.toLowerCase();

  // Find if a product is mentioned
  let matchedProd = null;
  for (const p of products) {
    if (query.includes(p.id.toLowerCase()) || query.includes(p.name.toLowerCase())) {
      matchedProd = p;
      break;
    }
  }

  if (matchedProd) {
    // Add to cart trigger
    if (query.includes("add") || query.includes("buy") || query.includes("cart") || query.includes("get")) {
      return `Adding the high-quality **${matchedProd.name}** (Price: ₹${matchedProd.price.toLocaleString("en-IN")}) directly to your shopping cart now!
\`\`\`action
{
  "type": "ADD_TO_CART",
  "productId": "${matchedProd.id}"
}
\`\`\``;
    }

    // Detail check
    const prodReviews = reviews.filter((r) => r.productId === matchedProd.id);
    const avgRating = prodReviews.length > 0 ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1) : "No reviews";
    const prodQAs = qas.filter((q) => q.productId === matchedProd.id);

    let detailsText = `### 📦 ${matchedProd.name} Specifications & Reviews
- **Price**: ₹${matchedProd.price.toLocaleString("en-IN")}
- **Category**: ${matchedProd.category}
- **Stock Status**: ${matchedProd.stock > 0 ? `${matchedProd.stock} units available` : "Out of Stock"}
- **Warranty**: ${matchedProd.warranty || "Standard Brand Warranty"}
- **Description**: ${matchedProd.description}

#### ⭐ Customer Reviews (${prodReviews.length}):
- **Average Rating**: ${avgRating} / 5
`;

    if (prodReviews.length > 0) {
      detailsText += `- **Feedback Sample**: "${prodReviews[0].comment}" (by ${prodReviews[0].user?.name || "Customer"})\n`;
    }

    if (prodQAs.length > 0) {
      detailsText += `\n#### 💬 Q&A Help Center:\n- **Q**: "${prodQAs[0].question}"\n- **A**: "${prodQAs[0].answer || "Our support team is reviewing this question."}"\n`;
    }

    detailsText += `\nWould you like me to add this item to your cart? Just say *"Add this to cart"*!`;
    return detailsText;
  }

  // General Greet Catalog table
  let response = `### Welcome to NextShop Shopping Assistant! 🤖
I can summarize product reviews, answer details about specs, and add items directly to your shopping cart. 

Here is our catalog list:
`;

  products.forEach((p) => {
    response += `- **${p.name}** (₹${p.price.toLocaleString("en-IN")}) - *${p.description.substring(0, 50)}...*\n`;
  });

  response += `\nType a product name above to ask about its specifications, customer reviews, or to add it to your cart!`;
  return response;
}
