"use client";

import { useCallback, useState } from "react";

export type ToastType = "success" | "error";

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

let nextToastId = 0;

export function useToast(duration = 3500) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = ++nextToastId;
      setToasts((current) => [...current, { id, type, message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, duration);
    },
    [duration],
  );

  return { toasts, show };
}
