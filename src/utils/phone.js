// Phone number normalisation to E.164 (default country: Pakistan, +92). Part of #2.
// Accepts common Pakistani formats such as 03001234567, 0300-1234567, 3001234567,
// +92 300 1234567, 923001234567 and 0092…, and any valid international +<country> number.

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * @param {string} input
 * @returns {{ e164: string } | { error: string }}
 */
export function normalizePhone(input) {
  if (typeof input !== 'string' || !input.trim()) return { error: 'Phone number is required.' };
  const raw = input.trim();
  if (/[^\d\s()+\-.]/.test(raw)) return { error: 'Use digits only (spaces and dashes are fine).' };

  const hasPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');

  if (hasPlus) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2); // 0092… -> 92…
  } else if (digits.startsWith('92') && digits.length === 12) {
    // 923001234567
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`; // 03001234567
  } else if (digits.length === 10 && digits.startsWith('3')) {
    digits = `92${digits}`; // 3001234567
  } else {
    return { error: 'Enter a Pakistani mobile number (e.g. 0300 1234567) or an international number starting with +.' };
  }

  const e164 = `+${digits}`;
  if (!E164.test(e164)) return { error: 'This does not look like a valid phone number.' };
  if (e164.startsWith('+92') && !/^\+923\d{9}$/.test(e164)) {
    return { error: 'Pakistani mobile numbers look like 03XX XXXXXXX.' };
  }
  return { e164 };
}

/** wa.me link (digits only, no "+") or null when the number is unusable. */
export function whatsAppLink(phone, text = '') {
  const result = normalizePhone(phone ?? '');
  if (!('e164' in result)) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${result.e164.slice(1)}${query}`;
}
