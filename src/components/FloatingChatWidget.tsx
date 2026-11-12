"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import {
  AlertCircle,
  Maximize2,
  MessageSquare,
  Minimize2,
  Send,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { TicketPriority } from "@/types/printshop";
import {
  getActiveStoredTicketId,
  setActiveStoredTicketId,
} from "@/lib/security";

export function FloatingChatWidget() {
  const pathname = usePathname();
  const {
    currentUser,
    tickets,
    openChatTicket,
    sendChatMessage,
    refreshTicketSession,
    getQueuePosition,
  } = usePrintShop();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Ticket Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Quotation Help");
  const [linkedRef, setLinkedRef] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [firstMessage, setFirstMessage] = useState("");
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const saved = getActiveStoredTicketId();
    if (saved) setActiveTicketId(saved);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.fullName);
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  const activeTicket = tickets.find((t) => t.id === activeTicketId) ?? null;

  useEffect(() => {
    if (!isOpen || !activeTicket) return;
    if (activeTicket.status === "closed") return;

    void refreshTicketSession(activeTicket.id);
    const interval = setInterval(() => {
      void refreshTicketSession(activeTicket.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTicket?.id, activeTicket?.status, isOpen, refreshTicketSession]);

  // Hide widget on staff workspaces and the dedicated /chat page
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/staff")
  ) {
    return null;
  }

  const queuePos = activeTicket
    ? activeTicket.queuePosition ?? (getQueuePosition(activeTicket.id) || 1)
    : 0;

  const handleStartTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstMessage.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const tkt = await openChatTicket({
        customerName: name,
        customerEmail: email,
        topic,
        linkedReference: linkedRef || undefined,
        priority,
        initialMessage: firstMessage,
      });
      setActiveTicketId(tkt.id);
      setActiveStoredTicketId(tkt.id);
      setFirstMessage("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start support ticket."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    setError(null);
    const text = replyText;
    setReplyText("");
    try {
      await sendChatMessage(
        activeTicket.id,
        text,
        "customer",
        activeTicket.customerName
      );
    } catch (err) {
      setReplyText(text);
      setError(err instanceof Error ? err.message : "Unable to send message.");
    }
  };

  const startFreshTicket = () => {
    setError(null);
    setActiveTicketId(null);
    setActiveStoredTicketId(null);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <div className="flex h-[500px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-separator bg-surface shadow-overlay">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-separator bg-foreground px-4 py-3 text-background">
            <div>
              <div className="text-xs font-semibold tracking-tight">
                Support & Estimating Desk
              </div>
              <div className="text-[11px] opacity-75">
                Live Ticket Queue
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                className="rounded p-1.5 opacity-80 transition-opacity hover:opacity-100"
                title="Open full support view"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1.5 opacity-80 transition-opacity hover:opacity-100"
                aria-label="Minimize support window"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 border-b border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTicket ? (
            <>
              {/* Ticket Queue Status Banner */}
              <div className="flex items-center justify-between border-b border-separator bg-surface-secondary px-3.5 py-2 text-xs tabular-nums">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-foreground">
                    {activeTicket.ticketNumber}
                  </span>
                  {activeTicket.status === "queued" && (
                    <Chip size="sm" color="warning" variant="soft">
                      Queue #{queuePos}
                    </Chip>
                  )}
                  {activeTicket.status === "active" && (
                    <Chip size="sm" color="success" variant="soft">
                      {activeTicket.assignedEmployeeName || "Active"}
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
                        className="rounded-md border border-separator bg-surface-secondary/50 px-3 py-1.5 text-center text-[11px] text-muted"
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
                        className={`max-w-[82%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          isCustomer
                            ? "bg-foreground text-background"
                            : "border border-separator bg-surface-secondary text-foreground"
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
                    placeholder="Write a message..."
                    className="h-9 flex-1 rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
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
                    Open New Ticket
                  </Button>
                </div>
              )}
            </>
          ) : (
            <form
              onSubmit={handleStartTicket}
              className="flex-1 space-y-3 overflow-y-auto p-4 text-xs"
            >
              <p className="leading-relaxed text-muted">
                Open a ticket to consult on custom quotations, artwork bleeds,
                or active orders.
              </p>
              <div>
                <label className="mb-1 block font-medium text-foreground">
                  Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-foreground outline-none focus:border-accent"
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
                  placeholder="name@company.com"
                  className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-foreground outline-none focus:border-accent"
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
                    className="h-9 w-full rounded-lg border border-separator bg-background px-2.5 text-foreground outline-none focus:border-accent"
                  >
                    <option value="Quotation Help">Quotation Help</option>
                    <option value="Pricing Inquiry">Pricing Schedule</option>
                    <option value="Artwork / File Check">Pre-Press Check</option>
                    <option value="Order Follow-up">Order Status</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-foreground">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as TicketPriority)
                    }
                    className="h-9 w-full rounded-lg border border-separator bg-background px-2.5 text-foreground outline-none focus:border-accent"
                  >
                    <option value="normal">Standard</option>
                    <option value="high">Time-Sensitive</option>
                    <option value="urgent">Same-Day Rush</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium text-foreground">
                  Reference Code (Optional)
                </label>
                <input
                  value={linkedRef}
                  onChange={(e) => setLinkedRef(e.target.value)}
                  placeholder="QT-... or ORD-..."
                  className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-foreground outline-none placeholder:font-sans focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-foreground">
                  Inquiry Details *
                </label>
                <textarea
                  required
                  rows={2}
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="Describe your specifications or question..."
                  className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isDisabled={submitting}
              >
                {submitting ? "Connecting..." : "Enter Support Queue"}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <Button
          variant="primary"
          size="md"
          className="rounded-lg shadow-overlay px-4"
          onPress={() => setIsOpen(true)}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="tabular-nums">
            {activeTicket && activeTicket.status !== "resolved"
              ? `${activeTicket.ticketNumber} (${
                  activeTicket.status === "queued"
                    ? `Queue #${queuePos}`
                    : "Active"
                })`
              : "Support Desk"}
          </span>
        </Button>
      )}
    </div>
  );
}
