// Indian PIN codes: exactly six digits, first digit 1–9.
export const PINCODE_RE = /^[1-9]\d{5}$/;

export type PincodeValidation = { valid: true; pincode: string } | { valid: false; message: string };

/** Spaces are tolerated ("572 103"); everything else must be digits. */
export function validatePincode(input: string): PincodeValidation {
  const value = input.replace(/\s+/g, '');
  if (value === '') return { valid: false, message: 'Enter your 6-digit PIN code' };
  if (!/^\d+$/.test(value)) return { valid: false, message: 'A PIN code can only contain digits' };
  if (value.length !== 6) return { valid: false, message: 'A PIN code has exactly 6 digits' };
  if (value.startsWith('0')) return { valid: false, message: "PIN codes don't start with 0" };
  return { valid: true, pincode: value };
}
