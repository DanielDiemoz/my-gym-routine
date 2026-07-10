export const LEGACY_EMAIL_SUFFIX = "@gymbro.local";

export function isLegacyEmail(email?: string | null) {
  return !!email && email.endsWith(LEGACY_EMAIL_SUFFIX);
}
