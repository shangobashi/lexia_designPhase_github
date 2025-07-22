import { useState, useEffect } from "react";

type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(currentToasts => currentToasts.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const toast = (props: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, ...props };
    
    setToasts((prev) => [...prev, newToast]);
    
    return id;
  };

  const dismiss = (toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  return { toast, dismiss, toasts };
}