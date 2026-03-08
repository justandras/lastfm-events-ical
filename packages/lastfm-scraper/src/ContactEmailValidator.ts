import { promises as dns } from "dns";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates that a contact email has a valid format and that its domain has MX records.
 * Used so Last.fm can identify who is scraping; ensures the email is real.
 */
export class ContactEmailValidator {
  /**
   * Synchronous validation: non-empty and format only. Use in constructors.
   * @throws Error if the email is empty or malformed.
   */
  public static validateSync(email: string): void {
    const trimmed = email.trim();
    if (!trimmed) throw new Error("Contact email is empty.");
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new Error(
        `Contact email does not look valid: "${trimmed}". Use something like you@example.com.`
      );
    }
  }

  /**
   * Full validation: format and that the domain has at least one MX record.
   * @throws Error if the email is empty, malformed, or domain has no MX.
   */
  public static async validate(email: string): Promise<void> {
    ContactEmailValidator.validateSync(email);
    const trimmed = email.trim();
    const domain = trimmed.split("@")[1]?.toLowerCase();
    if (!domain) throw new Error("Could not extract domain from contact email.");

    let mx: { exchange: string; priority: number }[] = [];
    try {
      mx = await dns.resolveMx(domain);
    } catch {
      /* ignore */
    }
    if (!mx?.length) {
      throw new Error(`Invalid contact email address: "${trimmed}".`);
    }
  }
}
