"use client";

import React, { useState } from "react";

interface AdminOrderManagerProps {
  initialOrders: any[];
  initialCustomers: any[];
}

export default function AdminOrderManager({ initialOrders, initialCustomers }: AdminOrderManagerProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "customers">("orders");
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [customers, setCustomers] = useState<any[]>(initialCustomers);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const getStatusClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "SHIPPED":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "DELIVERED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const selectedCustomerDetails = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Navigation tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50/50">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition ${
            activeTab === "orders"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          📦 Global Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition ${
            activeTab === "customers"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          👥 User-Specific History ({customers.length})
        </button>
      </div>

      <div className="p-6">
        {activeTab === "orders" ? (
          /* Feature 3: Global Orders View */
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-12">No orders recorded in the system.</p>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    className="border border-gray-150 rounded-2xl overflow-hidden hover:border-gray-300 transition"
                  >
                    {/* Compact row summary */}
                    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                      <div className="truncate flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-gray-950 text-sm">
                            Order Reference ID: {order.id.substring(0, 8)}...
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusClass(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          User: <strong className="text-gray-800">{order.user?.name || "Guest"}</strong> ({order.user?.email})
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400 font-bold">TOTAL AMOUNT</p>
                          <p className="text-base font-black text-indigo-600">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                        </div>
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="text-xs bg-white border border-gray-200 px-3.5 py-2 rounded-xl font-bold hover:bg-gray-50 shadow-sm transition"
                        >
                          {isExpanded ? "Collapse" : "Manage"}
                        </button>
                      </div>
                    </div>

                    {/* Detailed expanded content */}
                    {isExpanded && (
                      <div className="p-6 border-t border-gray-150 bg-white space-y-6 text-sm">
                        {/* Address snapshot information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-150">
                          <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Snapshots</h4>
                            {order.shippingAddress ? (
                              <div className="space-y-1 font-medium text-gray-800">
                                <p>📍 Address Details: <strong>{order.shippingAddress}</strong></p>
                                <p>✉️ Shipping Pincode: <strong>{order.pincode}</strong></p>
                                {order.estimatedDelivery && (
                                  <p>📅 Delivery Due: <strong>{new Date(order.estimatedDelivery).toLocaleDateString()}</strong></p>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-xs">No address recorded for this order.</p>
                            )}
                          </div>

                          {/* Quick inline editor transition controls */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inline Status Editor</h4>
                            <div className="flex items-center gap-3">
                              <select
                                value={order.status}
                                disabled={updatingId === order.id || ["DELIVERED", "CANCELLED"].includes(order.status)}
                                onChange={(e) => handleStatusChange(order.id, order.status, e.target.value)}
                                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                              >
                                <option value="PENDING">Pending</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                              {updatingId === order.id && <span className="text-xs text-indigo-600 font-bold animate-pulse">Syncing...</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">
                              Note: Changing status will trigger transactional delivery notifications automatically.
                            </p>
                          </div>
                        </div>

                        {/* Items list */}
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Invoice Items</h4>
                          <div className="divide-y divide-gray-100">
                            {order.items?.map((item: any) => (
                              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-bold text-gray-900">{item.product?.name || "Deleted Product Item"}</p>
                                  <p className="text-gray-500 mt-0.5">Quantity: {item.quantity} pieces</p>
                                </div>
                                <p className="font-black text-gray-800">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Financial calculation summary breakdown */}
                        <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1 text-gray-600 border border-gray-150">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{Number(order.totalAmount - (order.shippingCost || 0) - (order.taxAmount || 0)).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST Tax:</span>
                            <span>₹{Number(order.taxAmount || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shipping Costs:</span>
                            <span>{order.shippingCost === 0 ? "FREE" : `₹${order.shippingCost}`}</span>
                          </div>
                          <div className="flex justify-between font-black text-indigo-600 border-t border-gray-200 pt-2 mt-2">
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
        ) : (
          /* Feature 4: User-Specific History View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left list: Customers directory */}
            <div className="lg:col-span-1 border border-gray-150 rounded-2xl p-4 divide-y divide-gray-100 max-h-[600px] overflow-y-auto bg-gray-50/50">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-3">User Directory</h4>
              {customers.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-6">No purchase customers found.</p>
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
                          : "bg-white border border-gray-100 hover:bg-gray-100 text-slate-800"
                      }`}
                    >
                      <p className="font-extrabold truncate">{customer.name || "Anonymous Shopper"}</p>
                      <p className={`mt-0.5 truncate ${isSelected ? "text-indigo-200" : "text-gray-400"}`}>
                        {customer.email}
                      </p>
                      <div className="flex justify-between mt-3 font-semibold">
                        <span>{customer.orders.length} orders</span>
                        <span className={isSelected ? "text-white font-extrabold" : "text-indigo-600 font-extrabold"}>
                          Spent: ₹{totalSpent.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Selected customer details profile */}
            <div className="lg:col-span-2 space-y-6">
              {selectedCustomerDetails ? (
                <div className="space-y-6">
                  {/* Customer basic profile details card */}
                  <div className="bg-slate-50 border border-gray-150 p-6 rounded-2xl space-y-1">
                    <h3 className="text-base font-black text-gray-950">Customer Profile details</h3>
                    <p className="text-sm font-semibold text-gray-700">Name: {selectedCustomerDetails.name || "Anonymous Shopper"}</p>
                    <p className="text-xs text-gray-500">Email: {selectedCustomerDetails.email}</p>
                    <p className="text-[11px] text-gray-400">Created: {new Date(selectedCustomerDetails.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Customer Orders & Inline Status Updates */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Purchase Order History</h4>
                    {selectedCustomerDetails.orders.length === 0 ? (
                      <p className="text-center text-xs text-gray-500 py-6">This user has not placed any orders.</p>
                    ) : (
                      selectedCustomerDetails.orders.map((order: any) => (
                        <div
                          key={order.id}
                          className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 text-xs">
                            <div>
                              <p className="font-extrabold text-gray-950">
                                ID: #{order.id.substring(0, 8)} ({new Date(order.createdAt).toLocaleDateString()})
                              </p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusClass(order.status)}`}>
                                {order.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Direct access inline updates inside profile */}
                              <select
                                value={order.status}
                                disabled={updatingId === order.id || ["DELIVERED", "CANCELLED"].includes(order.status)}
                                onChange={(e) => handleStatusChange(order.id, order.status, e.target.value)}
                                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                              >
                                <option value="PENDING">Pending</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                              {updatingId === order.id && <span className="text-[10px] text-indigo-600 font-bold animate-pulse">Saving...</span>}
                            </div>
                          </div>

                          {/* Items listing */}
                          <div className="space-y-1.5">
                            {order.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-xs font-medium text-gray-700">
                                <span>{item.product?.name || "Deleted Product"} x {item.quantity}</span>
                                <span className="text-gray-950 font-bold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center text-xs font-extrabold text-indigo-600 border-t border-gray-100 pt-3">
                            <span>Grand Total:</span>
                            <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-20 bg-slate-50 rounded-2xl border border-gray-100">
                  👈 Select a customer from the User Directory list to view profile order logs and manage statuses.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
