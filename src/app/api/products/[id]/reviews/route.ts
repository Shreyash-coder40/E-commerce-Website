import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

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

    // 3. Retrieve user from email
    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    // 4. Create Review
    const newReview = await db.review.create({
      data: {
        productId,
        userId: dbUser.id,
        rating: ratingNum,
        comment: comment.trim(),
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
