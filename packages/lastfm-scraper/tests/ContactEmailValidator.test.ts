import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as dns } from "dns";
import { ContactEmailValidator } from "../src/ContactEmailValidator";

describe("ContactEmailValidator", () => {
  describe("validateSync", () => {
    it("throws when email is empty", () => {
      expect(() => ContactEmailValidator.validateSync("")).toThrow(
        "Contact email is empty."
      );
      expect(() => ContactEmailValidator.validateSync("   ")).toThrow(
        "Contact email is empty."
      );
    });

    it("throws when email format is invalid", () => {
      expect(() => ContactEmailValidator.validateSync("no-at-sign")).toThrow(
        /Contact email does not look valid/
      );
      expect(() => ContactEmailValidator.validateSync("@nodomain.com")).toThrow(
        /Contact email does not look valid/
      );
      expect(() => ContactEmailValidator.validateSync("user@")).toThrow(
        /Contact email does not look valid/
      );
      expect(() => ContactEmailValidator.validateSync("user@domain")).toThrow(
        /Contact email does not look valid/
      );
    });

    it("does not throw for valid-looking emails", () => {
      expect(() =>
        ContactEmailValidator.validateSync("a@b.co")
      ).not.toThrow();
      expect(() =>
        ContactEmailValidator.validateSync("user@example.com")
      ).not.toThrow();
      expect(() =>
        ContactEmailValidator.validateSync("  user+tag@sub.example.com  ")
      ).not.toThrow();
    });
  });

  /** validate() uses dns.resolveMx; we always mock it so tests never hit the network. */
  describe("validate", () => {
    let resolveMxSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      resolveMxSpy = vi
        .spyOn(dns, "resolveMx")
        .mockResolvedValue([]) as ReturnType<typeof vi.spyOn>;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("throws when validateSync would throw", async () => {
      await expect(
        ContactEmailValidator.validate("")
      ).rejects.toThrow("Contact email is empty.");
      await expect(
        ContactEmailValidator.validate("bad")
      ).rejects.toThrow(/Contact email does not look valid/);
      expect(resolveMxSpy).not.toHaveBeenCalled();
    });

    it("throws when domain has no MX records", async () => {
      resolveMxSpy.mockResolvedValue([]);
      await expect(
        ContactEmailValidator.validate("user@example.com")
      ).rejects.toThrow(/Invalid contact email address/);
    });

    it("throws when MX lookup fails", async () => {
      resolveMxSpy.mockRejectedValue(new Error("ENOTFOUND"));
      await expect(
        ContactEmailValidator.validate("user@example.com")
      ).rejects.toThrow(/Invalid contact email address/);
    });

    it("does not throw when domain has MX records", async () => {
      resolveMxSpy.mockResolvedValue([
        { exchange: "mail.example.com", priority: 10 },
      ]);
      await expect(
        ContactEmailValidator.validate("user@example.com")
      ).resolves.toBeUndefined();
    });
  });
});
