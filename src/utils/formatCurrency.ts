// frontend/src/utils/formatCurrency.ts
// Formats financial numbers in Indian Rupees (INR / ₹) standard notation.

export function formatINR(amountPaiseOrRupees: number, isMinorUnits: boolean = true): string {
  const rupees = isMinorUnits ? amountPaiseOrRupees / 100 : amountPaiseOrRupees;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function formatNumberIN(val: number): string {
  return new Intl.NumberFormat('en-IN').format(val);
}

