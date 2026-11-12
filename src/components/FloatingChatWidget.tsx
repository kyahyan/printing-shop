"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import {
  Headset,
  Maximize2,
  MessageSquare,
  Minimize2,
  Send,
  Ticket,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { TicketPriority } from "@/types/printshop";

const ACTIVE_TICKET_STORAGE = "clayjar_customer_active_ticket_v1";

export function FloatingChatWidget() {
  const pathname = usePathname();
  const {
    currentUser,
    tickets,
    openChatTicket,
    sendChatMessage,
    getQueuePosition,
  } = usePrintShop();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // New Ticket Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Quotation Help");
  const [linkedRef, setLinkedRef] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [firstMessage, setFirstMessage] = useState("");
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_TICKET_STORAGE);
    if (saved) setActiveTicketId(saved);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.fullName);
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  // Hide widget on staff consoles and the full-screen /chat page
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/staff")
  ) {
    return null;
  }

  const activeTicket = tickets.find((t) => t.id === activeTicketId) ?? null;
  const queuePos = activeTicket ? getQueuePosition(activeTicket.id) : 0;

  const handleStartTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstMessage.trim()) return;
    const tkt = await openChatTicket({
      customerName: name,
      customerEmail: email,
      topic,
      linkedReference: linkedRef || undefined,
      priority,
      initialMessage: firstMessage,
    });
    setActiveTicketId(tkt.id);
    localStorage.setItem(ACTIVE_TICKET_STORAGE, tkt.id);
    setFirstMessage("");
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    await sendChatMessage(
      activeTicket.id,
      replyText,
      "customer",
      activeTicket.customerName
    );
    setReplyText("");
  };

  const startFreshTicket = () => {
    setActiveTicketId(null);
    localStorage.removeItem(ACTIVE_TICKET_STORAGE);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <div className="flex h-[510px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-separator bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-accent px-4 py-3 text-accent-foreground">
            <div className="flex items-center gap-2.5">
              <Headset className="h-5 w-5" />
              <div className="leading-tight">
                <div className="text-sm font-bold">Print Desk Live Queue</div>
                <div className="text-[11px] opacity-85">
                  Ticketing & Quotation Support
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                className="rounded-lg p-1.5 hover:bg-white/15"
                title="Open full-screen chat"
              >
                <Maximize2 className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/15"
                aria-label="Minimize chat"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {activeTicket ? (
            <>
              {/* Ticket Queue Status Banner */}
              <div className="flex items-center justify-between border-b border-separator bg-surface-secondary px-3.5 py-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Ticket className="h-3.5 w-3.5 text-accent" />
                  <span className="font-mono font-bold text-foreground">
                    {activeTicket.ticketNumber}
                  </span>
                  {activeTicket.status === "queued" && (
                    <Chip size="sm" color="warning" variant="soft">
                      #{queuePos || 1} in Queue
                    </Chip>
                  )}
                  {activeTicket.status === "active" && (
                    <Chip size="sm" color="success" variant="soft">
                      {activeTicket.assignedEmployeeName || "Connected"}
                    </Chip>
                  )}
                  {(activeTicket.status === "resolved" ||
                    activeTicket.status === "closed") && (
                    <Chip size="sm" color="default" variant="soft">
                      Resolved
                    </Chip>
                  )}
                </div>
                <button
                  type="button"
                  onClick={startFreshTicket}
                  className="text-[11px] font-medium text-accent hover:underline"
                >
                  New Ticket
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
                {activeTicket.messages.map((msg) => {
                  if (msg.senderRole === "system") {
                    return (
                      <div
                        key={msg.id}
                        className="rounded-lg bg-surface-secondary px-3 py-1.5 text-center text-[11px] text-muted"
                      >
                        {msg.message}
                      </div>
                    );
                  }
                  const isCustomer = msg.senderRole === "customer";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isCustomer ? "items-end" : "items-start"
                      }`}
                    >
                      <span className="mb-0.5 text-[10px] text-muted">
                        {msg.senderName}
                      </span>
                      <div
                        className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                          isCustomer
                            ? "bg-accent text-accent-foreground rounded-br-sm"
                            : "bg-surface-secondary text-foreground rounded-bl-sm border border-separator"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input */}
              {activeTicket.status !== "closed" &&
              activeTicket.status !== "resolved" ? (
                <form
                  onSubmit={handleSendReply}
                  className="flex items-center gap-2 border-t border-separator p-3"
                >
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-separator bg-surface-secondary/60 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isIconOnly
                    aria-label="Send message"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              ) : (
                <div className="border-t border-separator p-3 text-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={startFreshTicket}
                  >
                    Open Another Support Ticket
                  </Button>
                </div>
              )}
            </>
          ) : (
            <form
              onSubmit={handleStartTicket}
              className="flex-1 space-y-3 overflow-y-auto p-4 text-xs"
            >
              <p className="text-muted">
                Start a live support ticket to join the queue for custom
                quotations, file checks, or order updates.
              </p>
              <div>
                <label className="mb-1 block font-medium text-foreground">
                  Your Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria Clara"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/60 px-3 py-2 text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-foreground">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/60 px-3 py-2 text-foreground outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-foreground">
                    Topic
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-xl border border-separator bg-surface-secondary/60 px-2.5 py-2 text-foreground"
                  >
                    <option value="Quotation Help">Quotation Help</option>
                    <option value="Pricing Inquiry">Price Per Size</option>
                    <option value="Artwork / File Check">Artwork Check</option>
                    <option value="Order Follow-up">Order Follow-up</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-foreground">
                    Urgency
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as TicketPriority)
                    }
                    className="w-full rounded-xl border border-separator bg-surface-secondary/60 px-2.5 py-2 text-foreground"
                  >
                    <option value="normal">Standard</option>
                    <option value="high">Rush Job</option>
                    <option value="urgent">Same-Day Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium text-foreground">
                  Reference # (Optional)
                </label>
                <input
                  value={linkedRef}
                  onChange={(e) => setLinkedRef(e.target.value)}
                  placeholder="e.g., QT-... or ORD-..."
                  className="w-full rounded-xl border border-separator bg-surface-secondary/60 px-3 py-2 font-mono text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-foreground">
                  How can our print team help? *
                </label>
                <textarea
                  required
                  rows={2}
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="Tell us the size, material, or question..."
                  className="w-full rounded-xl border border-separator bg-surface-secondary/60 px-3 py-2 text-foreground outline-none focus:border-accent"
                />
              </div>
              <Button type="submit" variant="primary" fullWidth>
                Join Live Support Queue
              </Button>
            </form>
          )}
        </div>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="rounded-full shadow-xl px-5"
          onPress={() => setIsOpen(true)}
        >
          <MessageSquare className="h-5 w-5" />
          <span>
            {activeTicket && activeTicket.status !== "resolved"
              ? `${activeTicket.ticketNumber} (${
                  activeTicket.status === "queued"
                    ? `#${queuePos || 1} in Queue`
                    : "Active"
                })`
              : "Live Print Chat"}
          </span>
        </Button>
      )}
    </div>
  );
}

