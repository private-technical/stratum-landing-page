/* ------------------------------------------------------------------ */
/*  Shared field validation — used by any form that collects an email  */
/*  or a Stratum username, so the rules (and their error copy) stay    */
/*  identical everywhere they're asked for.                            */
/* ------------------------------------------------------------------ */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Adjust freely — this is the only place the rule is defined.
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value.trim());
}

export const EMAIL_ERROR = "Enter a valid email address.";
export const USERNAME_ERROR = "3–20 characters — letters, numbers, and underscores only.";