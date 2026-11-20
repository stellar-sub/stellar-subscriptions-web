import { describe, expect, it } from "vitest";
import { generateReceiptHTML, generateReceiptText, type ChargeEvent } from "./receipt";

const charge: ChargeEvent = {
  id: "charge-1",
  amount: "12.5",
  token: "USDC",
  merchant: "GMERCHANTADDRESS123",
  date: new Date("2024-03-15T10:30:00Z"),
  hash: "abc123def456",
};

describe("generateReceiptText", () => {
  it("includes the amount, token, merchant and hash", () => {
    const text = generateReceiptText(charge);
    expect(text).toContain("12.5 USDC");
    expect(text).toContain("GMERCHANTADDRESS123");
    expect(text).toContain("abc123def456");
  });

  it("includes the receipt heading", () => {
    expect(generateReceiptText(charge)).toContain("CHARGE RECEIPT");
  });
});

describe("generateReceiptHTML", () => {
  it("includes the amount, token, merchant and hash", () => {
    const html = generateReceiptHTML(charge);
    expect(html).toContain("12.5 USDC");
    expect(html).toContain("GMERCHANTADDRESS123");
    expect(html).toContain("<code>abc123def456</code>");
  });

  it("escapes angle brackets in a crafted merchant address", () => {
    const html = generateReceiptHTML({
      ...charge,
      merchant: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes markup in the other user-supplied fields", () => {
    const html = generateReceiptHTML({
      ...charge,
      amount: "<img src=x onerror=1>",
      token: "</title><svg onload=1>",
      hash: '"><b>x</b>',
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<svg onload");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;img src=x onerror=1&gt;");
  });

  it("escapes ampersands and quotes", () => {
    const html = generateReceiptHTML({ ...charge, merchant: `A&B "q" 'r'` });
    expect(html).toContain("A&amp;B &quot;q&quot; &#39;r&#39;");
  });
});
