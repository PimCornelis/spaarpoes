// An error the app understands. `code` says what is wrong; the screens turn it into Dutch text.
export class BudgetError extends Error {
  constructor(code, details = {}) {
    super(`${code} ${JSON.stringify(details)}`);
    this.name = 'BudgetError';
    this.code = code;
    this.details = details;
  }
}

export function check(condition, code, details) {
  if (!condition) throw new BudgetError(code, details);
}
