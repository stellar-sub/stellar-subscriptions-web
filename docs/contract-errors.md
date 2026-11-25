# Contract Error Reference

This document maps every numeric error code returned by the contracts to its raw name and the user-facing sentence shown in the UI. It is intended for support contributors debugging user reports.

The source of truth is the error tables in [`lib/contracts.ts`](../lib/contracts.ts). If a code is missing here, check that file first.

---

## `SUBSCRIPTION_ERRORS`

Errors returned by the subscription contract.

| Code | Raw name | User-facing sentence | When it occurs |
|------|----------|----------------------|----------------|
| 1 | `UNAUTHORIZED` | You are not authorized to perform this action. | The caller is not the subscription owner or an approved operator. |
| 2 | `NOT_FOUND` | The requested subscription was not found. | The subscription ID does not exist or has been removed. |
| 3 | `ALREADY_EXISTS` | This subscription already exists. | Attempting to create a subscription that is already registered. |
| 4 | `INVALID_STATUS` | The subscription is not in a valid state for this action. | The action requires a different subscription status (e.g. active vs. cancelled). |
| 5 | `INSUFFICIENT_FUNDS` | Your balance is insufficient to complete this payment. | The payer's balance is lower than the amount due. |
| 6 | `PAYMENT_FAILED` | The payment could not be processed. | The payment transfer failed at the token or contract level. |
| 7 | `NOT_DUE` | This subscription is not due for payment yet. | Attempting to charge before the next billing period has elapsed. |
| 8 | `EXPIRED` | This subscription has expired. | The subscription's end date has passed. |
| 9 | `CANCELLED` | This subscription has been cancelled. | The subscription was cancelled and can no longer be used. |
| 10 | `INVALID_AMOUNT` | The amount provided is invalid. | The amount is zero, negative, or otherwise out of range. |
| 11 | `INVALID_INTERVAL` | The billing interval is invalid. | The billing interval is zero or outside the allowed range. |

---

## `PLAN_ERRORS`

Errors returned by the plan management contract.

| Code | Raw name | User-facing sentence | When it occurs |
|------|----------|----------------------|----------------|
| 1 | `UNAUTHORIZED` | You are not authorized to perform this action. | The caller is not the plan owner or an approved operator. |
| 2 | `NOT_FOUND` | The requested plan was not found. | The plan ID does not exist or has been removed. |
| 3 | `ALREADY_EXISTS` | This plan already exists. | Attempting to create a plan with an ID that is already in use. |
| 4 | `INVALID_PRICE` | The plan price is invalid. | The price is zero, negative, or outside the allowed range. |
| 5 | `INVALID_INTERVAL` | The billing interval is invalid. | The billing interval is zero or outside the allowed range. |
| 6 | `PLAN_INACTIVE` | This plan is no longer active. | The plan has been deactivated and cannot accept new subscriptions. |
| 7 | `HAS_SUBSCRIBERS` | This plan cannot be removed while it has active subscribers. | Attempting to delete or deactivate a plan that still has subscribers. |
| 8 | `INVALID_METADATA` | The plan metadata is invalid. | The provided metadata fails validation (e.g. malformed or too large). |

---

## `REGISTRY_ERRORS`

Errors returned by the registry contract.

| Code | Raw name | User-facing sentence | When it occurs |
|------|----------|----------------------|----------------|
| 1 | `UNAUTHORIZED` | You are not authorized to perform this action. | The caller is not the registry admin or an approved operator. |
| 2 | `NOT_FOUND` | The requested entry was not found. | The registry entry does not exist or has been removed. |
| 3 | `ALREADY_EXISTS` | This entry is already registered. | Attempting to register an entry that already exists. |
| 4 | `INVALID_ADDRESS` | The address provided is invalid. | The address is malformed, zero, or otherwise not allowed. |
| 5 | `INVALID_ENTRY` | The registry entry is invalid. | The entry fails validation (e.g. missing required fields). |
| 6 | `ENTRY_INACTIVE` | This registry entry is inactive. | The entry has been deactivated and cannot be used. |
| 7 | `DUPLICATE_NAME` | An entry with this name already exists. | Attempting to register a name that is already taken. |

---

## Notes for support

- The **user-facing sentence** is what the UI displays; the **raw name** is what appears in logs and contract return values.
- If a user reports a sentence that does not appear in this document, the UI may be showing a generic fallback — check the raw error code in the transaction logs.
- Codes are scoped per contract: code `1` in `SUBSCRIPTION_ERRORS` is not the same as code `1` in `PLAN_ERRORS`. Always identify which contract produced the error.