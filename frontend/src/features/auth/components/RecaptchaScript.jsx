"use client";

import Script from "next/script";
import { recaptchaSiteKey } from "../api/recaptcha";

export function RecaptchaScript() {
  if (!recaptchaSiteKey) return null;

  return (
    <Script src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`} />
  );
}
