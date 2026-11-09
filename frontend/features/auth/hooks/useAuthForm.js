import { useState } from "react";
import { useRouter } from "next/navigation";

export function useAuthForm(defaultRedirect = "/dashboard") {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(loginFn) {
    setError("");
    setSubmitting(true);
    try {
      await loginFn(email, password);
      router.push(defaultRedirect);
    } catch (err) {
      if (err.status === 403) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    error, setError,
    submitting, setSubmitting,
    handleLogin
  };
}
