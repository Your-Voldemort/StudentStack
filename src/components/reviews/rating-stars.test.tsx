import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RatingInput, RatingStars } from "./rating-stars";

describe("RatingStars", () => {
  it("renders accessible default and custom labels with full, half, and empty stars", () => {
    const { rerender } = render(<RatingStars value={3.6} size={16} />);
    expect(screen.getByRole("img", { name: "3.6 out of 5 stars" })).toBeTruthy();

    rerender(<RatingStars value={4.2} label="4.2 average rating" />);
    expect(screen.getByRole("img", { name: "4.2 average rating" })).toBeTruthy();
  });
});

describe("RatingInput", () => {
  it("lets students hover, unhover, and select a 1-5 star rating", () => {
    const onChange = vi.fn();
    render(<RatingInput value={3} onChange={onChange} />);

    const group = screen.getByRole("radiogroup", { name: "Your rating" });
    const star1 = screen.getByRole("radio", { name: "1 star" });
    const star3 = screen.getByRole("radio", { name: "3 stars" });
    const star5 = screen.getByRole("radio", { name: "5 stars" });

    expect(star3.getAttribute("aria-checked")).toBe("true");
    expect(star1.getAttribute("aria-checked")).toBe("false");

    fireEvent.mouseEnter(star5);
    fireEvent.mouseLeave(group);
    fireEvent.click(star5);

    expect(onChange).toHaveBeenCalledWith(5);
  });
});
