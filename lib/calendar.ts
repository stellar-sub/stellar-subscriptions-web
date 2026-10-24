/**
 * Calendar (.ics) file generation for subscription charges (#33)
 * Generates RFC 5545 iCalendar format files for estimated next charges
 */

export interface ChargeEstimate {
  id: string;
  subscriptionId: number;
  amount: string;
  token: string;
  estimatedDate: Date;
}

/**
 * Generate an RFC 5545 compliant .ics file for the estimated next charge
 * Includes a clear note that this is an estimate, not a promise
 */
export function generateChargeICS(estimate: ChargeEstimate): string {
  const uid = `charge-${estimate.subscriptionId}-${Date.now()}@stellar-subscriptions`;
  const dtstart = toICalDate(estimate.estimatedDate);
  const dtstamp = toICalDate(new Date());

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Stellar Subscriptions//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
SUMMARY:Estimated Subscription Charge: ${estimate.amount} ${estimate.token}
DESCRIPTION:Estimated charge from your Stellar subscription (ID: ${estimate.subscriptionId}).\\n\\nIMPORTANT: This is an ESTIMATE and not a promise. The actual charge may happen at a different time depending on blockchain conditions.\\n\\nAmount: ${estimate.amount} ${estimate.token}\\nToken: ${estimate.token}
STATUS:TENTATIVE
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`;
}

/**
 * Convert a Date to iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function toICalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Download a charge estimate as an .ics file
 */
export function downloadChargeICS(estimate: ChargeEstimate): void {
  const ics = generateChargeICS(estimate);
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `subscription-charge-${estimate.subscriptionId}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
