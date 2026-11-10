// The passport name's rules (onboarding question 3 and the review's Name sheet): what the user typed, tidied, and
// the one problem to show if it cannot go on the passport.

/** Longest name the passport card and its machine-readable line show in full. */
export const NAME_MAX = 24;

/** The name as it is kept: compatibility forms folded (full-width letters), runs of spaces made one, ends trimmed. */
export function cleanName(raw: string): string {
  return raw.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/** Why this name cannot be used, or null when it can. Checked on the cleaned name. */
export function nameError(raw: string): string | null {
  const name = cleanName(raw);
  if (!name) return 'Type a name or nickname for your passport.';
  if (Array.from(name).length > NAME_MAX) return `Keep it to ${NAME_MAX} characters or fewer.`;
  if (!/\p{L}/u.test(name)) return 'Use at least one letter.';
  if (/[^\p{L}\p{M}\p{N} .'’-]/u.test(name)) return 'Use letters, numbers, spaces, hyphens, apostrophes or full stops only.';
  return null;
}
