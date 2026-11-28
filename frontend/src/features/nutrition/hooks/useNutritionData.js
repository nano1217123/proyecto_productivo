import { useEffect, useState } from "react";
import { readNutrition } from "../api/nutritionApi";

export function useNutritionData(path, params, version) {
  const [result, setResult] = useState({ key: null });
  const query = JSON.stringify(params ?? {});
  const source = JSON.stringify([path, query]);
  const key = JSON.stringify([source, version]);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    readNutrition(path, JSON.parse(query), controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ source, key, data }); },
      (error) => { if (!controller.signal.aborted) setResult((previous) => ({ source, key, data: previous.source === source ? previous.data : undefined, error: error.message })); },
    );
    return () => controller.abort();
  }, [path, query, key, source]);
  return result.key === key ? result : { data: result.source === source ? result.data : undefined, loading: Boolean(path) };
}
