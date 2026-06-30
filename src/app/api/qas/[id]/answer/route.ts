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
    const qaId = resolvedParams.id;

    // 1. Secure Authentication & Admin Check
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
    }

    const body = await req.json();
    const { answer } = body;

    if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
      return NextResponse.json({ error: "Answer text cannot be empty." }, { status: 400 });
    }

    // 2. Find and update the QuestionAnswer record
    const updatedQA = await db.questionAnswer.update({
      where: { id: qaId },
      data: { answer: answer.trim() },
    });

    return NextResponse.json({ success: true, qa: updatedQA });
  } catch (error: any) {
    console.error("ADMIN_SUBMIT_ANSWER_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to submit answer." }, { status: 500 });
  }
}
