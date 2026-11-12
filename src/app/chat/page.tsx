"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CircleFill,
  Comments,
  Headphones,
  PaperPlane,
  Plus,
  Tray,
} from "@gravity-ui/icons";
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  EmptyState,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  ScrollShadow,
  Select,
  Separator,
  Spinner,
  Surface,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
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

  const handleOpenTicket = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
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
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Support Desk</Breadcrumbs.Item>
      </Breadcrumbs>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Typography.Heading
            level={1}
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Support Ticket Queue
          </Typography.Heading>
          <Typography.Paragraph color="muted" size="sm" className="mt-1">
            Open a ticket to consult with an estimator or pre-press specialist.
            Queue positions update automatically as staff claim tickets.
          </Typography.Paragraph>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Chip size="md" color="success" variant="soft">
            <CircleFill width={6} />
            <Chip.Label className="tabular-nums">
              {onlineCount} on duty · {totalQueued} waiting
            </Chip.Label>
          </Chip>
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setError(null);
              setCreatingNew(true);
            }}
          >
            <Plus className="size-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Support Queue Error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar */}
        <div className="space-y-4 lg:col-span-4">
          <Card>
            <Card.Header>
              <Card.Title>Active Session Tickets</Card.Title>
              <Card.Description>
                Select any ticket opened in this browser or under your account.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              {customerTickets.length === 0 ? (
                <EmptyState className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <Tray className="size-5 text-muted" />
                  <span className="text-xs text-muted">
                    No tickets opened yet. Submit the form to enter the queue.
                  </span>
                </EmptyState>
              ) : (
                <div className="space-y-2">
                  {customerTickets.map((t) => {
                    const pos =
                      t.queuePosition ?? (getQueuePosition(t.id) || 1);
                    const isSelected =
                      !creatingNew && activeTicket?.id === t.id;
                    return (
                      <Surface
                        key={t.id}
                        variant={isSelected ? "tertiary" : "secondary"}
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setActiveStoredTicketId(t.id);
                          setCreatingNew(false);
                        }}
                        className="cursor-pointer rounded-2xl p-3.5 transition-colors hover:bg-default"
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
                            <Chip.Label>
                              {t.status === "queued"
                                ? `Queue #${pos}`
                                : t.status}
                            </Chip.Label>
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
                      </Surface>
                    );
                  })}
                </div>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Queue Routing Protocol</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-2.5 text-xs text-muted">
              <p>
                1. Provide your inquiry topic and optional Order or Quotation
                reference code.
              </p>
              <Separator />
              <p>
                2. Receive a unique{" "}
                <Typography.Code>TKT-XXXXXXXX</Typography.Code> identifier and
                live queue position.
              </p>
              <Separator />
              <p>
                3. An estimator or front-desk coordinator claims your ticket and
                replies directly in this thread.
              </p>
            </Card.Content>
          </Card>
        </div>

        {/* Right Main Panel */}
        <div className="lg:col-span-8">
          {creatingNew || !activeTicket ? (
            <Card className="p-6">
              <Card.Header>
                <Card.Title className="text-lg">Open Support Ticket</Card.Title>
                <Card.Description>
                  Provide your contact and project context so the appropriate
                  specialist can assist you.
                </Card.Description>
              </Card.Header>

              <Card.Content className="pt-4">
                <Form onSubmit={handleOpenTicket} className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      isRequired
                      name="customerName"
                      value={customerName}
                      onChange={setCustomerName}
                    >
                      <Label>Contact Name</Label>
                      <Input variant="secondary" placeholder="Full name" />
                      <FieldError />
                    </TextField>

                    <TextField
                      isRequired
                      name="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={setCustomerEmail}
                    >
                      <Label>Email Address</Label>
                      <Input
                        variant="secondary"
                        placeholder="name@company.com"
                      />
                      <FieldError />
                    </TextField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Select
                      variant="secondary"
                      value={topic}
                      onChange={(key) => key && setTopic(String(key))}
                    >
                      <Label>Department / Topic</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item
                            id="Quotation Help"
                            textValue="Quotation Help"
                          >
                            Quotation Help
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="Pricing Inquiry"
                            textValue="Per-Size Pricing Inquiry"
                          >
                            Per-Size Pricing Inquiry
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="Artwork / File Check"
                            textValue="Pre-Press / File Check"
                          >
                            Pre-Press / File Check
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="Order Follow-up"
                            textValue="Order Follow-up"
                          >
                            Order Follow-up
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="General Support"
                            textValue="General Support"
                          >
                            General Support
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <TextField
                      name="linkedRef"
                      value={linkedRef}
                      onChange={setLinkedRef}
                    >
                      <Label>Linked Reference (Optional)</Label>
                      <Input
                        variant="secondary"
                        placeholder="QT-... or ORD-..."
                        className="font-mono placeholder:font-sans"
                      />
                    </TextField>

                    <Select
                      variant="secondary"
                      value={priority}
                      onChange={(key) =>
                        key && setPriority(key as TicketPriority)
                      }
                    >
                      <Label>Priority</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="normal" textValue="Standard">
                            Standard
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="high" textValue="Time-Sensitive">
                            Time-Sensitive
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="urgent" textValue="Same-Day Rush">
                            Same-Day Rush
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <TextField
                    isRequired
                    name="initialMessage"
                    value={initialMessage}
                    onChange={setInitialMessage}
                  >
                    <Label>Message</Label>
                    <TextArea
                      variant="secondary"
                      rows={4}
                      placeholder="State your target dimensions, quantity, artwork bleed question, or order inquiry..."
                    />
                    <FieldError />
                  </TextField>

                  <div className="flex justify-end gap-2 pt-2">
                    {activeTicket && (
                      <Button
                        variant="tertiary"
                        onPress={() => setCreatingNew(false)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      isPending={submitting}
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : (
                            <Comments className="size-4" />
                          )}
                          {isPending
                            ? "Opening Ticket..."
                            : "Enter Support Queue"}
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Content>
            </Card>
          ) : (
            <Card className="flex h-[600px] flex-col overflow-hidden p-0">
              {/* Active Ticket Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator px-5 py-4">
                <div className="flex items-center gap-3">
                  <Badge.Anchor>
                    <Avatar size="sm" color="accent">
                      <Avatar.Fallback>
                        <Headphones className="size-4" />
                      </Avatar.Fallback>
                    </Avatar>
                    <Badge
                      color={
                        activeTicket.status === "active" ? "success" : "warning"
                      }
                      placement="bottom-right"
                      size="sm"
                    />
                  </Badge.Anchor>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {activeTicket.ticketNumber}
                      </span>
                      <span className="text-xs text-muted">
                        · {activeTicket.topic}
                      </span>
                      {activeTicket.linkedReference && (
                        <Chip size="sm" variant="soft" color="default">
                          <Chip.Label className="font-mono">
                            {activeTicket.linkedReference}
                          </Chip.Label>
                        </Chip>
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
                  <Chip.Label>
                    {activeTicket.status === "queued"
                      ? `Queue #${activeQueuePos}`
                      : activeTicket.status}
                  </Chip.Label>
                </Chip>
              </div>

              {/* Queue Status Banner */}
              {activeTicket.status === "queued" && (
                <Surface
                  variant="secondary"
                  className="border-b border-separator px-5 py-2.5 text-xs text-muted tabular-nums"
                >
                  Current queue position:{" "}
                  <strong className="text-foreground">#{activeQueuePos}</strong>.
                  You may append specifications or links below while waiting.
                </Surface>
              )}

              {/* Message Thread */}
              <ScrollShadow className="flex-1 p-5">
                <div className="space-y-3">
                  {activeTicket.messages.map((msg) => {
                    if (msg.senderRole === "system") {
                      return (
                        <Surface
                          key={msg.id}
                          variant="secondary"
                          className="mx-auto max-w-md rounded-xl px-3.5 py-2 text-center text-xs text-muted"
                        >
                          {msg.message}
                        </Surface>
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
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isCustomer
                              ? "bg-accent text-accent-foreground"
                              : "bg-default text-foreground"
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollShadow>

              {/* Composer */}
              {activeTicket.status !== "resolved" &&
              activeTicket.status !== "closed" ? (
                <Form
                  onSubmit={handleSend}
                  className="flex flex-row items-center gap-2 border-t border-separator p-4"
                >
                  <TextField
                    aria-label="Message"
                    className="flex-1"
                    value={replyText}
                    onChange={setReplyText}
                  >
                    <Input
                      variant="secondary"
                      placeholder="Write a message..."
                    />
                  </TextField>
                  <Button type="submit" variant="primary">
                    <PaperPlane className="size-4" />
                    Send
                  </Button>
                </Form>
              ) : (
                <Surface
                  variant="secondary"
                  className="border-t border-separator p-4 text-center text-xs text-muted"
                >
                  This support ticket is resolved. Select{" "}
                  <strong className="text-foreground">New Ticket</strong> above
                  to open a new inquiry.
                </Surface>
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
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-16 text-sm text-muted">
          <Spinner size="sm" />
          <span>Loading Support Queue...</span>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
