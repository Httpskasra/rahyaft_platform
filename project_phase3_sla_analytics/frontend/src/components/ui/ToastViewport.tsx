import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ToastMessage } from "@/hooks/useToast";

export function ToastViewport({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur",
            "animate-in fade-in slide-in-from-bottom-3 duration-300",
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white",
          )}
        >
          {toast.type === "success" ? (
            <Check size={15} className="shrink-0" />
          ) : (
            <AlertCircle size={15} className="shrink-0" />
          )}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
