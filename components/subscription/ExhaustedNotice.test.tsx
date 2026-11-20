import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ExhaustedNotice } from "./ExhaustedNotice";
import { SubStatus, type Subscription } from "@/types";

const sub = {
  id: 1,
  status: SubStatus.Exhausted,
  totalCap: 120_000_000n,
  totalCharged: 120_000_000n,
} as Subscription;

describe("ExhaustedNotice", () => {
  it("matches the snapshot for an exhausted subscription", () => {
    const { container } = render(<ExhaustedNotice sub={sub} />);
    expect(container).toMatchSnapshot();
  });

  it.each([SubStatus.Active, SubStatus.Paused, SubStatus.Cancelled])("renders nothing for status %s", (status) => {
    const { container } = render(<ExhaustedNotice sub={{ ...sub, status }} />);
    expect(container.firstChild).toBeNull();
  });
});
