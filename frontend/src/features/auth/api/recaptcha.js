export const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();

export async function getLoginRecaptchaToken() {
  if (!recaptchaSiteKey) return undefined;

  const recaptcha = window.grecaptcha;
  const message = "No se pudo cargar la verificación reCAPTCHA. Inténtalo de nuevo.";
  if (!recaptcha?.ready) throw new Error(message);

  let timeout;
  try {
    return await Promise.race([
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), 8000);
      }),
      new Promise((resolve, reject) => {
        recaptcha.ready(() => {
          Promise.resolve()
            .then(() => recaptcha.execute(recaptchaSiteKey, { action: "login" }))
            .then(resolve, reject);
        });
      }),
    ]);
  } catch {
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }
}
