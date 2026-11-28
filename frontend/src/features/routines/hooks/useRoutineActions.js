import { useRef, useState } from "react";
import { routinesApi } from "../api/routinesApi";

export function useRoutineActions(onChange) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setError] = useState("");

  async function change(action, rutina) {
    if (pending.current) return;
    if (action === "delete" && !window.confirm(
      `¿Eliminar la rutina «${rutina.nombre}»? Tus entrenamientos anteriores y registros de progreso se conservarán.`
    )) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action === "delete") await routinesApi.deleteRoutine(rutina.id);
      else await routinesApi.archiveRoutine(rutina.id, action === "archive");
      setNotice({ delete: "Rutina eliminada.", archive: "Rutina archivada.", restore: "Rutina restaurada." }[action]);
      onChange(action, rutina);
    } catch (error) {
      setError(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return { busy, notice, actionError, change };
}
