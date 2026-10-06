"use client";

import { useEffect, useState } from "react";

export function useCooldown() {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  return { cooldown, start: setCooldown, reset: () => setCooldown(0) };
}
