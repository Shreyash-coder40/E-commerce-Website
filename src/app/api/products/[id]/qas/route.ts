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
      return NextResponse.json({ error: "Unauthorized. Please sign in to ask a question." }, { status: 401 });
    }

    const body = await req.json();
    const { question } = body;

    // 2. Validate Inputs
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "Question text cannot be empty." }, { status: 400 });
    }

    // 3. Retrieve user from email
    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    // 4. Create Question
    const newQA = await db.questionAnswer.create({
      data: {
        productId,
        userId: dbUser.id,
        question: question.trim(),
        answer: null, // Answer is initially null until admin responds
      },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, qa: newQA }, { status: 201 });
  } catch (error: any) {
    console.error("ASK_QUESTION_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to submit question." }, { status: 500 });
  }
}
