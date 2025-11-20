import {
    PaymentDashboardSnapshot,
    PaymentEvent,
    PaymentLink,
    PaymentUserState,
} from "../types/payment";

interface ServiceState {
    names: Record<string, string>;
    users: Record<string, PaymentUserState>;
}

const STORAGE_KEY = "paymentlink-mock-state";

const defaultState: ServiceState = {
    names: {},
    users: {},
};

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

function readState(): ServiceState {
    if (typeof window === "undefined") return defaultState;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    try {
        const parsed = JSON.parse(raw) as ServiceState;
        return parsed;
    } catch (error) {
        console.error("Failed to parse mock state", error);
        return defaultState;
    }
}

function writeState(next: ServiceState) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function ensureUser(state: ServiceState, address: string): PaymentUserState {
    if (!state.users[address]) {
        state.users[address] = {
            address,
            contractBalance: 0,
            events: [],
            links: [],
        };
    }
    return state.users[address];
}

function pushEvent(user: PaymentUserState, event: PaymentEvent) {
    user.events = [event, ...user.events].slice(0, 50);
}

export async function registerName(address: string, name: string) {
    await delay();
    const state = readState();
    const normalized = name.toLowerCase();
    if (state.names[normalized] && state.names[normalized] !== address) {
        throw new Error("Name already registered");
    }
    const user = ensureUser(state, address);
    user.registeredName = normalized;
    state.names[normalized] = address;
    pushEvent(user, {
        id: crypto.randomUUID(),
        type: "registration",
        message: `Registered as ${normalized}`,
        timestamp: new Date().toISOString(),
    });
    writeState(state);
    return normalized;
}

export async function isNameAvailable(name: string) {
    await delay(200);
    const state = readState();
    const normalized = name.toLowerCase();
    return !state.names[normalized];
}

export async function getAddressForName(name: string): Promise<string | null> {
    await delay(200);
    const state = readState();
    const normalized = name.toLowerCase();
    return state.names[normalized] ?? null;
}

export async function createPaymentLink(
    address: string,
    payload: { description: string; amount?: number },
): Promise<PaymentLink> {
    await delay();
    const state = readState();
    const user = ensureUser(state, address);
    const link: PaymentLink = {
        id: crypto.randomUUID().slice(0, 8),
        description: payload.description,
        amountType: payload.amount ? "fixed" : "any",
        targetAmount: payload.amount,
        totalReceived: 0,
        createdAt: new Date().toISOString(),
    };
    user.links = [link, ...user.links];
    pushEvent(user, {
        id: crypto.randomUUID(),
        type: "link_created",
        message: `Created payment link ${link.id}`,
        metadata: { description: link.description },
        timestamp: link.createdAt,
    });
    writeState(state);
    return link;
}

export async function getLinks(address: string): Promise<PaymentLink[]> {
    await delay(200);
    const state = readState();
    return ensureUser(state, address).links;
}

export async function recordPaymentToName(
    name: string,
    amount: number,
    description?: string,
) {
    await delay();
    const state = readState();
    const address = state.names[name.toLowerCase()];
    if (!address) {
        throw new Error("Name not registered");
    }
    const user = ensureUser(state, address);
    user.contractBalance += amount;
    pushEvent(user, {
        id: crypto.randomUUID(),
        type: "payment_received",
        message: `Payment received via name ${name}`,
        amount,
        metadata: description ? { description } : undefined,
        timestamp: new Date().toISOString(),
    });
    writeState(state);
}

export async function recordPaymentToLink(linkId: string, amount: number) {
    await delay();
    const state = readState();
    const entry = Object.values(state.users).find((user) =>
        user.links.some((link) => link.id === linkId),
    );
    if (!entry) {
        throw new Error("Payment link not found");
    }
    const link = entry.links.find((item) => item.id === linkId)!;
    link.totalReceived += amount;
    link.lastPaymentAt = new Date().toISOString();
    entry.contractBalance += amount;
    pushEvent(entry, {
        id: crypto.randomUUID(),
        type: "payment_received",
        message: `Payment received on link ${link.id}`,
        amount,
        metadata: { description: link.description },
        timestamp: link.lastPaymentAt,
    });
    writeState(state);
}

export async function withdraw(address: string): Promise<number> {
    await delay();
    const state = readState();
    const user = ensureUser(state, address);
    const amount = user.contractBalance;
    if (amount <= 0) {
        throw new Error("No balance to withdraw");
    }
    user.contractBalance = 0;
    pushEvent(user, {
        id: crypto.randomUUID(),
        type: "withdrawal",
        message: `Withdrew ${amount} MAS`,
        amount,
        timestamp: new Date().toISOString(),
    });
    writeState(state);
    return amount;
}

export async function getDashboardSnapshot(
    address: string,
): Promise<PaymentDashboardSnapshot> {
    await delay(200);
    const state = readState();
    const user = ensureUser(state, address);
    return {
        registeredName: user.registeredName,
        address: user.address,
        contractBalance: user.contractBalance,
        totalLinks: user.links.length,
        totalReceived: user.events
            .filter((event) => event.type === "payment_received")
            .reduce((sum, event) => sum + (event.amount ?? 0), 0),
        lastPaymentAt: user.events.find((event) => event.type === "payment_received")
            ?.timestamp,
    };
}

export async function getEvents(address: string): Promise<PaymentEvent[]> {
    await delay(200);
    const state = readState();
    return ensureUser(state, address).events;
}

export function resetMockData() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
}

export async function getPaymentLinkRaw(linkId: string) {
    await delay(200);
    const state = readState();
    const entry = Object.values(state.users).find((user) =>
        user.links.some((link) => link.id === linkId),
    );
    if (!entry) {
        throw new Error("Link not found");
    }
    const link = entry.links.find((item) => item.id === linkId)!;
    const raw = `${entry.address}|${link.description}|${link.targetAmount ?? 0}`;
    return { raw, link };
}

