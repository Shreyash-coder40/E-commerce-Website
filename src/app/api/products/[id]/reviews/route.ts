import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { fetchGemini } from "@/app/lib/gemini";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.id;

    // 1. Secure Authentication Layer
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to submit a review." }, { status: 401 });
    }

    const body = await req.json();
    const { rating, comment } = body;

    // 2. Validate Inputs
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: "Invalid rating. Rating must be an integer between 1 and 5." }, { status: 400 });
    }

    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json({ error: "Comment text cannot be empty." }, { status: 400 });
    }

    // 3. Retrieve user & product details
    const [dbUser, product] = await Promise.all([
      db.user.findUnique({ where: { email: session.user.email } }),
      db.product.findUnique({ where: { id: productId }, select: { name: true } })
    ]);

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // 4. Verified Purchase Check
    const purchase = await db.order.findFirst({
      where: {
        userId: dbUser.id,
        isPaid: true,
        items: {
          some: {
            productId: productId
          }
        }
      }
    });
    const verifiedPurchase = !!purchase;

    // 5. Gemini AI Spam & Manipulation Scanner
    let isSuspicious = false;
    let spamExplanation: string | null = null;
    try {
      const prompt = `You are an AI content moderator for an e-commerce platform. Analyze this product review and evaluate if it is suspicious, fake, bot-generated, advertising spam, or contains a rating/comment mismatch.

Product Name: "${product.name}"
Review Rating: ${ratingNum} out of 5 stars
Review Comment: "${comment.trim()}"

Analyze and respond in STRICT JSON format:
{
  "isSuspicious": boolean,
  "spamExplanation": "Short explanation of why it was flagged, or null if it is safe and authentic."
}

Rules for Flagging:
- Rating Mismatch: E.g., leaving a 5-star rating while writing negative text like "broke instantly, terrible", or a 1-star rating but writing "amazing product, love it".
- Advertising/Spam: Look for promo links, suspicious phone numbers, URLs, or unrelated marketing text.
- Bot Signatures: Repetitive copy-paste templates or nonsense gibberish.`;

      const response = await fetchGemini("gemini-flash-latest", {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });

      if (response.ok) {
        const resData = await response.json();
        const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        try {
          const parsed = JSON.parse(rawText);
          isSuspicious = !!parsed.isSuspicious;
          spamExplanation = parsed.spamExplanation || null;
        } catch (jsonErr) {
          console.error("--> [AI Moderator]: Failed to parse JSON response:", jsonErr, rawText);
        }
      }
    } catch (geminiErr) {
      console.error("--> [AI Moderator]: Request failed or rate limited, saving as unflagged:", geminiErr);
    }

    // 6. Create Review
    const newReview = await db.review.create({
      data: {
        productId,
        userId: dbUser.id,
        rating: ratingNum,
        comment: comment.trim(),
        verifiedPurchase,
        isSuspicious,
        spamExplanation
      },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, review: newReview }, { status: 201 });
  } catch (error: any) {
    console.error("SUBMIT_REVIEW_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to submit review." }, { status: 500 });
  }
}
