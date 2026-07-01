import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json();
    const { email, productId, type, targetPrice } = body;

    if (!productId || !type) {
      return NextResponse.json({ error: "Product ID and Alert Type are required." }, { status: 400 });
    }

    // Determine target email: session email or manually provided email (for guests)
    const targetEmail = email || session?.user?.email;
    if (!targetEmail) {
      return NextResponse.json({ error: "Email address is required for notifications." }, { status: 400 });
    }

    const dbUser = session?.user?.email 
      ? await db.user.findUnique({ where: { email: session.user.email } }) 
      : null;

    // Check if subscription already exists to avoid duplication
    const existing = await db.alertSubscription.findFirst({
      where: {
        email: targetEmail,
        productId,
        type: type as any,
        isNotified: false,
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: "Already subscribed to this alert." });
    }

    const subscription = await db.alertSubscription.create({
      data: {
        userId: dbUser?.id || null,
        email: targetEmail,
        productId,
        type: type as any,
        targetPrice: targetPrice ? Number(targetPrice) : null,
        isNotified: false,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("SUBSCRIBE_ALERT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to subscribe to alert." }, { status: 500 });
  }
}
