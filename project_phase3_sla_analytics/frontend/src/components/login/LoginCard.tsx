"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

export function LoginCard({ children }: { children: React.ReactNode }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const glow = useMotionTemplate`radial-gradient(420px at ${mx}px ${my}px, rgba(99,102,241,0.22), transparent 60%)`;

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      style={{ backgroundImage: glow }}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        mx.set(e.clientX - rect.left);
        my.set(e.clientY - rect.top);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="p-6">{children}</div>
    </motion.div>
  );
}
