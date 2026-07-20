import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { fetchGemini } from "@/app/lib/gemini";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Runs Gemini spam/fake-review scan with a 10s timeout.
 * Uses plain text mode (no responseMimeType) for maximum compatibility.
 */
async function scanReviewWithAI(
  productName: string,
  ratingNum: number,
  comment: string
): Promise<{ isSuspicious: boolean; spamExplanation: string | null }> {
  const defaultResult = { isSuspicious: false, spamExplanation: null };

  const prompt = `You are an AI content moderator for an e-commerce platform. Analyze this product review.

Product: "${productName}"
Rating: ${ratingNum}/5 stars
Comment: "${comment}"

Does this review show ANY of these red flags?
1. Rating mismatch - positive stars but negative comment, or negative stars but positive comment
2. Spam/advertising - contains URLs, phone numbers, promo codes, unrelated content
3. Fake/bot - gibberish, nonsense, copy-paste template with no real content

Respond with ONLY a JSON object, nothing else:
{"isSuspicious": true, "spamExplanation": "reason here"}
OR
{"isSuspicious": false, "spamExplanation": null}`;

  try {
    // 10 second timeout — enough for Vercel cold starts
    const geminiCall = fetchGemini("gemini-2.0-flash", {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 100
      }
    });

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Moderation timed out after 10s")), 10000)
    );

    const response = await Promise.race([geminiCall, timeoutPromise]) as Response | null;

    if (!response || !response.ok) {
      console.warn("--> [AI Moderator]: Gemini returned non-OK response, saving as safe.");
      return defaultResult;
    }

    const resData = await response.json();
    const rawText: string = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("--> [AI Moderator]: Raw Gemini response:", JSON.stringify(rawText));

    // Extract JSON from the response — strip any markdown code fences
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("--> [AI Moderator]: No JSON found in response:", rawText);
      return defaultResult;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const isSuspicious = !!parsed.isSuspicious;
    const spamExplanation = parsed.spamExplanation || null;

    console.log(`--> [AI Moderator]: Scan complete. isSuspicious=${isSuspicious}, reason="${spamExplanation}"`);
    return { isSuspicious, spamExplanation };

  } catch (err: any) {
    console.warn("--> [AI Moderator]: Scan failed:", err.message);
    return defaultResult;
  }
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

    // 3. Retrieve user & product details (in parallel)
    const [dbUser, product] = await Promise.all([
      db.user.findUnique({ where: { email: session.user.email } }),
      db.product.findUnique({ where: { id: productId }, select: { name: true } })
    ]);

    if (!dbUser) return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    // 4. Verified Purchase Check
    const purchase = await db.order.findFirst({
      where: {
        userId: dbUser.id,
        isPaid: true,
        items: { some: { productId } }
      }
    });
    const verifiedPurchase = !!purchase;

    // 5. Run AI moderation synchronously (up to 10 seconds).
    //    The result is baked into the saved review — no separate update needed.
    const { isSuspicious, spamExplanation } = await scanReviewWithAI(
      product.name,
      ratingNum,
      comment.trim()
    );

    // 6. Save review with the AI moderation result already included
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

    console.log(`--> [Review Submitted]: ID=${newReview.id}, isSuspicious=${isSuspicious}`);

    return NextResponse.json({ success: true, review: newReview }, { status: 201 });
  } catch (error: any) {
    console.error("SUBMIT_REVIEW_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to submit review." }, { status: 500 });
  }
}
