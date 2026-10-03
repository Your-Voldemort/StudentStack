import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ResourceCard } from "./resource-card";
import type { Resource } from "@/lib/resources";

const mockResource: Resource = {
  id: 1,
  slug: "github-student-pack",
  name: "GitHub Student Developer Pack",
  tagline: "Free access to developer tools",
  description: "Get access to dozens of free developer tools while you are a student.",
  url: "https://education.github.com/pack",
  hasStaticClaimUrl: true,
  categoryId: 1,
  categorySlug: "developer-tools",
  categoryName: "Developer Tools",
  categoryIcon: "Code",
  tags: ["git", "cloud", "developer"],
  region: "Global",
  costType: "free",
  verificationNeeded: "edu_email",
  creditCardRequired: false,
  duration: "while_student",
  status: "active",
  lastVerifiedAt: Date.now() - 3600000,
};

describe("ResourceCard Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders resource name and details correctly", () => {
    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);
    expect(screen.getByText("GitHub Student Developer Pack")).toBeDefined();
    expect(screen.getByText("Free")).toBeDefined();
    expect(screen.getByText("Developer Tools")).toBeDefined();
  });

  it("renders copy link button with accessible aria-label", () => {
    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);
    const copyButton = screen.getByRole("button", {
      name: "Copy link to GitHub Student Developer Pack",
    });
    expect(copyButton).toBeDefined();
  });

  it("copies expected directory query URL to clipboard when clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);
    const copyButton = screen.getByRole("button", {
      name: "Copy link to GitHub Student Developer Pack",
    });

    fireEvent.click(copyButton);

    const expectedUrl = `/directory?q=${encodeURIComponent(mockResource.name)}`;
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expectedUrl);
      const statusEl = screen.getByRole("status");
      expect(statusEl.textContent).toBe("Copied!");
      const copiedButton = screen.getByRole("button", { name: "Link copied" });
      expect(copiedButton).toBeDefined();
    });
  });

  it("handles fallback copying when navigator.clipboard is unavailable", async () => {
    Object.assign(navigator, {
      clipboard: undefined,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);
    const copyButton = screen.getByRole("button", {
      name: "Copy link to GitHub Student Developer Pack",
    });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(execCommandMock).toHaveBeenCalledWith("copy");
      const statusEl = screen.getByRole("status");
      expect(statusEl.textContent).toBe("Copied!");
    });
  });

  it("reverts copied status after timeout", async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);
    const copyButton = screen.getByRole("button", {
      name: "Copy link to GitHub Student Developer Pack",
    });

    fireEvent.click(copyButton);

    // Resolve microtask for clipboard write
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("status").textContent).toBe("Copied!");

    // Advance fake timer
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole("status")).toBeNull();
    const revertedButton = screen.getByRole("button", {
      name: "Copy link to GitHub Student Developer Pack",
    });
    expect(revertedButton).toBeDefined();

    vi.useRealTimers();
  });
});
