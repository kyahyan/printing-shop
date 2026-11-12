"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowsExpand,
  Comments,
  Headphones,
  Minus,
  PaperPlane,
  Plus,
} from "@gravity-ui/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Form,
  Input,
  Label,
  ListBox,
  ScrollShadow,
  Select,
  Spinner,
  Surface,
  TextArea,
  TextField,
  Tooltip,
} from "@heroui/react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { TicketPriority } from "@/types/printshop";
import {
  getActiveStoredTicketId,
  setActiveStoredTicketId,
} from "@/lib/security";

export function FloatingChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
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

  const handleStartTicket = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const handleSendReply = async (e: React.FormEvent<HTMLFormElement>) => {
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
        <Card className="flex h-[540px] w-[370px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 shadow-overlay">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-separator bg-surface px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Badge.Anchor>
                <Avatar size="sm" color="accent">
                  <Avatar.Fallback>
                    <Headphones className="size-4" />
                  </Avatar.Fallback>
                </Avatar>
                <Badge color="success" placement="bottom-right" size="sm" />
              </Badge.Anchor>
              <div>
                <div className="text-sm font-semibold tracking-tight text-foreground leading-none">
                  Support & Estimating
                </div>
                <div className="mt-1 text-xs text-muted leading-none">
                  Live Ticket Queue
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Open full support desk"
                  onPress={() => router.push("/chat")}
                >
                  <ArrowsExpand className="size-3.5" />
                </Button>
                <Tooltip.Content>
                  <p>Full support view</p>
                </Tooltip.Content>
              </Tooltip>

              <Tooltip delay={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Minimize support widget"
                  onPress={() => setIsOpen(false)}
                >
                  <Minus className="size-4" />
                </Button>
                <Tooltip.Content>
                  <p>Minimize</p>
                </Tooltip.Content>
              </Tooltip>
            </div>
          </div>

          {error && (
            <div className="px-3 pt-3">
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          )}

          {activeTicket ? (
            <>
              {/* Ticket Queue Status Banner */}
              <Surface
                variant="secondary"
                className="flex items-center justify-between border-b border-separator px-4 py-2.5 text-xs tabular-nums"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-foreground">
                    {activeTicket.ticketNumber}
                  </span>
                  {activeTicket.status === "queued" && (
                    <Chip size="sm" color="warning" variant="soft">
                      <Chip.Label>Queue #{queuePos}</Chip.Label>
                    </Chip>
                  )}
                  {activeTicket.status === "active" && (
                    <Chip size="sm" color="success" variant="soft">
                      <Chip.Label>
                        {activeTicket.assignedEmployeeName || "Active"}
                      </Chip.Label>
                    </Chip>
                  )}
                  {(activeTicket.status === "resolved" ||
                    activeTicket.status === "closed") && (
                    <Chip size="sm" color="default" variant="soft">
                      <Chip.Label>Resolved</Chip.Label>
                    </Chip>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onPress={startFreshTicket}
                >
                  <Plus className="size-3" />
                  New
                </Button>
              </Surface>

              {/* Messages */}
              <ScrollShadow className="flex-1 p-4">
                <div className="space-y-3">
                  {activeTicket.messages.map((msg) => {
                    if (msg.senderRole === "system") {
                      return (
                        <Surface
                          key={msg.id}
                          variant="secondary"
                          className="rounded-xl px-3 py-2 text-center text-[11px] text-muted"
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
                        <span className="mb-1 text-[10px] text-muted">
                          {msg.senderName}
                        </span>
                        <div
                          className={`max-w-[84%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
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

              {/* Reply Input */}
              {activeTicket.status !== "closed" &&
              activeTicket.status !== "resolved" ? (
                <Form
                  onSubmit={handleSendReply}
                  className="flex flex-row items-center gap-2 border-t border-separator p-3"
                >
                  <TextField
                    aria-label="Message reply"
                    className="flex-1"
                    value={replyText}
                    onChange={setReplyText}
                  >
                    <Input
                      variant="secondary"
                      placeholder="Write a message..."
                    />
                  </TextField>
                  <Button
                    type="submit"
                    variant="primary"
                    isIconOnly
                    aria-label="Send message"
                  >
                    <PaperPlane className="size-4" />
                  </Button>
                </Form>
              ) : (
                <div className="border-t border-separator p-3">
                  <Button
                    fullWidth
                    size="sm"
                    variant="secondary"
                    onPress={startFreshTicket}
                  >
                    <Plus className="size-3.5" />
                    Open New Ticket
                  </Button>
                </div>
              )}
            </>
          ) : (
            <ScrollShadow className="flex-1 p-4">
              <Form
                onSubmit={handleStartTicket}
                className="flex flex-col gap-3"
              >
                <p className="text-xs leading-relaxed text-muted">
                  Open a ticket to consult on custom quotations, artwork bleeds,
                  or active orders.
                </p>

                <TextField
                  isRequired
                  name="name"
                  value={name}
                  onChange={setName}
                >
                  <Label>Name</Label>
                  <Input variant="secondary" placeholder="Full name" />
                </TextField>

                <TextField
                  isRequired
                  name="email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                >
                  <Label>Email</Label>
                  <Input variant="secondary" placeholder="name@company.com" />
                </TextField>

                <div className="grid grid-cols-2 gap-2.5">
                  <Select
                    variant="secondary"
                    value={topic}
                    onChange={(key) => key && setTopic(String(key))}
                  >
                    <Label>Topic</Label>
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
                          textValue="Pricing Schedule"
                        >
                          Pricing Schedule
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item
                          id="Artwork / File Check"
                          textValue="Pre-Press Check"
                        >
                          Pre-Press Check
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item
                          id="Order Follow-up"
                          textValue="Order Status"
                        >
                          Order Status
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>

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
                  name="linkedRef"
                  value={linkedRef}
                  onChange={setLinkedRef}
                >
                  <Label>Reference Code (Optional)</Label>
                  <Input
                    variant="secondary"
                    placeholder="QT-... or ORD-..."
                    className="font-mono placeholder:font-sans"
                  />
                </TextField>

                <TextField
                  isRequired
                  name="firstMessage"
                  value={firstMessage}
                  onChange={setFirstMessage}
                >
                  <Label>Inquiry Details</Label>
                  <TextArea
                    variant="secondary"
                    rows={2}
                    placeholder="Describe your specifications or question..."
                  />
                </TextField>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isPending={submitting}
                >
                  {({ isPending }) => (
                    <>
                      {isPending && <Spinner color="current" size="sm" />}
                      {isPending ? "Connecting..." : "Enter Support Queue"}
                    </>
                  )}
                </Button>
              </Form>
            </ScrollShadow>
          )}
        </Card>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="shadow-overlay"
          onPress={() => setIsOpen(true)}
        >
          <Comments className="size-4" />
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
