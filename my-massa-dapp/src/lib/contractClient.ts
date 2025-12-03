import {
    Args,
    Mas,
    OperationStatus,
    Provider,
    SmartContract,
    bytesToStr,
    JsonRPCClient,
    JsonRpcProvider,
} from "@massalabs/massa-web3";
import { extractReadableError } from "./errorFormat";

const CONTRACT_ADDRESS = "AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk";
const STORAGE_FEE = "0.02";

export async function registerNameOnChain(provider: Provider | any, name: string) {
    try {
        const contract = new SmartContract(provider, CONTRACT_ADDRESS);
        const args = new Args().addString(name);
        const operation = await contract.call("register", args, {
            coins: Mas.fromString(STORAGE_FEE),
        });

        if (typeof operation.waitSpeculativeExecution === "function") {
            const status = await operation.waitSpeculativeExecution();
            if (status !== OperationStatus.SpeculativeSuccess) {
                throw new Error("Registration operation failed on-chain");
            }
        }

        return operation.id;
    } catch (error) {
        throw new Error(extractReadableError(error));
    }
}

export async function getRegisteredNameForAddress(
    _provider: Provider | any,
    address: string,
): Promise<string | null> {
    try {
        const readProvider = JsonRpcProvider.buildnet();
        const prefix = "name_to_addr:";
        const prefixBytes = new TextEncoder().encode(prefix);

        let keys: Uint8Array[];
        try {
            keys = await readProvider.getStorageKeys(CONTRACT_ADDRESS, prefixBytes, false);
        } catch (filterError) {
            console.warn("Storage key filter failed, trying alternative method", filterError);
            try {
                const allKeys = await readProvider.getStorageKeys(CONTRACT_ADDRESS, undefined, false);
                keys = allKeys.filter((key) => {
                    const keyStr = new TextDecoder().decode(key);
                    return keyStr.startsWith(prefix);
                });
            } catch (allKeysError) {
                return null;
            }
        }

        for (const key of keys) {
            const keyStr = new TextDecoder().decode(key);
            if (!keyStr.startsWith(prefix)) continue;

            const values = await readProvider.readStorage(CONTRACT_ADDRESS, [key], false);
            if (values[0]) {
                const storedAddress = new TextDecoder().decode(values[0]).trim();
                const cleanAddress = storedAddress.replace(/\0/g, "").trim();

                if (cleanAddress === address) {
                    const name = keyStr.slice(prefix.length);
                    return name;
                }
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

export async function createPaymentLinkOnChain(
    provider: Provider | any,
    description: string,
    amount?: number,
): Promise<string> {
    try {
        if (!description || description.trim().length === 0) {
            throw new Error("Description is required");
        }

        if (amount !== undefined && (amount < 0 || !Number.isFinite(amount))) {
            throw new Error("Amount must be a valid positive number");
        }

        const amountValue = amount ? BigInt(Math.floor(amount * 1e9)) : BigInt(0);
        const desc = description.trim();

        const contract = new SmartContract(provider, CONTRACT_ADDRESS);
        const args = new Args().addString(desc).addU64(amountValue);
        const operation = await contract.call("createPaymentLink", args, {
            coins: Mas.fromString(STORAGE_FEE),
        });

        if (typeof operation.waitSpeculativeExecution === "function") {
            const status = await operation.waitSpeculativeExecution();
            if (status !== OperationStatus.SpeculativeSuccess) {
                throw new Error("Payment link creation failed on-chain");
            }
        }

        try {
            const events = await operation.getSpeculativeEvents();
            for (const event of events) {
                const eventData = event.data;
                if (eventData) {
                    const eventStr = typeof eventData === "string"
                        ? eventData
                        : bytesToStr(eventData);
                    const match = eventStr.match(/Payment link (\d+) created by/);
                    if (match && match[1]) {
                        return match[1];
                    }
                }
            }
        } catch (eventError) {
            // Could not extract link ID from events
        }

        return operation.id;
    } catch (error) {
        throw new Error(extractReadableError(error));
    }
}

export async function payToNameOnChain(
    provider: Provider,
    name: string,
    amount: number,
): Promise<string> {
    try {
        const contract = new SmartContract(provider, CONTRACT_ADDRESS);
        const args = new Args().addString(name);
        const masAmount = Mas.fromString(amount.toString());

        const operation = await contract.call("payToName", args, {
            coins: masAmount,
        });

        if (typeof operation.waitSpeculativeExecution === "function") {
            const status = await operation.waitSpeculativeExecution();
            if (status !== OperationStatus.SpeculativeSuccess) {
                throw new Error("Payment to name failed on-chain");
            }
        }

        return operation.id;
    } catch (error) {
        throw new Error(extractReadableError(error));
    }
}

export async function payToLinkOnChain(
    provider: Provider,
    linkId: string,
    amount: number,
): Promise<string> {
    try {
        const contract = new SmartContract(provider, CONTRACT_ADDRESS);
        const args = new Args().addString(linkId);
        const masAmount = Mas.fromString(amount.toString());

        const operation = await contract.call("payToLink", args, {
            coins: masAmount,
        });

        if (typeof operation.waitSpeculativeExecution === "function") {
            const status = await operation.waitSpeculativeExecution();
            if (status !== OperationStatus.SpeculativeSuccess) {
                throw new Error("Payment to link failed on-chain");
            }
        }

        return operation.id;
    } catch (error) {
        throw new Error(extractReadableError(error));
    }
}

export async function getBalanceOnChain(address: string): Promise<number> {
    try {
        const readProvider = JsonRpcProvider.buildnet();
        const balanceKey = `balance:${address}`;
        const balanceKeyBytes = new TextEncoder().encode(balanceKey);

        const balanceBytes = await readProvider.readStorage(CONTRACT_ADDRESS, [balanceKeyBytes], false);
        if (!balanceBytes || !balanceBytes[0]) {
            return 0;
        }

        const balanceStr = new TextDecoder().decode(balanceBytes[0]).trim().replace(/\0/g, '');
        if (!balanceStr || balanceStr === '0') {
            return 0;
        }

        const balanceNanoMAS = BigInt(balanceStr);
        return Number(balanceNanoMAS) / 1e9;
    } catch (error) {
        return 0;
    }
}

export async function withdrawOnChain(provider: Provider | any): Promise<string> {
    try {
        const contract = new SmartContract(provider, CONTRACT_ADDRESS);
        const operation = await contract.call("withdraw", new Args());

        if (typeof operation.waitSpeculativeExecution === "function") {
            const status = await operation.waitSpeculativeExecution();
            if (status !== OperationStatus.SpeculativeSuccess) {
                throw new Error("Withdrawal failed on-chain");
            }
        }

        return operation.id;
    } catch (error) {
        throw new Error(extractReadableError(error));
    }
}

async function getPaymentsPerLinkFromEvents(): Promise<Map<string, number>> {
    const paymentsPerLink = new Map<string, number>();
    try {
        const readProvider = JsonRpcProvider.buildnet();
        const events = await readProvider.getEvents({
            smartContractAddress: CONTRACT_ADDRESS,
        });

        for (const event of events) {
            if (event.data) {
                const eventStr = typeof event.data === "string"
                    ? event.data
                    : bytesToStr(event.data);

                const match = eventStr.match(/Payment of (\d+(?:\.\d+)?) MAS sent via link (\d+)/);
                if (match) {
                    const amount = parseFloat(match[1]);
                    const linkId = match[2];
                    const current = paymentsPerLink.get(linkId) || 0;
                    paymentsPerLink.set(linkId, current + amount);
                }
            }
        }
    } catch (error) {
        // Failed to fetch events
    }
    return paymentsPerLink;
}

export async function getMyLinksOnChain(address: string): Promise<Array<{
    id: string;
    description: string;
    amount: number | null;
    recipientAddress: string;
    totalReceived: number;
}>> {
    try {
        const readProvider = JsonRpcProvider.buildnet();
        const contract = new SmartContract(readProvider, CONTRACT_ADDRESS);
        const args = new Args().addString(address);

        const [result, paymentsPerLink] = await Promise.all([
            contract.read("getAllMyLinkDetails", args),
            getPaymentsPerLinkFromEvents(),
        ]);

        const detailsStr = bytesToStr(result.value);

        if (!detailsStr || detailsStr.length === 0) {
            return [];
        }

        const links: Array<{ id: string; description: string; amount: number | null; recipientAddress: string; totalReceived: number }> = [];
        const linkStrings = detailsStr.split(',');

        for (const linkStr of linkStrings) {
            if (!linkStr || linkStr.trim().length === 0) continue;

            const parts = linkStr.split('|');
            if (parts.length >= 4) {
                const linkId = parts[0].trim();
                const recipientAddress = parts[1].trim();
                const description = parts[2].trim();
                const amountStr = parts[3].trim();

                let amount: number | null = null;
                if (amountStr !== '0' && amountStr.length > 0) {
                    try {
                        const amountNanoMAS = BigInt(amountStr);
                        amount = Number(amountNanoMAS) / 1e9;
                    } catch (e) {
                        // Failed to parse amount
                    }
                }

                const totalReceived = paymentsPerLink.get(linkId) || 0;

                links.push({
                    id: linkId,
                    description,
                    amount,
                    recipientAddress,
                    totalReceived,
                });
            }
        }

        return links;
    } catch (error) {
        return [];
    }
}

export async function getPaymentLinkData(linkId: string): Promise<{
    recipientAddress: string;
    description: string;
    amount: bigint | null;
}> {
    try {
        const client = JsonRPCClient.buildnet();
        const args = new Args().addString(linkId);

        const result = await client.executeReadOnlyCall({
            target: CONTRACT_ADDRESS,
            func: "getPaymentLink",
            parameter: args.serialize(),
            caller: "AU0000000000000000000000000000000000000000000000000000000000000",
        });

        if (!result.value || result.value.length === 0) {
            throw new Error("Payment link not found");
        }

        const linkDataStr = bytesToStr(result.value);
        const parts = linkDataStr.split("|");

        if (parts.length < 3) {
            throw new Error("Invalid payment link data format");
        }

        const recipientAddress = parts[0].trim();
        const description = parts[1].trim();
        const amountStr = parts[2].trim();
        const amount = amountStr === "0" ? null : BigInt(amountStr);

        return {
            recipientAddress,
            description,
            amount,
        };
    } catch (error) {
        throw new Error(extractReadableError(error));
    }
}

