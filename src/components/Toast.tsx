'use client';

import { useState, useCallback, useEffect, createContext, useContext } from 'react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  addToast: (type: ToastMessage['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', text: '#4ade80' },
  error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)', text: '#f87171' },
  info: { bg: 'rgba(124, 58, 237, 0.1)', border: 'rgba(124, 58, 237, 0.25)', text: '#a78bfa' },
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const colors = TOAST_COLORS[toast.type];

  return (
    <div
      className="animate-slide-in-right cursor-pointer rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
      onClick={onDismiss}
    >
      {toast.message}
    </div>
  );
}
