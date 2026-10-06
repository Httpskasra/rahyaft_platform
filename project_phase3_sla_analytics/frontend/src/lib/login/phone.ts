export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function normalizeIranPhone(input: string): string {
  const digits = onlyDigits(input);

  if (!digits) return "";

  // 09123456789
  if (digits.startsWith("09") && digits.length === 11) {
    return digits;
  }

  // 9123456789
  if (digits.startsWith("9") && digits.length === 10) {
    return "0" + digits;
  }

  // 989123456789
  if (digits.startsWith("989") && digits.length === 12) {
    return "0" + digits.slice(2);
  }

  // 989123456789
  if (digits.startsWith("98") && digits.length === 12) {
    return "0" + digits.slice(2);
  }

  // +989123456789 → 989123456789
  if (input.startsWith("+") && digits.startsWith("98")) {
    return "0" + digits.slice(2);
  }

  return digits;
}

export function isValidIranE164(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}
