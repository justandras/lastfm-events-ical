import { describe, it, expect } from "vitest";
import { Logger } from "../src/Logger";

describe("Logger", () => {
  it("creates instance with default level", () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  it("creates instance with custom level", () => {
    const logger = new Logger("silent");
    expect(logger).toBeDefined();
  });

  it("info accepts string message", () => {
    const logger = new Logger("silent");
    expect(() => logger.info("hello")).not.toThrow();
  });

  it("info accepts object and optional message", () => {
    const logger = new Logger("silent");
    expect(() => logger.info({ key: "value" }, "msg")).not.toThrow();
  });

  it("warn and error can be called", () => {
    const logger = new Logger("silent");
    expect(() => logger.warn("warn")).not.toThrow();
    expect(() => logger.error("error")).not.toThrow();
  });

  it("fatal accepts object and message", () => {
    const logger = new Logger("silent");
    expect(() => logger.fatal({ err: new Error("test") }, "fatal")).not.toThrow();
  });
});
