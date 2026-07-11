import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin permissions required." }, { status: 403 });
    }

    const resolvedParams = await params;
    const reviewId = resolvedParams.id;

    if (!reviewId) {
      return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    }

    const review = await db.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    // Delete review
    await db.review.delete({
      where: { id: reviewId }
    });

    return NextResponse.json({ success: true, message: "Review deleted successfully." });
  } catch (error: any) {
    console.error("DELETE_REVIEW_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to delete review." }, { status: 500 });
  }
}
