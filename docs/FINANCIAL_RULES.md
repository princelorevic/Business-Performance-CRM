# Financial reporting rules

This app provides **management reporting**. It is not a replacement for formal accounting software
and does not implement double-entry bookkeeping, tax, or multi-currency conversion.

All money is stored as `DECIMAL(15,2)` and computed in integer cents (BigInt) in
`backend/src/utils/money.js`. No floating-point math touches monetary values.
All formulas live in `backend/src/services/financialCalculations.js` and are unit-tested.

| Metric | Definition |
|---|---|
| Recognized revenue | Sum of invoice totals with status `sent`, `partially_paid`, `paid`, `overdue`, dated by **issue date**, minus **completed refunds** dated in the period |
| Recognized expenses | Sum of expenses with status `approved` or `paid`, dated by **expense date** |
| Net profit | Recognized revenue − recognized expenses |
| Net profit margin | Net profit ÷ recognized revenue × 100 (`null` when revenue is 0) |
| Revenue growth | (Current revenue − previous revenue) ÷ previous revenue × 100 (`null` when previous is 0) |
| Cash received / paid | Completed payments dated by **payment date**. Incoming = received. Outgoing = expense payments and customer refunds |
| Cash flow | Cash received − cash paid |
| Outstanding receivable | Per issued invoice: total − (completed incoming − completed refunds), floored at 0. Void/draft invoices carry none |
| ROI | (Attributed returns − investment cost) ÷ cost × 100, cumulative up to the as-of date (`null` when cost ≤ 0) |
| Target achievement | Issued-invoice totals in the target period (by seller for personal targets) ÷ target × 100 |
| Win rate | Won ÷ (won + lost) among opportunities closed in the period (`null` when none closed) |

## Treatment rules
- **No double counting:** invoices create revenue; payments only create cash. A payment never adds revenue.
- **Draft and void** invoices and expenses are excluded from revenue/expenses.
- **Unpaid invoices** count as revenue (accrual) and appear as receivables.
- **Partial payments** reduce the receivable and set status `partially_paid`.
- **Refunds** are outgoing cash, reduce recognized revenue, and reopen the receivable. Refunds are capped at the refundable amount of the original payment.
- **Overpayment** is rejected (payment may not exceed the outstanding balance).
- **Pending / failed / void payments** never count as cash.
- **Duplicate payment attempts:** every payment/refund/expense-payment carries a client idempotency key,
  unique per company. A retry returns the original record (HTTP 200, `replayed: true`); the same key with different
  data is a 409. A unique DB index makes concurrent duplicates safe.
- **Paying an expense** creates an outgoing payment; the expense amount is recognized once (by expense date), the payment is cash only.
- **Time zones:** dates are `YYYY-MM-DD` calendar dates with no time component. "Today" (overdue detection) uses the company time zone.
- **Voiding an invoice** requires its received money to be refunded first.
- **Investment returns** must be attributed explicitly; revenue is never treated as an investment return.
- **Previous period** = the equal-length period ending the day before the selected range starts.
