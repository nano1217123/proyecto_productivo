import { useEffect, useState } from "react";

export function useRestTimer() {
  const [automatic, setAutomatic] = useState(true);
  const [timer, setTimer] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer?.deadline) return;
    const deadline = timer.deadline;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) clearInterval(id);
    };
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [timer?.deadline]);

  function start(seconds) {
    if (!seconds) return;
    const time = Date.now();
    setNow(time);
    setTimer({ original: seconds * 1000, deadline: time + seconds * 1000 });
  }

  const remaining = timer ? Math.max(0, timer.deadline ? timer.deadline - now : timer.remaining) : 0;

  function toggle() {
    const time = Date.now();
    setNow(time);
    setTimer((old) => old.deadline
      ? { ...old, remaining: Math.max(0, old.deadline - time), deadline: null }
      : { ...old, deadline: time + old.remaining });
  }

  function adjust(seconds) {
    const time = Date.now();
    setNow(time);
    setTimer((old) => {
      const remaining = Math.max(0, (old.deadline ? old.deadline - time : old.remaining) + seconds * 1000);
      return old.deadline ? { ...old, deadline: time + remaining } : { ...old, remaining };
    });
  }

  return { automatic, setAutomatic, timer, remaining: Math.ceil(remaining / 1000),
    start, toggle, adjust, reset: () => start(timer.original / 1000), skip: () => setTimer(null) };
}
