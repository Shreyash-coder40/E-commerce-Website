import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Please sign in to proceed." }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { id: orderId } = await params;
    const body = await req.json();
    const { type, reason } = body;

    if (!type || !reason) {
      return NextResponse.json({ error: "Request type and reason are required." }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.userId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized access to order." }, { status: 403 });
    }

    const timestamp = new Date();

    if (type === "CANCEL") {
      if (!["PENDING", "PROCESSING"].includes(order.status)) {
        return NextResponse.json({ 
          error: `Cancellation not allowed. Order has already been ${order.status.toLowerCase()}.` 
        }, { status: 400 });
      }

      const updatedOrder = await db.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLATION_PENDING",
          cancellationReason: reason,
          requestTimestamp: timestamp,
        },
      });

      return NextResponse.json({ success: true, order: updatedOrder });
    } else if (type === "RETURN") {
      if (order.status !== "DELIVERED") {
        return NextResponse.json({ 
          error: "Returns are only eligible for delivered orders." 
        }, { status: 400 });
      }

      // Check if within 7 days of order updatedAt
      const deliveryTime = order.updatedAt;
      const diffDays = (timestamp.getTime() - deliveryTime.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        return NextResponse.json({ 
          error: "Order is outside the 7-day eligible return window." 
        }, { status: 400 });
      }

      const updatedOrder = await db.order.update({
        where: { id: orderId },
        data: {
          status: "RETURN_REQUESTED",
          returnReason: reason,
          requestTimestamp: timestamp,
        },
      });

      return NextResponse.json({ success: true, order: updatedOrder });
    } else {
      return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("ORDER_REQUEST_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process request." }, { status: 500 });
  }
}
