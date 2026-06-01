import { useCallback, useEffect, useRef, useState } from 'react';

import type { SaveStatus } from '@/components/settings';

type Options<V> = {
  // Time between the last change and the save call.
  delayMs?: number;
  // How long the 'saved' badge sticks before reverting to 'idle'.
  savedHoldMs?: number;
  // Save the value to the backing store. Resolve to mark saved, throw to mark error.
  onSave: (value: V) => Promise<unknown>;
};

// Debounce a value and persist it via onSave, exposing a save-status badge
// state. The save fires `delayMs` after the last change. The status returns
// to 'idle' after `savedHoldMs`. If a save is in flight when a newer value
// arrives, the newer save supersedes it.
//
// Change detection uses `Object.is`. Safe for primitives and any value the
// caller keeps referentially stable across renders; pass a fresh object or
// array each render and every render will look like a change. Memoize the
// value (useMemo/useRef) before passing it in if it's non-primitive.
export function useDebouncedSave<V>(value: V, { delayMs = 500, savedHoldMs = 1500, onSave }: Options<V>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const lastSavedRef = useRef<V>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightTokenRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    // Skip if the value hasn't actually changed since the last successful save.
    if (Object.is(value, lastSavedRef.current)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const token = ++inFlightTokenRef.current;
      setStatus('saving');
      try {
        await onSaveRef.current(value);
        if (token !== inFlightTokenRef.current) return; // superseded
        lastSavedRef.current = value;
        setStatus('saved');
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setStatus('idle'), savedHoldMs);
      } catch {
        if (token !== inFlightTokenRef.current) return;
        setStatus('error');
      }
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs, savedHoldMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Mark the current value as already-saved (e.g. after an external load),
  // so we don't trigger a needless save on next render.
  const reset = useCallback((v: V) => {
    lastSavedRef.current = v;
    inFlightTokenRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('idle');
  }, []);

  return { status, reset };
}
