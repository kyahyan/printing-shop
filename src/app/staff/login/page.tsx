"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Envelope,
  Eye,
  EyeSlash,
  Lock,
  ShieldCheck,
} from "@gravity-ui/icons";
import {
  Alert,
  Button,
  Card,
  Chip,
  FieldError,
  Form,
  InputGroup,
  Label,
  Spinner,
  TextField,
  Typography,
} from "@heroui/react";
import { usePrintShop } from "@/context/PrintShopContext";
import { sanitizeSafeNextPath } from "@/lib/security";

function StaffLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNextPath = searchParams.get("next");
  const errorParam = searchParams.get("error");

  const { login, settings } = usePrintShop();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "account_disabled"
      ? "Your staff account has been deactivated by an administrator."
      : null
  );
  const [loading, setLoading] = useState(false);

  const safeNextPreview = rawNextPath
    ? sanitizeSafeNextPath(rawNextPath, "")
    : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(email, password, true);
    setLoading(false);

    if (!res.ok || !res.user) {
      setError(res.error || "Unable to authenticate credentials.");
      return;
    }

    router.refresh();
    const defaultTarget =
      res.user.role === "super_admin" ? "/admin" : "/dashboard";
    const resolvedTarget = sanitizeSafeNextPath(rawNextPath, defaultTarget);

    if (
      resolvedTarget.startsWith("/admin") &&
      res.user.role !== "super_admin"
    ) {
      router.push("/dashboard");
      return;
    }

    router.push(resolvedTarget);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-4">
      {safeNextPreview && (
        <Alert status="accent">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Authentication Required</Alert.Title>
            <Alert.Description>
              Sign in with authorized staff credentials to continue to{" "}
              <Typography.Code>{safeNextPreview}</Typography.Code>.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Card className="p-6">
        <Card.Header>
          <Chip size="sm" color="accent" variant="soft" className="mb-1 w-fit">
            <ShieldCheck width={12} />
            <Chip.Label>Internal Access</Chip.Label>
          </Chip>
          <Card.Title className="text-xl">
            {settings.shopName} Staff Portal
          </Card.Title>
          <Card.Description>
            Restricted to authorized operations personnel and system
            administrators.
          </Card.Description>
        </Card.Header>

        <Card.Content className="space-y-4 pt-4">
          {error && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Sign In Failed</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              isRequired
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
            >
              <Label>Work Email</Label>
              <InputGroup variant="secondary">
                <InputGroup.Prefix>
                  <Envelope className="size-4 text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input placeholder="admin@clayjar.com.ph" />
              </InputGroup>
              <FieldError />
            </TextField>

            <TextField
              isRequired
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
            >
              <Label>Password</Label>
              <InputGroup variant="secondary">
                <InputGroup.Prefix>
                  <Lock className="size-4 text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                />
                <InputGroup.Suffix className="pe-0">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onPress={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeSlash className="size-4" />
                    )}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
              <FieldError />
            </TextField>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isPending={loading}
            >
              {({ isPending }) => (
                <>
                  {isPending && <Spinner color="current" size="sm" />}
                  {isPending ? "Authenticating..." : "Sign In to Workspace"}
                </>
              )}
            </Button>
          </Form>
        </Card.Content>
      </Card>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-md items-center justify-center gap-3 px-4 py-20 text-sm text-muted">
          <Spinner size="sm" />
          <span>Loading Staff Authentication...</span>
        </div>
      }
    >
      <StaffLoginContent />
    </Suspense>
  );
}
