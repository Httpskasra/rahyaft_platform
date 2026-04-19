export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function normalizeIranPhone(input: string) {
  const digits = onlyDigits(input);
  if (digits.length === 0) return "";

  if (digits.startsWith("09") && digits.length === 11) return "+98" + digits.slice(1);
  if (digits.startsWith("9") && digits.length === 10) return "+98" + digits;
  if (digits.startsWith("989") && digits.length === 12) return "+" + digits;
  if (digits.startsWith("98") && digits.length === 12) return "+" + digits;

  return input.startsWith("+") ? input : "+" + digits;
}

export function isValidIranE164(phone: string) {
  return /^\+98\d{10}$/.test(phone);
}
