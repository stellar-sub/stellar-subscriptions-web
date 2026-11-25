import { describe, it, expect } from 'vitest';
import { generateReceiptText, generateReceiptHTML } from './receipt';

const baseCharge = {
  amount: '12.34',
  token: 'USDC',
  merchant: '0x1234567890abcdef1234567890abcdef12345678',
  hash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  date: '2024-01-15T10:30:00.000Z',
};

describe('generateReceiptText', () => {
  it('includes the charge amount', () => {
    const text = generateReceiptText(baseCharge as any);
    expect(text).toContain(baseCharge.amount);
  });

  it('includes the token', () => {
    const text = generateReceiptText(baseCharge as any);
    expect(text).toContain(baseCharge.token);
  });

  it('includes the merchant', () => {
    const text = generateReceiptText(baseCharge as any);
    expect(text).toContain(baseCharge.merchant);
  });

  it('includes the hash', () => {
    const text = generateReceiptText(baseCharge as any);
    expect(text).toContain(baseCharge.hash);
  });

  it('includes the date', () => {
    const text = generateReceiptText(baseCharge as any);
    expect(text).toContain(baseCharge.date);
  });
});

describe('generateReceiptHTML', () => {
  it('includes the charge amount', () => {
    const html = generateReceiptHTML(baseCharge as any);
    expect(html).toContain(baseCharge.amount);
  });

  it('includes the token', () => {
    const html = generateReceiptHTML(baseCharge as any);
    expect(html).toContain(baseCharge.token);
  });

  it('includes the merchant', () => {
    const html = generateReceiptHTML(baseCharge as any);
    expect(html).toContain(baseCharge.merchant);
  });

  it('includes the hash', () => {
    const html = generateReceiptHTML(baseCharge as any);
    expect(html).toContain(baseCharge.hash);
  });

  it('escapes angle brackets in a crafted merchant address to prevent XSS', () => {
    const crafted = {
      ...baseCharge,
      merchant: '<script>alert(1)</script>',
    };
    const html = generateReceiptHTML(crafted as any);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});