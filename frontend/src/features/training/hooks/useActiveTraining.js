import { useCallback, useEffect, useRef, useState } from "react";
import { trainingApi } from "../api/trainingApi";

export function useActiveTraining(userId) {
  const key = `jjgym:training:v1:${userId}`;
  const current = useRef(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const [draft, setDraft] = useState(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [summary, setSummary] = useState(null);

  const store = useCallback((value) => {
    current.current = value;
    if (mounted.current) setDraft(value);
    try {
      if (value && (value.pending || value.dirty || value.action)) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.removeItem(key);
      }
      if (mounted.current) setStorageError(false);
    } catch {
      if (mounted.current) setStorageError(true);
    }
  }, [key]);

  const sync = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    setStatus("Sincronizando…");
    try {
      if (!current.current) {
        const server = await trainingApi.active();
        if (server) store({ ...server, contenido: server.sesion });
      }
      while (current.current && mounted.current) {
        const item = current.current;
        if (item.revision == null) {
          const server = await trainingApi.start(item.id, item.initial);
          if (server.estado !== "en_curso") {
            store(null);
            if (server.estado === "finalizado") setSummary(server);
            break;
          }
          store({ ...current.current, revision: server.revision, iniciadoEn: server.iniciadoEn,
            dirty: current.current.contenido !== item.initial || item.dirty });
        } else if (item.pending || item.dirty) {
          const pending = item.pending || { revision: item.revision, contenido: item.contenido };
          if (!item.pending) store({ ...item, pending, dirty: false });
          const server = await trainingApi.sync(item.id, pending.revision, pending.contenido);
          store({ ...current.current, revision: server.revision, pending: null });
        } else if (item.action) {
          const server = await trainingApi.close(item.id, item.revision, item.action);
          store(null);
          if (server.estado === "finalizado") setSummary(server);
          break;
        } else {
          break;
        }
      }
      if (mounted.current) {
        setReady(true);
        setStatus("Sincronizado");
      }
    } catch (err) {
      if (mounted.current) {
        setError(err.message);
        setStatus(err.status === 409 ? "Conflicto de sincronización" : "Pendiente de sincronizar");
        if (current.current) setReady(true);
      }
    } finally {
      inFlight.current = false;
    }
  }, [store]);

  useEffect(() => {
    mounted.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved) store(saved);
    } catch {
      setStorageError(true);
    }
    void sync();
    window.addEventListener("online", sync);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", sync);
    };
  }, [key, store, sync]);

  useEffect(() => {
    if (!draft?.dirty || error) return;
    const timeout = setTimeout(sync, 500);
    return () => clearTimeout(timeout);
  }, [draft, error, sync]);

  function start(contenido) {
    if (current.current || inFlight.current) return;
    setSummary(null);
    store({ id: crypto.randomUUID(), revision: null, contenido, initial: contenido,
      iniciadoEn: new Date().toISOString(), dirty: true });
    void sync();
  }

  function edit(transform) {
    const item = current.current;
    if (item && !item.action) store({ ...item, contenido: transform(item.contenido), dirty: true });
  }

  function close(action) {
    const item = current.current;
    if (!item || item.action) return;
    store({ ...item, action });
    void sync();
  }

  async function recoverServer() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const server = await trainingApi.active();
      store(server ? { ...server, contenido: server.sesion } : null);
      setError("");
      setStatus("Sincronizado");
      setReady(true);
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
    }
  }

  const pending = draft && (draft.dirty || draft.pending || draft.action || draft.revision == null);
  return { draft, ready, status: pending && status === "Sincronizado" ? "Pendiente de sincronizar" : status,
    error, storageError, summary, dismissSummary: () => setSummary(null), start, edit, close, sync, recoverServer };
}
