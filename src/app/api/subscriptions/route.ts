import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const subscriptions = await db.subscription.findMany({
      where: { userId: dbUser.id },
      include: {
        product: {
          select: { id: true, name: true, price: true, images: true },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, subscriptions });
  } catch (error: any) {
    console.error("GET_SUBSCRIPTIONS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch subscriptions." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const body = await req.json();
    const { productId, quantity, frequency, shippingAddressId } = body;

    if (!productId || !frequency || !shippingAddressId) {
      return NextResponse.json({ error: "Product, frequency, and address are required." }, { status: 400 });
    }

    // Calculate initial next billing date (starting immediately for the first cycle or 1 cycle from now)
    // Usually, subscriptions charge the first order immediately, and then schedule the NEXT billing date.
    const nextBillingDate = new Date();
    const freq = frequency.toUpperCase();
    if (freq === "WEEKLY") {
      nextBillingDate.setDate(nextBillingDate.getDate() + 7);
    } else if (freq === "MONTHLY") {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (freq === "BIMONTHLY") {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 2);
    } else {
      return NextResponse.json({ error: "Invalid frequency parameter." }, { status: 400 });
    }

    const subscription = await db.subscription.create({
      data: {
        userId: dbUser.id,
        productId,
        quantity: parseInt(quantity) || 1,
        frequency: freq as any,
        nextBillingDate,
        shippingAddressId,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("CREATE_SUBSCRIPTION_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to establish subscription." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Subscription ID and new status are required." }, { status: 400 });
    }

    // Verify ownership
    const sub = await db.subscription.findUnique({
      where: { id },
    });

    if (!sub || sub.userId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized or subscription not found." }, { status: 403 });
    }

    const updated = await db.subscription.update({
      where: { id },
      data: { status: status.toUpperCase() as any },
    });

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error: any) {
    console.error("UPDATE_SUBSCRIPTION_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to update subscription status." }, { status: 500 });
  }
}
