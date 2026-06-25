export function markOnboardingComplete() {
  window.__gymbro_onboarded = true;
}

export function checkOnboardingFlag(): boolean {
  if (typeof window === "undefined") return false;
  return window.__gymbro_onboarded === true;
}

export function resetOnboardingFlag() {
  if (typeof window === "undefined") return;
  delete window.__gymbro_onboarded;
}

declare global {
  interface Window { __gymbro_onboarded?: true; }
}
