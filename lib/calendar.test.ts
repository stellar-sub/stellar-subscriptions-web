import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateChargeICS, downloadChargeICS } from './calendar';

const fixture = {
  id: 'sub-123',
  name: 'Test Subscription',
  amount: 9.99,
  currency: 'USD',
  estimatedDate: new Date('2025-01-02T03:04:05Z'),
};

describe('generateChargeICS', () => {
  it('contains the calendar header, subscription id, and tentative status', () => {
    const ics = generateChargeICS(fixture as any);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain(fixture.id);
    expect(ics).toContain('STATUS:TENTATIVE');
  });

  it('encodes the estimatedDate in the DTSTART field', () => {
    const ics = generateChargeICS(fixture as any);

    expect(ics).toContain('DTSTART:20250102T030405Z');
  });
});

describe('downloadChargeICS', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let fakeAnchor: {
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
    style: Record<string, string>;
  };
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    fakeAnchor = {
      href: '',
      download: '',
      click: clickSpy,
      style: {},
    };

    createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(() => fakeAnchor as any);

    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();

    (URL as any).createObjectURL = createObjectURLSpy;
    (URL as any).revokeObjectURL = revokeObjectURLSpy;
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('triggers a download with a filename including the subscription id', () => {
    downloadChargeICS(fixture as any);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
    expect(fakeAnchor.download).toContain(fixture.id);
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });
});