# Flight Master SSoT — File Migration Checklist

Status legend: `[ ] Not Started` · `[~] In Progress` · `[V] Verified` · `[P] Production Ready`

Per-file verification: TypeScript build → lint → runtime smoke → invoice generation → historical flight render → finalized invoice render → print template render → orphan SQL = 0.

## Phase A — Station Dispatch surface
- [~] 1. `src/pages/StationDispatch.tsx`
- [~] 2. `src/components/security/SecurityTaskSheetDialog.tsx`
- [~] 3. `src/components/dispatch/DispatchContent.tsx`

## Phase B — Operations / Pending Approval
- [ ] 4. `src/pages/SecurityServiceReports.tsx`
- [ ] 5. `src/data/dispatch.ts`
- [ ] 6. `src/data/serviceReports.ts`
- [ ] 7. `src/lib/securityDispatchRows.ts`
- [ ] 8. `src/lib/securityRowDisplay.ts`

## Phase C — Invoices & Print
- [ ] 9. `src/pages/Invoices.tsx`
- [ ] 10. `src/components/invoices/InvoiceDetailModal.tsx`
- [ ] 11. `src/components/invoices/SecurityInvoicePrintView.tsx`
- [ ] 12. `src/components/InvoicePrintView.tsx`
- [ ] 13. `src/lib/securityInvoiceDetail.ts`
- [ ] 14. `src/lib/securityChargeCalculator.ts`
- [ ] 15. `src/lib/securityDownloadFields.ts`
- [ ] 16. `supabase/functions/finalize-invoice/index.ts`

## Phase D — Helpers, hooks, reports, utilities
- [ ] 17. `src/data/flights.ts`
- [ ] 18. `src/data/finance.ts`
- [ ] 19. `src/hooks/domain.ts`
- [ ] 20. `src/pages/OperationsReports.tsx`
- [ ] 21. `src/pages/FinancialReports.tsx` + `src/pages/AgingReports.tsx`
- [ ] 22. `src/pages/ServiceReport.tsx` + `src/components/serviceReport/*`
- [ ] 23. `src/lib/flightRefMatch.ts` + `src/cache/queryKeys.ts`

## Phase 7 gate (do not enter without explicit approval)
- [ ] 0 TS errors
- [ ] 0 runtime errors
- [ ] 0 invoice regressions
- [ ] 0 report regressions
- [ ] All 23 files `[V] Verified`
- [ ] All historical flights accessible
- [ ] All finalized invoices render
- [ ] Validation SQL returns 0 drift rows for 7 consecutive days
