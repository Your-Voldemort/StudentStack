import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  lastVerifiedAt: Date.now() - 2 * 86_400_000,
};

describe("ResourceCard verification status", () => {
  it("displays actual relative verification time when lastVerifiedAt is present", () => {
    const twoDaysAgo = Date.now() - 2 * 86_400_000;
    render(
      <ResourceCard
        resource={{ ...mockResource, lastVerifiedAt: twoDaysAgo }}
        onTagClick={vi.fn()}
      />
    );

    const verifiedEl = screen.getByText("Verified 2 days ago");
    expect(verifiedEl).not.toBeNull();
  });

  it("displays 'Verified today' when verified on the current day", () => {
    render(
      <ResourceCard
        resource={{ ...mockResource, lastVerifiedAt: Date.now() }}
        onTagClick={vi.fn()}
      />
    );

    const verifiedEl = screen.getByText("Verified today");
    expect(verifiedEl).not.toBeNull();
  });

  it("does not render verified badge when lastVerifiedAt is null", () => {
    render(
      <ResourceCard
        resource={{ ...mockResource, lastVerifiedAt: null }}
        onTagClick={vi.fn()}
      />
    );

    const verifiedEl = screen.queryByText(/^Verified/);
    expect(verifiedEl).toBeNull();
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
