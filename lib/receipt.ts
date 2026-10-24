/**
 * Receipt generation for charge events (#36)
 * Provides utilities to create printable receipts for subscription charges
 */

export interface ChargeEvent {
  id: string;
  amount: string;
  token: string;
  merchant: string;
  date: Date;
  hash: string;
}

/**
 * Generate a plain-text receipt for a charge event
 * Suitable for printing or downloading
 */
export function generateReceiptText(charge: ChargeEvent): string {
  const formattedDate = charge.date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = charge.date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
═══════════════════════════════════════════════════════════════
                        CHARGE RECEIPT
═══════════════════════════════════════════════════════════════

Date:                      ${formattedDate} at ${formattedTime}
Amount:                    ${charge.amount} ${charge.token}
Merchant:                  ${charge.merchant}
Transaction Hash:          ${charge.hash}

───────────────────────────────────────────────────────────────

This receipt confirms that the charge has been processed on the
Stellar blockchain. Keep this for your records.

Transaction details can be verified on the Stellar Explorer using
the transaction hash above.

═══════════════════════════════════════════════════════════════
`.trim();
}

/**
 * Generate HTML for a printable receipt
 */
export function generateReceiptHTML(charge: ChargeEvent): string {
  const formattedDate = charge.date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = charge.date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${charge.amount} ${charge.token}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    .receipt {
      border: 2px solid #333;
      padding: 30px;
      margin: 20px 0;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      margin: 0 0 30px 0;
    }
    .divider {
      border-top: 1px solid #ccc;
      margin: 20px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
    }
    .label {
      font-weight: bold;
      color: #666;
    }
    .value {
      text-align: right;
      word-break: break-all;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 30px;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .receipt { border-width: 1px; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <h1>Charge Receipt</h1>
    <div class="row">
      <span class="label">Date</span>
      <span class="value">${formattedDate} at ${formattedTime}</span>
    </div>
    <div class="row">
      <span class="label">Amount</span>
      <span class="value"><strong>${charge.amount} ${charge.token}</strong></span>
    </div>
    <div class="row">
      <span class="label">Merchant</span>
      <span class="value">${charge.merchant}</span>
    </div>
    <div class="divider"></div>
    <div class="row">
      <span class="label">Transaction Hash</span>
      <span class="value"><code>${charge.hash}</code></span>
    </div>
    <div class="footer">
      <p>This receipt confirms that the charge has been processed on the Stellar blockchain.</p>
      <p>Keep this for your records. Transaction details can be verified on the Stellar Explorer.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
