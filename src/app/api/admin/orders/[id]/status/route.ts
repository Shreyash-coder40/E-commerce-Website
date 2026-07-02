import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED", "CANCELLATION_PENDING"],
  PROCESSING: ["SHIPPED", "CANCELLED", "CANCELLATION_PENDING"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELLATION_PENDING: ["CANCELLED", "PROCESSING", "PENDING"],
  RETURN_REQUESTED: ["RETURN_APPROVED", "RETURN_REJECTED"],
  RETURN_APPROVED: [],
  RETURN_REJECTED: [],
  CANCELLED: [],
};

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
    const { status: targetStatus, adminNotes } = body;

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

    // 2. Validate transition path
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return NextResponse.json({ 
        error: `Invalid status transition. Cannot shift directly from ${currentStatus} to ${targetStatus}.` 
      }, { status: 400 });
    }

    // Prepare admin notes with decision timestamp
    const decisionTimestamp = new Date();
    const formattedNotes = adminNotes 
      ? `[Decision: ${decisionTimestamp.toLocaleString()}] ${adminNotes}`
      : `[Decision: ${decisionTimestamp.toLocaleString()}] Status updated to ${targetStatus}`;

    let updatedOrder;

    // 3. Update status in DB and adjust inventory if cancellation or return approved
    if (targetStatus === "CANCELLED" || targetStatus === "RETURN_APPROVED") {
      updatedOrder = await db.$transaction(async (tx: any) => {
        // Update Order
        const ord = await tx.order.update({
          where: { id },
          data: { 
            status: targetStatus as any,
            adminNotes: formattedNotes
          },
        });

        // Retrieve items in this order
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
        });

        // Increment stock levels (restoring inventory)
        for (const item of orderItems) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: product.stock + item.quantity,
              },
            });
          }
        }

        return ord;
      });
    } else {
      updatedOrder = await db.order.update({
        where: { id },
        data: { 
          status: targetStatus as any,
          adminNotes: formattedNotes
        },
      });
    }

    // 4. Trigger alert notification stub
    await triggerFulfillmentNotification(order.id, currentStatus, targetStatus, order.user.email);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("UPDATE_STATUS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to update order status." }, { status: 500 });
  }
}
