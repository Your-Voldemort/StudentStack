import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const setHelpfulVote = vi.fn();
vi.mock("@/app/reviews/actions", () => ({
  setHelpfulVote: (...args: unknown[]) => setHelpfulVote(...args),
}));

import { HelpfulButton, HelpfulVotesProvider } from "./helpful-votes";

function mockVotesApi(body: { signedIn: boolean; voted: number[]; mine: number | null }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => body }));
}

function renderButtons() {
  return render(
    <HelpfulVotesProvider resourceId={3}>
      <HelpfulButton reviewId={10} count={4} />
      <HelpfulButton reviewId={11} count={1} />
    </HelpfulVotesProvider>,
  );
}

async function enabledButton(name: string | RegExp) {
  const button = (await screen.findByRole("button", { name })) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
}

beforeEach(() => {
  setHelpfulVote.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HelpfulButton", () => {
  it("shows counts to signed-out students and links them to sign in", async () => {
    mockVotesApi({ signedIn: false, voted: [], mine: null });
    renderButtons();
    const link = await screen.findByRole("link", { name: /Helpful \(4\)\. Sign in/ });
    expect(link.getAttribute("href")).toBe("/my-list");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("votes optimistically", async () => {
    mockVotesApi({ signedIn: true, voted: [], mine: null });
    setHelpfulVote.mockResolvedValue({ ok: true });
    renderButtons();
    fireEvent.click(await enabledButton("Helpful (4)"));
    expect(setHelpfulVote).toHaveBeenCalledWith(10, true);
    const pressed = await screen.findByRole("button", { name: "Helpful (5)" });
    expect(pressed.getAttribute("aria-pressed")).toBe("true");
  });

  it("removes an existing vote without double counting it", async () => {
    mockVotesApi({ signedIn: true, voted: [10], mine: null });
    setHelpfulVote.mockResolvedValue({ ok: true });
    renderButtons();
    const button = await enabledButton("Helpful (4)");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(setHelpfulVote).toHaveBeenCalledWith(10, false);
    expect(await screen.findByRole("button", { name: "Helpful (3)" })).toBeTruthy();
  });

  it("rolls back and explains when the vote fails", async () => {
    mockVotesApi({ signedIn: true, voted: [], mine: null });
    setHelpfulVote.mockResolvedValue({ ok: false, error: "We couldn’t save your vote. Try again." });
    renderButtons();
    fireEvent.click(await enabledButton("Helpful (4)"));
    expect((await screen.findByRole("status")).textContent).toBe("We couldn’t save your vote. Try again.");
    const button = await enabledButton("Helpful (4)");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows the count on the student's own review without a vote button", async () => {
    mockVotesApi({ signedIn: true, voted: [], mine: 11 });
    renderButtons();
    await enabledButton("Helpful (4)");
    expect(screen.queryByRole("button", { name: "Helpful (1)" })).toBeNull();
    expect(screen.getByTitle("This is your review").textContent).toBe("Helpful (1)");
  });
});
