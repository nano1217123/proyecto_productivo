import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export function useRegisterForm(gym) {
  const { signUp } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errorConfirmacion, setErrorConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(campo, valor) {
    if (campo === "password" || campo === "confirmPassword") setErrorConfirmacion("");
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setErrorConfirmacion("Las contraseñas no coinciden.");
      e.currentTarget.elements.namedItem("confirmPassword")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await signUp(form.nombres, form.apellidos, form.email, form.password);
      router.push(`/verify-otp?email=${encodeURIComponent(form.email)}${gym ? `&gym=${encodeURIComponent(gym)}` : ""}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return { form, error, errorConfirmacion, submitting, handleChange, handleSubmit };
}
