import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"], // Match standard OrderStatus enum states (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
  DELIVERED: [],
  CANCELLED: [],
};

// Stub for triggering notification
async function triggerFulfillmentNotification(orderId: string, oldStatus: string, newStatus: string, userEmail: string) {
  console.log(`[Notification Stub] Sending email alert to ${userEmail}: Your order #${orderId} status has changed from ${oldStatus} to ${newStatus}.`);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access. Admins only." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status: targetStatus } = body;

    if (!targetStatus) {
      return NextResponse.json({ error: "Status parameter is required." }, { status: 400 });
    }

    // 1. Fetch current order
    const order = await db.order.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const currentStatus = order.status;

    // 2. Validate transition path to prevent skips/illegal loops
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return NextResponse.json({ 
        error: `Invalid status transition. Cannot shift directly from ${currentStatus} to ${targetStatus}.` 
      }, { status: 400 });
    }

    // 3. Update status in DB
    const updatedOrder = await db.order.update({
      where: { id },
      data: { status: targetStatus as any },
    });

    // 4. Trigger alert notification stub
    await triggerFulfillmentNotification(order.id, currentStatus, targetStatus, order.user.email);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("UPDATE_STATUS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to update order status." }, { status: 500 });
  }
}
