"use client";

import { motion, useMotionTemplate, useMotionValue, animate } from "framer-motion";
import { useEffect } from "react";

export function AuroraBackground() {
  const hue = useMotionValue(210);

  useEffect(() => {
    const controls = animate(hue, 540, {
      duration: 12,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    });
    return () => controls.stop();
  }, [hue]);

  const aurora = useMotionTemplate`linear-gradient(120deg,
    rgba(99,102,241,0.18),
    rgba(34,197,94,0.14),
    rgba(236,72,153,0.16),
    rgba(99,102,241,0.18)
  )`;

  const hueFilter = useMotionTemplate`hue-rotate(${hue}deg)`;

  return (
    <>
      <motion.div className="pointer-events-none absolute inset-0" style={{ backgroundImage: aurora, filter: hueFilter }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(0,0,0,0.9),transparent_55%)]" />

      <motion.div
        className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl"
        animate={{ y: [0, 22, 0], x: [0, 18, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-emerald-400/18 blur-3xl"
        animate={{ y: [0, -18, 0], x: [0, -14, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/15 blur-3xl"
        animate={{ rotate: [0, 18, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}
