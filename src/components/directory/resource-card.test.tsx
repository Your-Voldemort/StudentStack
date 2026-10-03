import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ResourceCard } from "./resource-card";
import type { Resource } from "@/lib/resources";

const mockResource: Resource = {
  id: 1,
  slug: "github-copilot",
  name: "GitHub Copilot",
  tagline: "Free Copilot Student plan",
  description: "AI coding assistance for students.",
  url: "https://education.github.com/pack",
  hasStaticClaimUrl: true,
  categoryId: 1,
  categorySlug: "development-tools",
  categoryName: "Development Tools",
  categoryIcon: "tool",
  tags: ["AI", "Web", "macOS"],
  region: "Global",
  costType: "free",
  verificationNeeded: "github_student_pack",
  creditCardRequired: false,
  duration: "while_student",
  status: "active",
  lastVerifiedAt: Date.now() - 1000 * 60 * 60 * 24,
};

describe("ResourceCard copy link", () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    vi.useRealTimers();
  });

  it("renders the copy link button with accessible label", () => {
    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);

    const copyBtn = screen.getByRole("button", {
      name: `Copy link for ${mockResource.name}`,
    });
    expect(copyBtn).not.toBeNull();
    expect(copyBtn.getAttribute("title")).toBe("Copy link");
  });

  it("copies shareable link to clipboard on click and displays confirmation toast", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);

    const copyBtn = screen.getByRole("button", {
      name: `Copy link for ${mockResource.name}`,
    });

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    const expectedQuery = encodeURIComponent(mockResource.name);
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining(`/directory?q=${expectedQuery}`)
    );

    const toast = screen.getByRole("status");
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain("Link copied!");
    expect(copyBtn.getAttribute("aria-label")).toBe(
      `Link copied for ${mockResource.name}`
    );
  });

  it("reverts copied status after timeout", async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);

    const copyBtn = screen.getByRole("button", {
      name: `Copy link for ${mockResource.name}`,
    });

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(screen.getByRole("status").textContent).toContain("Link copied!");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole("status")).toBeNull();
    expect(copyBtn.getAttribute("aria-label")).toBe(
      `Copy link for ${mockResource.name}`
    );
  });

  it("falls back to document.execCommand when navigator.clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    render(<ResourceCard resource={mockResource} onTagClick={vi.fn()} />);

    const copyBtn = screen.getByRole("button", {
      name: `Copy link for ${mockResource.name}`,
    });

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("status").textContent).toContain("Link copied!");
  });

  it("stops propagation on click and keyboard activation", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <ResourceCard resource={mockResource} onTagClick={vi.fn()} />
      </div>
    );

    const copyBtn = screen.getByRole("button", {
      name: `Copy link for ${mockResource.name}`,
    });

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(parentClick).not.toHaveBeenCalled();

    const keyDownEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
    });
    const stopPropagationSpy = vi.spyOn(keyDownEvent, "stopPropagation");
    copyBtn.dispatchEvent(keyDownEvent);
    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});

describe("ResourceCard visual and verification variants", () => {
  it("renders letter fallback if favicon image fails to load or url is missing", () => {
    const { rerender, container } = render(
      <ResourceCard
        resource={{ ...mockResource, url: "not-a-valid-url" }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("G")).not.toBeNull();

    rerender(
      <ResourceCard
        resource={{ ...mockResource, url: null }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("G")).not.toBeNull();

    rerender(
      <ResourceCard
        resource={{ ...mockResource, url: "https://example.com" }}
        onTagClick={vi.fn()}
      />
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    if (img) {
      fireEvent.error(img);
    }
    expect(screen.getByText("G")).not.toBeNull();
  });

  it("renders diverse cost types and category classes", () => {
    const { rerender } = render(
      <ResourceCard
        resource={{
          ...mockResource,
          costType: "credits",
          categoryName: "Design & Creative",
        }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("Credits")).not.toBeNull();

    rerender(
      <ResourceCard
        resource={{
          ...mockResource,
          costType: "discount",
          categoryName: "Other Services",
        }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("Discount")).not.toBeNull();

    rerender(
      <ResourceCard
        resource={{
          ...mockResource,
          costType: "stipend",
          categoryName: "Other Services",
        }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("Stipend")).not.toBeNull();
  });

  it("handles verification requirements and offer url states", () => {
    const { rerender } = render(
      <ResourceCard
        resource={{
          ...mockResource,
          verificationNeeded: "edu_email",
          hasStaticClaimUrl: false,
        }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("Education eligibility required")).not.toBeNull();
    expect(screen.getByTitle("Varies by region")).not.toBeNull();

    rerender(
      <ResourceCard
        resource={{
          ...mockResource,
          verificationNeeded: "student_id",
        }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("Student verification required")).not.toBeNull();

    rerender(
      <ResourceCard
        resource={{
          ...mockResource,
          verificationNeeded: "none",
        }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("Check offer eligibility")).not.toBeNull();

    rerender(
      <ResourceCard
        resource={{
          ...mockResource,
          verificationNeeded: null,
        }}
        onTagClick={vi.fn()}
      />
    );
    expect(screen.getByText("Check offer eligibility")).not.toBeNull();
  });

  it("opens dialog on description click and triggers tag click", () => {
    const onTagClick = vi.fn();
    render(<ResourceCard resource={mockResource} onTagClick={onTagClick} />);

    const descButton = screen.getByText(mockResource.description).closest("button");
    expect(descButton).not.toBeNull();

    if (descButton) {
      fireEvent.click(descButton);
    }

    const tagButton = screen.getByRole("button", { name: "AI" });
    fireEvent.click(tagButton);
    expect(onTagClick).toHaveBeenCalledWith("AI");
  });
});
