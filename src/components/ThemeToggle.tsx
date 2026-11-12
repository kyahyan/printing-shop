"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "@gravity-ui/icons";
import { Button, Tooltip } from "@heroui/react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="tertiary"
        size="sm"
        isIconOnly
        aria-label="Toggle color theme"
      >
        <Sun className="size-4 text-muted" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip delay={0}>
      <Button
        variant="tertiary"
        size="sm"
        isIconOnly
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onPress={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? (
          <Sun className="size-4 text-foreground" />
        ) : (
          <Moon className="size-4 text-foreground" />
        )}
      </Button>
      <Tooltip.Content>
        <p>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
