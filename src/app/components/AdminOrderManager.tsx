"use client";

import React, { useState } from "react";

interface AdminOrderManagerProps {
  initialOrders: any[];
  initialCustomers: any[];
}

export default function AdminOrderManager({ initialOrders, initialCustomers }: AdminOrderManagerProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "customers" | "requests">("orders");
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [customers, setCustomers] = useState<any[]>(initialCustomers);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Track admin notes inputs for requests
  const [adminNotesInputs, setAdminNotesInputs] = useState<Record<string, string>>({});

  const handleStatusChange = async (orderId: string, oldStatus: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status.");
      }

      // Update local state for orders list
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      // Update local state for customers list
      setCustomers((prev) =>
        prev.map((c) => ({
          ...c,
          orders: c.orders.map((o: any) =>
            o.id === orderId ? { ...o, status: newStatus } : o
          ),
        }))
      );
    } catch (err: any) {
      alert(`Update rejected: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRequestDecision = async (orderId: string, targetStatus: string) => {
    setUpdatingId(orderId);
    const notes = adminNotesInputs[orderId] || "";
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, adminNotes: notes }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit decision.");
      }

      alert(`Decision recorded successfully!`);

      // Update local state for orders list
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: targetStatus, adminNotes: `[Decision: ${new Date().toLocaleString()}] ${notes}` } : o))
      );

      // Update local state for customers list
      setCustomers((prev) =>
        prev.map((c) => ({
          ...c,
          orders: c.orders.map((o: any) =>
            o.id === orderId ? { ...o, status: targetStatus } : o
          ),
        }))
      );
    } catch (err: any) {
      alert(`Decision error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-950/40 text-amber-400 border-amber-900/30";
      case "PROCESSING":
        return "bg-blue-950/40 text-blue-400 border-blue-900/30";
      case "SHIPPED":
        return "bg-purple-950/40 text-purple-400 border-purple-900/30";
      case "DELIVERED":
        return "bg-emerald-950/40 text-emerald-450 border-emerald-900/30";
      case "CANCELLED":
        return "bg-rose-950/40 text-rose-450 border-rose-900/30";
      case "CANCELLATION_PENDING":
        return "bg-orange-950/40 text-orange-400 border-orange-900/30";
      case "RETURN_REQUESTED":
        return "bg-indigo-950/40 text-indigo-400 border-indigo-900/30";
      case "RETURN_APPROVED":
        return "bg-emerald-950/40 text-emerald-450 border-emerald-900/30";
      case "RETURN_REJECTED":
        return "bg-slate-950/40 text-slate-400 border-slate-800";
      default:
        return "bg-slate-950/40 text-slate-400 border-slate-800";
    }
  };

  const parseReturnReason = (reasonStr: string | null) => {
    if (!reasonStr) return { reason: "None", description: "", imageUrl: null };
    const parts = reasonStr.split(" | ");
    let reason = "None";
    let description = "";
    let imageUrl = null;

    for (const part of parts) {
      if (part.startsWith("Reason: ")) {
        reason = part.replace("Reason: ", "");
      } else if (part.startsWith("Description: ")) {
        description = part.replace("Description: ", "");
      } else if (part.startsWith("Image: ")) {
        imageUrl = part.replace("Image: ", "");
      }
    }

    if (reason === "None" && !description) {
      reason = reasonStr;
    }

    return { reason, description, imageUrl };
  };

  const selectedCustomerDetails = customers.find((c) => c.id === selectedCustomerId);
  const pendingRequests = orders.filter((o) =>
    ["CANCELLATION_PENDING", "RETURN_REQUESTED"].includes(o.status)
  );

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 flex-wrap">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 min-w-[150px] py-4 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "orders"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40"
          }`}
        >
          📦 Global Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex-1 min-w-[150px] py-4 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "customers"
              ? "border-indigo-500 text-indigo-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40"
          }`}
        >
          👥 User History ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 min-w-[150px] py-4 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
            activeTab === "requests"
              ? "border-amber-500 text-amber-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40"
          }`}
        >
          ⏳ Approval Requests ({pendingRequests.length})
        </button>
      </div>

      <div className="p-6">
        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-12">No orders recorded in the system.</p>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    className="border border-slate-800/80 bg-slate-950/30 rounded-2xl overflow-hidden hover:border-slate-700 transition"
                  >
                    {/* Compact row summary */}
                    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 bg-slate-900/40">
                      <div className="truncate flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">
                            Order Reference ID: {order.id.substring(0, 8)}...
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusClass(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          User: <strong className="text-slate-200">{order.user?.name || "Guest"}</strong> ({order.user?.email})
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-bold">TOTAL AMOUNT</p>
                          <p className="text-base font-black text-indigo-400">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                        </div>
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="text-xs text-slate-300 bg-slate-800/40 border border-slate-700/60 px-3.5 py-2 rounded-xl font-bold hover:bg-slate-800 hover:text-white shadow-sm transition cursor-pointer backdrop-blur-md"
                        >
                          {isExpanded ? "Collapse" : "Manage"}
                        </button>
                      </div>
                    </div>

                    {/* Detailed expanded content */}
                    {isExpanded && (
                      <div className="p-6 border-t border-slate-800 bg-transparent space-y-6 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800/60">
                          <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Delivery Snapshots</h4>
                            {order.shippingAddress ? (
                              <div className="space-y-1 font-medium text-slate-300">
                                <p>📍 Address Details: <strong>{order.shippingAddress}</strong></p>
                                <p>✉️ Shipping Pincode: <strong>{order.pincode}</strong></p>
                                {order.estimatedDelivery && (
                                  <p>📅 Delivery Due: <strong>{new Date(order.estimatedDelivery).toLocaleDateString()}</strong></p>
                                )}
                              </div>
                            ) : (
                              <p className="text-slate-500 text-xs">No address recorded for this order.</p>
                            )}

                            {order.cancellationReason && (
                              <div className="mt-4 p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl">
                                <p className="text-xs font-bold text-rose-400">Cancellation Info:</p>
                                <p className="text-xs text-rose-300 mt-1">{order.cancellationReason}</p>
                              </div>
                            )}

                            {order.returnReason && (
                              <div className="mt-4 p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl">
                                <p className="text-xs font-bold text-indigo-400">Return Info:</p>
                                <p className="text-xs text-indigo-300 mt-1">{order.returnReason}</p>
                              </div>
                            )}

                            {order.adminNotes && (
                              <div className="mt-4 p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                                <p className="text-xs font-bold text-slate-400">Seller Notes:</p>
                                <p className="text-xs text-slate-300 mt-1 font-medium">{order.adminNotes}</p>
                              </div>
                            )}
                          </div>

                          {/* Quick status dropdown editor */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inline Status Editor</h4>
                            <div className="flex items-center gap-3">
                              <select
                                value={order.status}
                                disabled={updatingId === order.id || ["DELIVERED", "CANCELLED", "RETURN_APPROVED", "RETURN_REJECTED"].includes(order.status)}
                                onChange={(e) => handleStatusChange(order.id, order.status, e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                              >
                                <option value="PENDING" className="bg-slate-900 text-white">Pending</option>
                                <option value="PROCESSING" className="bg-slate-900 text-white">Processing</option>
                                <option value="SHIPPED" className="bg-slate-900 text-white">Shipped</option>
                                <option value="DELIVERED" className="bg-slate-900 text-white">Delivered</option>
                                <option value="CANCELLED" className="bg-slate-900 text-white">Cancelled</option>
                                <option value="CANCELLATION_PENDING" className="bg-slate-900 text-white" disabled>Cancellation Pending</option>
                                <option value="RETURN_REQUESTED" className="bg-slate-900 text-white" disabled>Return Requested</option>
                                <option value="RETURN_APPROVED" className="bg-slate-900 text-white">Return Approved</option>
                                <option value="RETURN_REJECTED" className="bg-slate-900 text-white">Return Rejected</option>
                              </select>
                              {updatingId === order.id && <span className="text-xs text-indigo-400 font-bold animate-pulse">Syncing...</span>}
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Note: Manual state switches should be performed with caution. For Cancellations and Returns, use the dedicated requests queue.
                            </p>
                          </div>
                        </div>

                        {/* Items list */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Order Invoice Items</h4>
                          <div className="divide-y divide-slate-800/60">
                            {order.items?.map((item: any) => (
                              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-bold text-white">{item.product?.name || "Deleted Product Item"}</p>
                                  <p className="text-slate-500 mt-0.5">Quantity: {item.quantity} pieces</p>
                                </div>
                                <p className="font-black text-slate-300">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Financial breakdown */}
                        <div className="bg-slate-950/40 p-4 rounded-xl text-xs space-y-1 text-slate-400 border border-slate-800">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="text-white">₹{Number(order.totalAmount - (order.shippingCost || 0) - (order.taxAmount || 0)).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST Tax:</span>
                            <span className="text-white">₹{Number(order.taxAmount || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shipping Costs:</span>
                            <span className="text-white">{order.shippingCost === 0 ? "FREE" : `₹${order.shippingCost}`}</span>
                          </div>
                          <div className="flex justify-between font-black text-indigo-400 border-t border-slate-800/60 pt-2 mt-2">
                            <span>Total Invoice Cost:</span>
                            <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "customers" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left User list */}
            <div className="lg:col-span-1 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto bg-slate-950/20">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-3">User Directory</h4>
              {customers.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">No purchase customers found.</p>
              ) : (
                customers.map((customer) => {
                  const isSelected = selectedCustomerId === customer.id;
                  const totalSpent = customer.orders.reduce((acc: number, o: any) => acc + (o.isPaid ? o.totalAmount : 0), 0);
                  return (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`p-3.5 rounded-xl cursor-pointer transition text-xs mb-1.5 ${
                        isSelected 
                          ? "bg-indigo-600 text-white shadow" 
                          : "bg-slate-900/40 border border-slate-800 hover:bg-slate-850/40 text-slate-300"
                      }`}
                    >
                      <p className="font-extrabold truncate">{customer.name || "Anonymous Shopper"}</p>
                      <p className={`mt-0.5 truncate ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                        {customer.email}
                      </p>
                      <div className="flex justify-between mt-3 font-semibold">
                        <span>{customer.orders.length} orders</span>
                        <span className={isSelected ? "text-white font-extrabold" : "text-indigo-400 font-extrabold"}>
                          Spent: ₹{totalSpent.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Customer detail */}
            <div className="lg:col-span-2 space-y-6">
              {selectedCustomerDetails ? (
                <div className="space-y-6">
                  <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-2xl space-y-1">
                    <h3 className="text-base font-black text-white">Customer Profile details</h3>
                    <p className="text-sm font-semibold text-slate-300">Name: {selectedCustomerDetails.name || "Anonymous Shopper"}</p>
                    <p className="text-xs text-slate-400">Email: {selectedCustomerDetails.email}</p>
                    <p className="text-[11px] text-slate-500">Created: {new Date(selectedCustomerDetails.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase Order History</h4>
                    {selectedCustomerDetails.orders.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-6">This user has not placed any orders.</p>
                    ) : (
                      selectedCustomerDetails.orders.map((order: any) => (
                        <div
                          key={order.id}
                          className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3 text-xs">
                            <div>
                              <p className="font-extrabold text-white">
                                ID: #{order.id.substring(0, 8)} ({new Date(order.createdAt).toLocaleDateString()})
                              </p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusClass(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <select
                                value={order.status}
                                disabled={updatingId === order.id || ["DELIVERED", "CANCELLED", "RETURN_APPROVED", "RETURN_REJECTED"].includes(order.status)}
                                onChange={(e) => handleStatusChange(order.id, order.status, e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                              >
                                <option value="PENDING" className="bg-slate-900 text-white">Pending</option>
                                <option value="PROCESSING" className="bg-slate-900 text-white">Processing</option>
                                <option value="SHIPPED" className="bg-slate-900 text-white">Shipped</option>
                                <option value="DELIVERED" className="bg-slate-900 text-white">Delivered</option>
                                <option value="CANCELLED" className="bg-slate-900 text-white">Cancelled</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {order.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-xs font-medium text-slate-300">
                                <span>{item.product?.name || "Deleted Product"} x {item.quantity}</span>
                                <span className="text-white font-bold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center text-xs font-extrabold text-indigo-400 border-t border-slate-800/60 pt-3">
                            <span>Grand Total:</span>
                            <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-slate-500 py-20 bg-slate-950/20 rounded-2xl border border-slate-800/80">
                  👈 Select a customer from the User Directory list to view profile details.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actionable Requests tab */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-dashed border-slate-800">
                <p className="text-sm font-semibold text-emerald-400">🎉 Hurrah! There are no pending cancellation or return requests.</p>
              </div>
            ) : (
              pendingRequests.map((order) => {
                const isCancelRequest = order.status === "CANCELLATION_PENDING";
                const { reason, description, imageUrl } = parseReturnReason(order.returnReason);

                return (
                  <div
                    key={order.id}
                    className={`border rounded-3xl p-6 shadow-md space-y-6 transition duration-200 ${
                      isCancelRequest ? "bg-rose-950/15 border-rose-900/30" : "bg-indigo-950/15 border-indigo-900/30"
                    }`}
                  >
                    {/* Header request banner */}
                    <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-800/60 pb-4">
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase mb-1.5 ${
                          isCancelRequest ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" : "bg-indigo-950/40 text-indigo-400 border border-indigo-900/30"
                        }`}>
                          {isCancelRequest ? "🚫 Cancellation Request" : "🔄 Return Request"}
                        </span>
                        <h4 className="text-sm font-extrabold text-white">
                          Order Reference ID: <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 border border-slate-800">{order.id}</code>
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          From: <strong>{order.user?.name || "Guest"}</strong> ({order.user?.email}) | Requested on: {new Date(order.requestTimestamp || order.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-bold">TOTAL AMOUNT</p>
                        <p className="text-lg font-black text-indigo-400">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                      </div>
                    </div>

                    {/* Order details description */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      {/* Left items and shipping */}
                      <div className="space-y-4">
                        <div>
                          <h5 className="font-extrabold text-slate-400 uppercase tracking-wider mb-2">Request Items</h5>
                          <div className="divide-y divide-slate-800/60 bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                            {order.items?.map((item: any) => (
                              <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex justify-between gap-3">
                                <span className="font-bold text-white">{item.product?.name || "Deleted Item"} x {item.quantity}</span>
                                <span className="font-black text-slate-300">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-extrabold text-slate-400 uppercase tracking-wider mb-1">Shipping Address</h5>
                          <p className="font-medium text-slate-300">{order.shippingAddress || "None recorded"}</p>
                        </div>
                      </div>

                      {/* Right user justifications and images */}
                      <div className="space-y-4">
                        <div>
                          <h5 className="font-extrabold text-slate-400 uppercase tracking-wider mb-2">Customer Justification</h5>
                          {isCancelRequest ? (
                            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 space-y-1">
                              <p className="font-bold text-rose-450">Reason selected: {order.cancellationReason}</p>
                            </div>
                          ) : (
                            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
                              <p className="font-bold text-indigo-455">Reason: {reason}</p>
                              <p className="text-slate-300 font-medium leading-relaxed">Description: {description}</p>
                              {imageUrl && (
                                <div className="mt-3">
                                  <p className="font-bold text-slate-500 mb-1.5 uppercase text-[10px]">Customer Proof Image:</p>
                                  <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="inline-block group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 hover:shadow-md transition">
                                    <img src={imageUrl} alt="Return justification preview" className="h-28 max-w-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <span className="text-white text-[10px] font-bold">Zoom Photo 🔍</span>
                                    </div>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Decision Panel */}
                        <div className="space-y-3 pt-3 border-t border-slate-800/60">
                          <h5 className="font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Decision Panel</h5>
                          <div>
                            <textarea
                              placeholder="Add review notes or instructions (optional)..."
                              className="w-full bg-slate-950/45 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 resize-none"
                              rows={2}
                              value={adminNotesInputs[order.id] || ""}
                              onChange={(e) => setAdminNotesInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                            />
                          </div>

                          <div className="flex gap-3 justify-end">
                            {isCancelRequest ? (
                              <>
                                <button
                                  onClick={() => handleRequestDecision(order.id, "PROCESSING")}
                                  disabled={updatingId === order.id}
                                  className="text-xs font-bold text-rose-450 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/30 px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                                >
                                  ❌ Reject Cancellation
                                </button>
                                <button
                                  onClick={() => handleRequestDecision(order.id, "CANCELLED")}
                                  disabled={updatingId === order.id}
                                  className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-4 py-2.5 rounded-xl shadow shadow-rose-600/10 transition cursor-pointer disabled:opacity-50"
                                >
                                  ✓ Approve Cancellation
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRequestDecision(order.id, "RETURN_REJECTED")}
                                  disabled={updatingId === order.id}
                                  className="text-xs font-bold text-indigo-400 bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-900/30 px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                                >
                                  ❌ Reject Return
                                </button>
                                <button
                                  onClick={() => handleRequestDecision(order.id, "RETURN_APPROVED")}
                                  disabled={updatingId === order.id}
                                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-xl shadow shadow-indigo-600/10 transition cursor-pointer disabled:opacity-50"
                                >
                                  ✓ Approve Return
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
