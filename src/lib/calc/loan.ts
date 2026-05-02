import type { ScenarioFinancing } from '@/types';

export type LoanRow = {
  year: number;
  interest: number;
  principal: number;
  payment: number;
  balance: number; // principal balance at end of year
};

/**
 * Annuity-style loan schedule with optional grace period.
 *
 * - During grace years: interest-only payments. Principal balance unchanged.
 * - Post-grace: equal annual payment (annuity) over remaining years until
 *   `termYears` (term counts from year 1, including grace).
 * - Optional `extraAnnualPrincipal` is added to the post-grace payment as a
 *   prepayment toward principal, which can retire the loan earlier than
 *   `termYears`. Once the balance reaches 0 the schedule emits zero rows.
 * - Optional `extraByYear` allows a per-year extra-principal amount (indexed
 *   from year 0). When provided, it takes precedence over `extraAnnualPrincipal`
 *   for any year where it's defined.
 *
 * Returned array has `lifespanYears` entries; rows past the term are zeroed.
 */
export function loanSchedule(
  args: {
    principal: number;
    ratePct: number;
    termYears: number;
    gracePeriodYears: number;
    extraAnnualPrincipal?: number;
    extraByYear?: number[];
  },
  lifespanYears: number
): LoanRow[] {
  const {
    principal,
    ratePct,
    termYears,
    gracePeriodYears,
    extraAnnualPrincipal = 0,
    extraByYear,
  } = args;
  const rate = ratePct / 100;
  const rows: LoanRow[] = [];

  if (principal <= 0 || termYears <= 0) {
    for (let i = 0; i < lifespanYears; i++) {
      rows.push({ year: i + 1, interest: 0, principal: 0, payment: 0, balance: 0 });
    }
    return rows;
  }

  const grace = Math.min(Math.max(0, Math.floor(gracePeriodYears)), termYears);
  const repaymentYears = termYears - grace;

  // Annuity payment on the principal over repaymentYears
  let annuity = 0;
  if (repaymentYears > 0) {
    annuity =
      rate === 0
        ? principal / repaymentYears
        : (principal * rate) / (1 - Math.pow(1 + rate, -repaymentYears));
  }

  const extra = Math.max(0, extraAnnualPrincipal);

  let balance = principal;
  for (let i = 0; i < lifespanYears; i++) {
    const yearNum = i + 1;
    if (yearNum <= grace) {
      const interest = balance * rate;
      rows.push({
        year: yearNum,
        interest,
        principal: 0,
        payment: interest,
        balance,
      });
    } else if (yearNum <= termYears && balance > 1e-6) {
      const interest = balance * rate;
      const scheduled = Math.min(annuity - interest, balance);
      const remaining = Math.max(0, balance - scheduled);
      const yearExtra = extraByYear?.[i] ?? extra;
      const extraPmt = Math.min(Math.max(0, yearExtra), remaining);
      const principalPmt = scheduled + extraPmt;
      const payment = interest + principalPmt;
      balance = Math.max(0, balance - principalPmt);
      rows.push({
        year: yearNum,
        interest,
        principal: principalPmt,
        payment,
        balance,
      });
    } else if (balance > 1e-6) {
      // Past term but still owe (only possible w/ degenerate inputs); pay it all
      const interest = balance * rate;
      const principalPmt = balance;
      rows.push({
        year: yearNum,
        interest,
        principal: principalPmt,
        payment: interest + principalPmt,
        balance: 0,
      });
      balance = 0;
    } else {
      rows.push({ year: yearNum, interest: 0, principal: 0, payment: 0, balance: 0 });
    }
  }
  return rows;
}

export function loanAmountForScenario(
  capexTotal: number,
  financing: ScenarioFinancing
): number {
  if (financing.manualLoanAmount !== undefined && financing.manualLoanAmount > 0) {
    return financing.manualLoanAmount;
  }
  const pct = Math.max(0, Math.min(100, financing.financedPct));
  return (capexTotal * pct) / 100;
}
