"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import { AlertCircle, Plus, Send } from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { TicketPriority } from "@/types/printshop";
import {
  getActiveStoredTicketId,
  setActiveStoredTicketId,
} from "@/lib/security";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";
  const ticketFromUrl = searchParams.get("ticket") || "";

  const {
    currentUser,
    users,
    tickets,
    queueSummary,
    openChatTicket,
    sendChatMessage,
    refreshTicketSession,
    getQueuePosition,
  } = usePrintShop();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const saved = getActiveStoredTicketId();
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

  // Poll live ticket updates for guest / customer sessions
  useEffect(() => {
    if (!activeTicket || creatingNew) return;
    if (activeTicket.status === "closed") return;

    void refreshTicketSession(activeTicket.id);
    const interval = setInterval(() => {
      void refreshTicketSession(activeTicket.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTicket?.id, activeTicket?.status, creatingNew, refreshTicketSession]);

  const isStaff =
    currentUser?.role === "employee" || currentUser?.role === "super_admin";

  const onlineCount = isStaff
    ? users.filter(
        (u) =>
          (u.role === "employee" || u.role === "super_admin") &&
          u.isActive &&
          u.isOnline
      ).length
    : queueSummary.onlineSpecialists;

  const totalQueued = isStaff
    ? tickets.filter((t) => t.status === "queued").length
    : queueSummary.queuedTickets;

  const handleOpenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialMessage.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await openChatTicket({
        customerName,
        customerEmail,
        topic,
        linkedReference: linkedRef || undefined,
        priority,
        initialMessage,
      });
      setSelectedTicketId(created.id);
      setActiveStoredTicketId(created.id);
      setCreatingNew(false);
      setInitialMessage("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open support ticket. Please verify your details."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim() || submitting) return;
    setError(null);
    const messageToSend = replyText;
    setReplyText("");
    try {
      await sendChatMessage(
        activeTicket.id,
        messageToSend,
        "customer",
        activeTicket.customerName
      );
    } catch (err) {
      setReplyText(messageToSend);
      setError(
        err instanceof Error ? err.message : "Unable to send message."
      );
    }
  };

  const activeQueuePos = activeTicket
    ? activeTicket.queuePosition ?? (getQueuePosition(activeTicket.id) || 1)
    : 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-separator pb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Client Support & Pre-Press
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Support Ticket Queue
          </h1>
          <p className="mt-1 text-sm text-muted">
            Open a ticket to consult with an estimator or pre-press specialist.
            Queue positions update automatically as staff claim tickets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border border-separator bg-surface px-3.5 py-2 text-xs text-muted tabular-nums">
            <span className="font-medium text-foreground">{onlineCount}</span>{" "}
            on duty ·{" "}
            <span className="font-medium text-foreground">{totalQueued}</span>{" "}
            waiting
          </div>
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setError(null);
              setCreatingNew(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="border border-separator bg-surface p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Active Session Tickets
            </div>
            {customerTickets.length === 0 ? (
              <p className="py-4 text-xs text-muted">
                No tickets opened in this session. Submit the form on the right
                to enter the support queue.
              </p>
            ) : (
              <div className="space-y-2">
                {customerTickets.map((t) => {
                  const pos =
                    t.queuePosition ?? (getQueuePosition(t.id) || 1);
                  const isSelected =
                    !creatingNew && activeTicket?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        setActiveStoredTicketId(t.id);
                        setCreatingNew(false);
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-foreground/40 bg-surface-secondary"
                          : "border-separator bg-background hover:bg-surface-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
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
                            ? `Queue #${pos}`
                            : t.status}
                        </Chip>
                      </div>
                      <div className="mt-1 text-xs font-medium text-foreground">
                        {t.topic}
                      </div>
                      {t.linkedReference && (
                        <div className="mt-0.5 font-mono text-[11px] text-muted">
                          Ref: {t.linkedReference}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="border border-separator bg-surface p-4 space-y-2 text-xs">
            <div className="font-semibold text-foreground">
              Queue Routing Protocol
            </div>
            <p className="leading-relaxed text-muted">
              1. Provide your inquiry topic and optional Order or Quotation
              reference code.
            </p>
            <p className="leading-relaxed text-muted">
              2. Receive a unique{" "}
              <code className="font-mono text-foreground">TKT-XXXXXXXX</code>{" "}
              identifier and live queue position.
            </p>
            <p className="leading-relaxed text-muted">
              3. An estimator or front-desk coordinator claims your ticket and
              replies directly in this thread.
            </p>
          </Card>
        </div>

        {/* Right Main Panel */}
        <div className="lg:col-span-8">
          {creatingNew || !activeTicket ? (
            <Card className="border border-separator bg-surface p-6">
              <h2 className="text-base font-semibold text-foreground">
                Open Support Ticket
              </h2>
              <p className="mt-1 text-xs text-muted">
                Provide your contact and project context so the appropriate
                specialist can assist you.
              </p>

              <form onSubmit={handleOpenTicket} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Contact Name *
                    </label>
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full name"
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Department / Topic
                    </label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    >
                      <option value="Quotation Help">Quotation Help</option>
                      <option value="Pricing Inquiry">
                        Per-Size Pricing Inquiry
                      </option>
                      <option value="Artwork / File Check">
                        Pre-Press / File Check
                      </option>
                      <option value="Order Follow-up">Order Follow-up</option>
                      <option value="General Support">General Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Linked Reference (Optional)
                    </label>
                    <input
                      value={linkedRef}
                      onChange={(e) => setLinkedRef(e.target.value)}
                      placeholder="QT-2026-... or ORD-2026-..."
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3 font-mono text-xs text-foreground outline-none placeholder:font-sans focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) =>
                        setPriority(e.target.value as TicketPriority)
                      }
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    >
                      <option value="normal">Standard</option>
                      <option value="high">Time-Sensitive</option>
                      <option value="urgent">Same-Day Rush</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    placeholder="State your target dimensions, quantity, artwork bleed question, or order inquiry..."
                    className="w-full rounded-lg border border-separator bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
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
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={submitting}
                  >
                    {submitting ? "Opening Ticket..." : "Enter Support Queue"}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="flex h-[580px] flex-col overflow-hidden border border-separator bg-surface p-0">
              {/* Active Ticket Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator bg-surface-secondary/60 px-5 py-3.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {activeTicket.ticketNumber}
                    </span>
                    <span className="text-xs text-muted">
                      · {activeTicket.topic}
                    </span>
                    {activeTicket.linkedReference && (
                      <span className="rounded bg-surface px-2 py-0.5 font-mono text-[11px] text-foreground border border-separator">
                        {activeTicket.linkedReference}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted tabular-nums">
                    {activeTicket.status === "queued"
                      ? `Waiting for specialist — Queue #${activeQueuePos}`
                      : activeTicket.status === "active"
                        ? `Assigned to ${
                            activeTicket.assignedEmployeeName ||
                            "Print Specialist"
                          }`
                        : "Ticket Closed"}
                  </div>
                </div>

                <Chip
                  size="sm"
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
                    ? `Queue #${activeQueuePos}`
                    : activeTicket.status}
                </Chip>
              </div>

              {/* Queue Status Banner */}
              {activeTicket.status === "queued" && (
                <div className="flex items-center justify-between border-b border-separator bg-surface-secondary/30 px-5 py-2 text-xs text-muted tabular-nums">
                  <span>
                    Current queue position:{" "}
                    <strong className="text-foreground">
                      #{activeQueuePos}
                    </strong>
                    . You may append specifications or links below while
                    waiting.
                  </span>
                </div>
              )}

              {/* Message Thread */}
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {activeTicket.messages.map((msg) => {
                  if (msg.senderRole === "system") {
                    return (
                      <div
                        key={msg.id}
                        className="mx-auto max-w-md rounded-md border border-separator bg-surface-secondary/50 px-3 py-1.5 text-center text-[11px] text-muted"
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
                      <span className="mb-1 text-[11px] text-muted tabular-nums">
                        {msg.senderName} ·{" "}
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div
                        className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
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
                    placeholder="Write a message..."
                    className="h-10 flex-1 rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                  <Button type="submit" variant="primary" className="h-10">
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </form>
              ) : (
                <div className="border-t border-separator bg-surface-secondary/40 p-4 text-center text-xs text-muted">
                  This support ticket is resolved. Select{" "}
                  <strong className="text-foreground">New Ticket</strong> above
                  to open a new inquiry.
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
          Loading Support Queue...
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
