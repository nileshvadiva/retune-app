// Gmail (and Google Workspace) ignore dots in the local part, and anything
// after a "+" is just a tag — user@gmail.com, u.s.e.r@gmail.com, and
// user+anything@gmail.com all deliver to the exact same inbox. Without
// normalizing this, someone could sign up dozens of "different" accounts
// from one real Gmail address to keep getting free tunes.
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const [localPart, domain] = trimmed.split("@");
  if (!domain) return trimmed;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const withoutTag = localPart.split("+")[0];
    const withoutDots = withoutTag.replace(/\./g, "");
    return `${withoutDots}@gmail.com`;
  }

  return trimmed;
}
