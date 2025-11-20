import {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
}

interface ToastContextValue {
    push(message: string, variant?: ToastVariant): void;
    success(message: string): void;
    error(message: string): void;
    info(message: string): void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (message: string, variant: ToastVariant = "info") => {
            const id = crypto.randomUUID();
            setToasts((prev) => [...prev, { id, message, variant }]);
            setTimeout(() => removeToast(id), 4500);
        },
        [removeToast],
    );

    const value = useMemo<ToastContextValue>(
        () => ({
            push,
            success: (message: string) => push(message, "success"),
            error: (message: string) => push(message, "error"),
            info: (message: string) => push(message, "info"),
        }),
        [push],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-stack">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast toast--${toast.variant}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

