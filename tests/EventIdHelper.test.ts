import { describe, it, expect } from "vitest";
import { EventIdHelper } from "../src/EventIdHelper";

describe("EventIdHelper", () => {
  it("returns leading numeric part of id/slug", () => {
    expect(EventIdHelper.getStableEventId("4971249+Worakls+Orchestra")).toBe(
      "4971249"
    );
    expect(EventIdHelper.getStableEventId("12345+Artist+Venue")).toBe("12345");
  });

  it("returns full string when no leading digits", () => {
    expect(EventIdHelper.getStableEventId("abc")).toBe("abc");
    expect(EventIdHelper.getStableEventId("")).toBe("");
  });

  it("handles id that is only digits", () => {
    expect(EventIdHelper.getStableEventId("999")).toBe("999");
  });
});
