"use client";

import React, { useState, useEffect, useRef } from "react";

interface Message {
  sender: "user" | "ai";
  text: string;
}

export default function AdminAiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "### Hello Admin! I am your NextShop AI Agent. 🤖\nI can help you monitor inventory, manage products, and audit financials. Here are some quick commands you can click below or type in the chat:\n\n- *\"Show me the profit and loss report\"*\n- *\"Which products need restocking?\"*\n- *\"Summarize the reviews for Nike Shoes\"*\n- *\"Add product Rolex Submariner, category Luxury, price 950000, stock 3\"*"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages list to the bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10) // Send context of the last 10 messages
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages((prev) => [...prev, { sender: "ai", text: data.text }]);
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
      setLoading(false);
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
        formatted.push(<strong key={i} className="font-extrabold text-white">{parts[i]}</strong>);
      } else {
        const subparts = parts[i].split(/\*([\s\S]*?)\*/g);
        for (let j = 0; j < subparts.length; j++) {
          if (j % 2 === 1) {
            formatted.push(<em key={`${i}-${j}`} className="italic text-slate-300">{subparts[j]}</em>);
          } else {
            formatted.push(subparts[j]);
          }
        }
      }
    }
    return formatted;
  };

  // Simple HTML parser for Markdown elements
  const parseMarkdown = (markdown: string) => {
    const lines = markdown.split("\n");
    let inTable = false;
    let tableRows: string[][] = [];
    const elements: React.JSX.Element[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Table Row Parser
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

      // Headers (H3, H4)
      if (trimmed.startsWith("###")) {
        elements.push(<h3 key={idx} className="text-sm font-black text-indigo-300 mt-3 mb-1.5 uppercase tracking-wider">{formatInline(trimmed.replace(/^###\s*/, ""))}</h3>);
      } else if (trimmed.startsWith("####")) {
        elements.push(<h4 key={idx} className="text-xs font-black text-slate-200 mt-2 mb-1 uppercase tracking-wider">{formatInline(trimmed.replace(/^####\s*/, ""))}</h4>);
      }
      // Bullet list items
      else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <li key={idx} className="text-xs text-slate-200 ml-4 list-disc mb-1 leading-relaxed">
            {formatInline(trimmed.substring(2))}
          </li>
        );
      }
      // Numbered list items
      else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={idx} className="text-xs text-slate-200 ml-4 list-decimal mb-1 leading-relaxed">
            {formatInline(trimmed.replace(/^\d+\.\s*/, ""))}
          </li>
        );
      }
      // Code blocks
      else if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
        elements.push(
          <code key={idx} className="inline-block px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-mono rounded font-semibold my-1">
            {trimmed.replace(/`/g, "")}
          </code>
        );
      }
      // Paragraph spacing
      else if (trimmed !== "") {
        elements.push(<p key={idx} className="text-xs text-slate-200 leading-relaxed mb-2.5 font-medium">{formatInline(line)}</p>);
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
      <div key={keyIdx} className="overflow-x-auto my-3 border border-slate-800 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-slate-800 text-[11px] text-left">
          <thead className="bg-slate-950/60">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-bold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-transparent">
            {dataRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-950/40 transition">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-slate-300 font-medium">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl hover:shadow-indigo-500/35 hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer relative"
        >
          {isOpen ? (
            <span className="text-lg font-black">✕</span>
          ) : (
            <div className="relative">
              <span className="text-2xl">🤖</span>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* Floating Chat Assistant Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[420px] max-w-[calc(100vw-3rem)] h-[600px] bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden text-white animate-slide-in font-['Plus_Jakarta_Sans',sans-serif]">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-lg">🤖</div>
              <div>
                <h4 className="text-xs font-black tracking-wider uppercase">NextShop AI Agent</h4>
                <p className="text-[10px] text-indigo-200 font-bold flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Dynamic Agent Engine
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white text-sm font-black cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Quick suggestions area */}
          <div className="bg-slate-950/60 border-b border-slate-800/60 p-3 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => handleSendMessage("Show me the profit and loss report")}
              className="bg-slate-950/40 hover:bg-slate-950/80 text-[10px] font-bold text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              📊 Monthly Profit Summary
            </button>
            <button
              onClick={() => handleSendMessage("Which products need restocking?")}
              className="bg-slate-950/40 hover:bg-slate-950/80 text-[10px] font-bold text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              🚨 Inventory Restocking Report
            </button>
            <button
              onClick={() => handleSendMessage("Summarize the reviews for Nike Shoes")}
              className="bg-slate-950/40 hover:bg-slate-950/80 text-[10px] font-bold text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm transition cursor-pointer inline-block"
            >
              💬 Review Sentiment Check
            </button>
          </div>

          {/* Message List area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-transparent">
            {messages.map((msg, i) => {
              const isWriteSuccess = msg.text.includes("Database Write Success");
              const isUpdateSuccess = msg.text.includes("Database Update Success");

              return (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {isWriteSuccess || isUpdateSuccess ? (
                    /* Beautiful Action Confirmation Card */
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl text-xs space-y-2 text-emerald-950 shadow-sm max-w-[85%] rounded-bl-none animate-pulse-once">
                      <div className="flex items-center gap-2">
                        <span className="text-base">✅</span>
                        <span className="font-extrabold uppercase tracking-wider text-[10px] text-emerald-800">Database Action Success</span>
                      </div>
                      <div className="space-y-1 font-medium">
                        {parseMarkdown(msg.text)}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-xs ${
                        msg.sender === "user"
                          ? "bg-sky-600 text-white font-bold border border-sky-500 rounded-bl-none"
                          : "bg-slate-950/60 border border-slate-800 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      {parseMarkdown(msg.text)}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 rounded-bl-none shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-75" />
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-150" />
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-300" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">AI is parsing inventory...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input footer */}
          <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-800 bg-slate-950/60 flex gap-2 backdrop-blur-xs">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask for stock warnings, profit loss or to add products..."
              className="flex-1 bg-slate-950/45 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-slate-950/80 transition"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
