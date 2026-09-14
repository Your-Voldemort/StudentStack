"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  // Starts false to match what SSR renders (it can't know the real theme),
  // so the client's first render pass — before any effects run — produces
  // identical output to the server and hydration succeeds cleanly. Reading
  // the class the blocking script in layout.tsx already applied has to
  // happen strictly after hydration completes, not during the initial
  // render: computing it synchronously (e.g. via a lazy useState
  // initializer) makes that first render itself mismatch the server output
  // — a real hydration-mismatch bug (verified: it cascades into React
  // discarding and regenerating the whole <html> subtree, which strips the
  // dark class the blocking script had just applied). This is the one
  // legitimate exception to the "avoid setState in an effect" default this
  // project otherwise follows.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above: must run strictly post-hydration
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // storage unavailable — theme still applies for this session, just not remembered
    }
    setIsDark(next);
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
