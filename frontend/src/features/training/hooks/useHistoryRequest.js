import { useEffect, useState } from "react";

export function useHistoryRequest(key, request) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    request(controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ key, error: error.message });
    });
    return () => controller.abort();
    // La clave incluye todos los parámetros que determinan la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result?.key === key ? result : {};
}
