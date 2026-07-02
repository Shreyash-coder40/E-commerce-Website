"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Message {
  sender: "user" | "ai";
  text: string;
}

export default function AiAssistantConsole() {
  // Stats for the sidebar command panel
  const [stats, setStats] = useState<any>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "### Welcome to the NextShop AI Assistant Command Console! 🤖\nI am your agentic assistant, connected directly to the store's databases (Products, Orders, Stock levels, and Reviews).\n\nYou can query store stats or ask me to make catalog edits. Try asking:\n- *\"Show me the profit and loss report\"*\n- *\"Which products need restocking?\"*\n- *\"Summarize the reviews for Nike Shoes\"*\n- *\"Add product Rolex Submariner, category Luxury, price 950000, stock 3\"*"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch statistics on load
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loadingChat]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const prodRes = await fetch("/api/products");
      const prodData = await prodRes.json();
      if (prodRes.ok && prodData.success) {
        const prods = prodData.products || [];
        const low = prods.filter((p: any) => p.stock > 0 && p.stock <= 5).length;
        const out = prods.filter((p: any) => p.stock === 0).length;
        
        setStats({
          totalProducts: prods.length,
          lowStockCount: low,
          outOfStockCount: out
        });
      }
    } catch (err) {
      console.error("Stats check failed:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loadingChat) return;

    const userMsg: Message = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoadingChat(true);

    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10)
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages((prev) => [...prev, { sender: "ai", text: data.text }]);
        // Refresh catalog statistics if a product was added/updated
        if (data.product) {
          fetchStats();
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: `🚨 **Error**: ${data.error || "Failed to contact chat assistant."}` }
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "🚨 **Error**: Connection failed. Please check network settings." }
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const formatInline = (text: string) => {
    let formatted: React.ReactNode[] = [];
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        formatted.push(<strong key={i} className="font-extrabold text-gray-950">{parts[i]}</strong>);
      } else {
        const subparts = parts[i].split(/\*([\s\S]*?)\*/g);
        for (let j = 0; j < subparts.length; j++) {
          if (j % 2 === 1) {
            formatted.push(<em key={`${i}-${j}`} className="italic text-gray-700">{subparts[j]}</em>);
          } else {
            formatted.push(subparts[j]);
          }
        }
      }
    }
    return formatted;
  };

  const parseMarkdown = (markdown: string) => {
    const lines = markdown.split("\n");
    let inTable = false;
    let tableRows: string[][] = [];
    const elements: React.JSX.Element[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        inTable = true;
        const cells = trimmed
          .split("|")
          .map((c) => c.trim())
          .filter((c, i, arr) => i > 0 && i < arr.length - 1);
        
        if (cells.every((c) => /^:?-+:?$/.test(c))) {
          return;
        }

        tableRows.push(cells);
        return;
      } else if (inTable) {
        elements.push(renderTable(tableRows, idx));
        tableRows = [];
        inTable = false;
      }

      if (trimmed.startsWith("###")) {
        elements.push(<h3 key={idx} className="text-sm font-black text-indigo-600 mt-3 mb-1.5 uppercase tracking-wider">{formatInline(trimmed.replace(/^###\s*/, ""))}</h3>);
      } else if (trimmed.startsWith("####")) {
        elements.push(<h4 key={idx} className="text-xs font-black text-slate-800 mt-2 mb-1 uppercase tracking-wider">{formatInline(trimmed.replace(/^####\s*/, ""))}</h4>);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <li key={idx} className="text-xs text-gray-700 ml-4 list-disc mb-1 leading-relaxed">
            {formatInline(trimmed.substring(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={idx} className="text-xs text-gray-700 ml-4 list-decimal mb-1 leading-relaxed">
            {formatInline(trimmed.replace(/^\d+\.\s*/, ""))}
          </li>
        );
      } else if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
        elements.push(
          <code key={idx} className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-mono rounded font-semibold my-1">
            {trimmed.replace(/`/g, "")}
          </code>
        );
      } else if (trimmed !== "") {
        elements.push(<p key={idx} className="text-xs text-gray-755 leading-relaxed mb-2.5 font-medium">{formatInline(line)}</p>);
      }
    });

    if (inTable && tableRows.length > 0) {
      elements.push(renderTable(tableRows, lines.length));
    }

    return elements;
  };

  const renderTable = (rows: string[][], keyIdx: number) => {
    if (rows.length === 0) return <div key={keyIdx} />;
    const headers = rows[0];
    const dataRows = rows.slice(1);

    return (
      <div key={keyIdx} className="overflow-x-auto my-3 border border-gray-250 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-[11px] text-left">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-bold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 bg-white">
            {dataRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50 transition">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-gray-800 font-medium">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header navigation bar */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
              🤖 NextShop AI Agent Command Center
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              Audit financials, execute database CRUD writes, and forecast inventory via LLM processing.
            </p>
          </div>
          <div>
            <Link
              href="/admin/dashboard"
              className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Console layout Split grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Panel: Statistics & Operations Command Center */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Console Parameters</h3>
              
              <div className="divide-y divide-gray-100">
                <div className="py-2.5 first:pt-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Total Catalog Items</p>
                  <p className="text-lg font-black text-slate-850 mt-0.5">
                    {loadingStats ? "..." : stats.totalProducts} products
                  </p>
                </div>
                <div className="py-2.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Out of Stock</p>
                  <p className="text-lg font-black text-rose-600 mt-0.5">
                    {loadingStats ? "..." : stats.outOfStockCount} items
                  </p>
                </div>
                <div className="py-2.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Low Stock Alerts</p>
                  <p className="text-lg font-black text-amber-600 mt-0.5">
                    {loadingStats ? "..." : stats.lowStockCount} items
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[9px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Database Sync Active
                </span>
              </div>
            </div>

            {/* AI Prompt suggest deck */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Suggested Audits</h4>
              <div className="space-y-2">
                <button
                  onClick={() => handleSendMessage("Show me the profit and loss report")}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 text-xs font-bold text-gray-700 border border-gray-200 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  📊 Profit & Loss analysis
                </button>
                <button
                  onClick={() => handleSendMessage("Which products need restocking based on sales velocity?")}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 text-xs font-bold text-gray-700 border border-gray-200 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  🚨 Inventory Restocking warning
                </button>
                <button
                  onClick={() => handleSendMessage("Summarize the reviews for Nike Shoes")}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 text-xs font-bold text-gray-700 border border-gray-200 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  💬 Review Sentiment Check
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Conversation Terminal Dashboard */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col h-[600px] overflow-hidden">
            {/* Terminal Top bar */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest font-mono">NextShop_Agent_CLI_v1.0.0</span>
              </div>
              <button
                onClick={() => setMessages([messages[0]])}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 cursor-pointer"
              >
                Clear Terminal log
              </button>
            </div>

            {/* Conversation list logs */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {messages.map((msg, i) => {
                const isWriteSuccess = msg.text.includes("Database Write Success");
                const isUpdateSuccess = msg.text.includes("Database Update Success");

                return (
                  <div
                    key={i}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {isWriteSuccess || isUpdateSuccess ? (
                      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl text-xs space-y-2 text-emerald-950 shadow-sm max-w-[85%] rounded-bl-none animate-pulse-once">
                        <div className="flex items-center gap-2">
                          <span className="text-base">✅</span>
                          <span className="font-extrabold uppercase tracking-wider text-[10px] text-emerald-800">Database Action Confirmed</span>
                        </div>
                        <div className="space-y-1 font-medium">
                          {parseMarkdown(msg.text)}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-xs ${
                          msg.sender === "user"
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-white border border-gray-200 text-slate-800 rounded-bl-none"
                        }`}
                      >
                        {parseMarkdown(msg.text)}
                      </div>
                    )}
                  </div>
                );
              })}
              {loadingChat && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 rounded-bl-none shadow-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce delay-75" />
                      <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce delay-150" />
                      <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce delay-300" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold font-mono">Agent reasoning catalog metrics...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Console Box */}
            <form onSubmit={handleFormSubmit} className="p-4 border-t border-gray-200 bg-white flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type command (e.g. Price audits, inventory warning alerts, product creation)..."
                className="flex-1 bg-slate-50 border border-gray-250 rounded-xl px-4 py-3 text-xs text-black font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loadingChat || !inputValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40"
              >
                Execute
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
