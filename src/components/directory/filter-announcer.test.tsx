import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FilterAnnouncer } from "./filter-announcer";

describe("FilterAnnouncer aria-live region", () => {
  it("renders with aria-live polite and aria-atomic true", () => {
    const { container } = render(<FilterAnnouncer count={10} />);
    const region = container.querySelector('[aria-live="polite"]');

    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-atomic")).toBe("true");
    expect(region?.className).toContain("sr-only");
  });

  it("announces 'No offers found' when count is 0", () => {
    const { container } = render(<FilterAnnouncer count={0} />);
    const region = container.querySelector('[aria-live="polite"]');

    expect(region?.textContent).toBe("No offers found");
  });

  it("announces '1 offer found' when count is 1 (singular)", () => {
    const { container } = render(<FilterAnnouncer count={1} />);
    const region = container.querySelector('[aria-live="polite"]');

    expect(region?.textContent).toBe("1 offer found");
  });

  it("announces plural form when count is greater than 1", () => {
    const { container } = render(<FilterAnnouncer count={42} />);
    const region = container.querySelector('[aria-live="polite"]');

    expect(region?.textContent).toBe("42 offers found");
  });

  it("updates announcement text dynamically when count changes", () => {
    const { container, rerender } = render(<FilterAnnouncer count={5} />);
    const region = container.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe("5 offers found");

    rerender(<FilterAnnouncer count={1} />);
    expect(region?.textContent).toBe("1 offer found");

    rerender(<FilterAnnouncer count={0} />);
    expect(region?.textContent).toBe("No offers found");
  });
});
