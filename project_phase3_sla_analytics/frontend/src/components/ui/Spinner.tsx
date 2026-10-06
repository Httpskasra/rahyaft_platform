import { Loader2 } from "lucide-react";

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <Loader2
      size={size}
      className="animate-spin text-brand-500 dark:text-brand-400"
    />
  );
}