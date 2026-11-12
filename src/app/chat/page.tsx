"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import {
  Clock,
  Headset,
  MessageSquare,
  Plus,
  Send,
  Ticket,
  Users,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { TicketPriority } from "@/types/printshop";

const ACTIVE_TICKET_STORAGE = "clayjar_customer_active_ticket_v1";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";
  const ticketFromUrl = searchParams.get("ticket") || "";

  const {
    currentUser,
    users,
    tickets,
    openChatTicket,
    sendChatMessage,
    getQueuePosition,
  } = usePrintShop();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  // New Ticket Form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [topic, setTopic] = useState("Quotation Help");
  const [linkedRef, setLinkedRef] = useState(refFromUrl);
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [initialMessage, setInitialMessage] = useState("");
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (refFromUrl) {
      setLinkedRef(refFromUrl);
      setCreatingNew(true);
    }
  }, [refFromUrl]);

  useEffect(() => {
    if (ticketFromUrl) {
      setSelectedTicketId(ticketFromUrl);
      setCreatingNew(false);
      return;
    }
    const saved = localStorage.getItem(ACTIVE_TICKET_STORAGE);
    if (saved) {
      setSelectedTicketId(saved);
    }
  }, [ticketFromUrl]);

  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.fullName);
      setCustomerEmail(currentUser.email);
    }
  }, [currentUser]);

  const customerTickets = useMemo(() => {
    if (currentUser) {
      return tickets.filter(
        (t) =>
          t.customerId === currentUser.id ||
          t.customerEmail.toLowerCase() === currentUser.email.toLowerCase() ||
          t.id === selectedTicketId
      );
    }
    return tickets.filter((t) => t.id === selectedTicketId);
  }, [currentUser, selectedTicketId, tickets]);

  const activeTicket =
    tickets.find((t) => t.id === selectedTicketId) ??
    customerTickets[0] ??
    null;

  const onlineSpecialists = users.filter(
    (u) =>
      (u.role === "employee" || u.role === "super_admin") &&
      u.isActive &&
      u.isOnline
  );
  const totalQueued = tickets.filter((t) => t.status === "queued").length;

  const handleOpenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialMessage.trim()) return;
    const created = await openChatTicket({
      customerName,
      customerEmail,
      topic,
      linkedReference: linkedRef || undefined,
      priority,
      initialMessage,
    });
    setSelectedTicketId(created.id);
    localStorage.setItem(ACTIVE_TICKET_STORAGE, created.id);
    setCreatingNew(false);
    setInitialMessage("");
  };

  const handleSend = async (e: React.FormEvent) => {
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-separator pb-5">
        <div>
          <Chip size="sm" color="accent" variant="soft">
            Queued Support & Pre-Press Ticketing
          </Chip>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            Customer Live Chat & Support Queue
          </h1>
          <p className="mt-1 text-sm text-muted">
            Open a support ticket to enter the live print specialist queue. Your
            queue position updates automatically as staff claim tickets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-separator bg-surface px-3.5 py-2 text-xs">
            <Users className="h-4 w-4 text-emerald-500" />
            <span>
              <strong>{onlineSpecialists.length}</strong> Specialists Online •{" "}
              <strong>{totalQueued}</strong> in Queue
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onPress={() => setCreatingNew(true)}
          >
            <Plus className="h-4 w-4" />
            New Chat Ticket
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar: My Tickets & Queue Info */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="border border-separator bg-surface p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Your Support Tickets
            </div>
            {customerTickets.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">
                No active tickets in this session yet. Start a ticket on the
                right to join the queue!
              </p>
            ) : (
              <div className="space-y-2">
                {customerTickets.map((t) => {
                  const pos = getQueuePosition(t.id);
                  const isSelected =
                    !creatingNew && activeTicket?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        setCreatingNew(false);
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-accent bg-accent/10"
                          : "border-separator bg-surface-secondary/40 hover:border-accent/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-accent">
                          {t.ticketNumber}
                        </span>
                        <Chip
                          size="sm"
                          color={
                            t.status === "active"
                              ? "success"
                              : t.status === "queued"
                              ? "warning"
                              : "default"
                          }
                          variant="soft"
                        >
                          {t.status === "queued"
                            ? `#${pos || 1} in Queue`
                            : t.status}
                        </Chip>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-foreground">
                        {t.topic}
                      </div>
                      {t.linkedReference && (
                        <div className="text-[11px] font-mono text-muted">
                          Ref: {t.linkedReference}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="border border-separator bg-surface p-4 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Clock className="h-4 w-4 text-accent" />
              How Our Chat Queue Works
            </div>
            <p className="text-muted leading-relaxed">
              1. Submit your topic & optional Quotation/Order Reference Number.
            </p>
            <p className="text-muted leading-relaxed">
              2. Receive a <code className="font-mono">TKT-XXXX</code> number and
              live queue position.
            </p>
            <p className="text-muted leading-relaxed">
              3. A Front Desk or Pre-Press employee claims your ticket from the
              Employee Console and responds in real time.
            </p>
          </Card>
        </div>

        {/* Right Main Panel: New Ticket Form OR Live Chat Room */}
        <div className="lg:col-span-8">
          {creatingNew || !activeTicket ? (
            <Card className="border border-separator bg-surface p-6">
              <h2 className="text-lg font-bold text-foreground">
                Open a Queued Support Ticket
              </h2>
              <p className="mt-1 text-xs text-muted">
                Provide your inquiry details below so the right print specialist
                can claim your chat.
              </p>

              <form onSubmit={handleOpenTicket} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Your Name *
                    </label>
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Camille Soriano"
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="camille@company.com"
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Support Topic
                    </label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2.5 text-sm text-foreground"
                    >
                      <option value="Quotation Help">Quotation Help</option>
                      <option value="Pricing Inquiry">
                        Price Per Size Question
                      </option>
                      <option value="Artwork / File Check">
                        Artwork / Bleed Check
                      </option>
                      <option value="Order Follow-up">Order Follow-up</option>
                      <option value="General Support">General Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Linked Reference # (Optional)
                    </label>
                    <input
                      value={linkedRef}
                      onChange={(e) => setLinkedRef(e.target.value)}
                      placeholder="QT-2026-... or ORD-2026-..."
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Job Urgency
                    </label>
                    <select
                      value={priority}
                      onChange={(e) =>
                        setPriority(e.target.value as TicketPriority)
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2.5 text-sm text-foreground"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High (Deadline Soon)</option>
                      <option value="urgent">Urgent (Same-Day Rush)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Initial Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    placeholder="Describe your size, quantity, artwork setup question, or order update request..."
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {activeTicket && (
                    <Button
                      variant="ghost"
                      onPress={() => setCreatingNew(false)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" variant="primary">
                    <MessageSquare className="h-4 w-4" />
                    Enter Support Queue
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="flex h-[580px] flex-col overflow-hidden border border-separator bg-surface p-0">
              {/* Active Ticket Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator bg-surface-secondary/60 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {activeTicket.ticketNumber}
                      </span>
                      <span className="text-xs text-muted">
                        • {activeTicket.topic}
                      </span>
                      {activeTicket.linkedReference && (
                        <Chip size="sm" color="accent" variant="soft">
                          Ref: {activeTicket.linkedReference}
                        </Chip>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {activeTicket.status === "queued"
                        ? `Waiting in Queue — Position #${
                            getQueuePosition(activeTicket.id) || 1
                          }`
                        : activeTicket.status === "active"
                        ? `Connected with ${
                            activeTicket.assignedEmployeeName || "Print Staff"
                          }`
                        : "Ticket Resolved"}
                    </div>
                  </div>
                </div>

                <Chip
                  color={
                    activeTicket.status === "active"
                      ? "success"
                      : activeTicket.status === "queued"
                      ? "warning"
                      : "default"
                  }
                  variant="soft"
                >
                  {activeTicket.status === "queued"
                    ? `Queue #${getQueuePosition(activeTicket.id) || 1}`
                    : activeTicket.status.toUpperCase()}
                </Chip>
              </div>

              {/* Queue Banner when waiting */}
              {activeTicket.status === "queued" && (
                <div className="flex items-center justify-between bg-amber-500/10 px-5 py-2.5 text-xs text-amber-600 dark:text-amber-400 border-b border-amber-500/20">
                  <span className="flex items-center gap-2">
                    <Headset className="h-4 w-4" />
                    You are currently{" "}
                    <strong>
                      #{getQueuePosition(activeTicket.id) || 1} in the support
                      queue
                    </strong>
                    . You can keep adding details below while waiting!
                  </span>
                  <span>Est. wait: ~2–5 mins</span>
                </div>
              )}

              {/* Messages Thread */}
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {activeTicket.messages.map((msg) => {
                  if (msg.senderRole === "system") {
                    return (
                      <div
                        key={msg.id}
                        className="mx-auto max-w-md rounded-full bg-surface-secondary px-4 py-1 text-center text-[11px] text-muted"
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
                      <span className="mb-1 text-[11px] text-muted">
                        {msg.senderName} •{" "}
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isCustomer
                            ? "bg-accent text-accent-foreground rounded-br-xs"
                            : "border border-separator bg-surface-secondary text-foreground rounded-bl-xs"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              {activeTicket.status !== "resolved" &&
              activeTicket.status !== "closed" ? (
                <form
                  onSubmit={handleSend}
                  className="flex items-center gap-2 border-t border-separator p-4"
                >
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a message to our print desk..."
                    className="flex-1 rounded-xl border border-separator bg-surface-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                  <Button type="submit" variant="primary">
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </form>
              ) : (
                <div className="border-t border-separator bg-surface-secondary/40 p-4 text-center text-xs text-muted">
                  This ticket has been marked as resolved. Click{" "}
                  <strong>New Chat Ticket</strong> above if you need further
                  help.
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-muted">
          Loading Live Support Queue...
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}

