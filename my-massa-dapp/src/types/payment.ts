export type PaymentEventType =
    | "link_created"
    | "payment_received"
    | "withdrawal"
    | "registration";

export interface PaymentEvent {
    id: string;
    type: PaymentEventType;
    message: string;
    amount?: number;
    timestamp: string;
    metadata?: Record<string, string>;
}

export interface PaymentLink {
    id: string;
    description: string;
    amountType: "fixed" | "any";
    targetAmount?: number;
    totalReceived: number;
    lastPaymentAt?: string;
    createdAt: string;
}

export interface PaymentDashboardSnapshot {
    registeredName?: string;
    address?: string;
    contractBalance: number;
    totalReceived: number;
    totalLinks: number;
    lastPaymentAt?: string;
}

export interface PaymentUserState {
    address: string;
    registeredName?: string;
    contractBalance: number;
    links: PaymentLink[];
    events: PaymentEvent[];
}

