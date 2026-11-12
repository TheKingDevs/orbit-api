"use client";

import { useEffect, useState } from "react";

export function useCurrentTimestamp(): number | null {
  const [timestamp, setTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setTimestamp(Date.now());
    const initialUpdate = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 15_000);

    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  return timestamp;
}
