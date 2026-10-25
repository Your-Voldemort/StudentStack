import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagshipRefreshList } from "./flagship-refresh-list";

describe("FlagshipRefreshList", () => {
  it("lists each program with its reasons and a link to the official page", () => {
    render(
      <FlagshipRefreshList
        total={59}
        entries={[
          {
            slug: "gsoc",
            name: "Google Summer of Code",
            source: "https://developers.google.com/open-source/gsoc/timeline",
            reasons: [
              { code: "deadline-passed", message: "Deadline 2026-03-31 passed" },
              { code: "stale", message: "Last verified 2026-01-01, over 180 days ago" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Curated programs to re-check (1)" })).toBeTruthy();
    expect(screen.getByText("Google Summer of Code")).toBeTruthy();
    expect(
      screen.getByText("Deadline 2026-03-31 passed; Last verified 2026-01-01, over 180 days ago"),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Official page" }).getAttribute("href")).toBe(
      "https://developers.google.com/open-source/gsoc/timeline",
    );
  });

  it("says everything is up to date when nothing needs a re-check", () => {
    render(<FlagshipRefreshList total={59} entries={[]} />);
    expect(screen.getByText("All 59 curated programs are up to date.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
