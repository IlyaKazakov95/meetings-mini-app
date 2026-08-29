import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { validateInitData } from "@/lib/telegram/validate-init-data";

function sign(botToken: string, fields: Record<string, string>): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("validateInitData", () => {
  const token = "123456:TEST_TOKEN";

  it("accepts a valid signature and user id", () => {
    const initData = sign(token, {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 42, first_name: "Anna", username: "anna" }),
    });

    const result = validateInitData(initData, token);
    expect(result.user.id).toBe(42);
    expect(result.user.username).toBe("anna");
  });

  it("rejects a tampered payload", () => {
    const initData = sign(token, {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 42, first_name: "Anna" }),
    });

    expect(() => validateInitData(`${initData}&extra=1`, token)).toThrow(/Invalid Telegram initData/);
  });
});
