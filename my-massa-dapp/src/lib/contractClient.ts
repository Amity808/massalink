import {
    Args,
    Mas,
    OperationStatus,
    Provider,
    SmartContract,
    bytesToStr,
    JsonRPCClient,
} from "@massalabs/massa-web3";
import { extractReadableError } from "./errorFormat";

const CONTRACT_ADDRESS = "AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk";
const STORAGE_FEE = "0.02";

export async function registerNameOnChain(provider: Provider, name: string) {
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

/**
 * Finds the registered name for a given address by searching contract storage
 */
export async function getRegisteredNameForAddress(
    provider: Provider,
    address: string,
): Promise<string | null> {
    try {
        const prefix = "name_to_addr:";
        const prefixBytes = new TextEncoder().encode(prefix);

        // Try to get storage keys with prefix filter
        let keys: Uint8Array[];
        try {
            keys = await provider.getStorageKeys(CONTRACT_ADDRESS, prefixBytes, false);
        } catch (filterError) {
            // If filtering fails, try getting all keys and filter manually
            console.warn("Storage key filter failed, trying alternative method", filterError);
            try {
                const allKeys = await provider.getStorageKeys(CONTRACT_ADDRESS, undefined, false);
                keys = allKeys.filter((key) => {
                    const keyStr = new TextDecoder().decode(key);
                    return keyStr.startsWith(prefix);
                });
            } catch (allKeysError) {
                console.error("Failed to get storage keys", allKeysError);
                return null;
            }
        }

        console.log(`Found ${keys.length} storage keys with prefix "name_to_addr:"`);

        for (const key of keys) {
            const keyStr = new TextDecoder().decode(key);
            if (!keyStr.startsWith(prefix)) continue;

            const values = await provider.readStorage(CONTRACT_ADDRESS, [key], false);
            if (values[0]) {
                // Decode the stored address (contract stores it as a string)
                const storedAddress = new TextDecoder().decode(values[0]).trim();
                // Remove any null bytes or extra whitespace
                const cleanAddress = storedAddress.replace(/\0/g, "").trim();

                console.log(`Checking key "${keyStr}" with stored address "${cleanAddress}" against "${address}"`);

                if (cleanAddress === address) {
                    const name = keyStr.slice(prefix.length);
                    console.log(`Found registered name: "${name}"`);
                    return name;
                }
            }
        }

        console.log(`No registered name found for address ${address}`);
        return null;
    } catch (error) {
        console.error("Failed to fetch registered name from contract", error);
        return null;
    }
}

/**
 * Creates a payment link on-chain
 * @param provider - The wallet provider
 * @param description - Description of the payment link
 * @param amount - Optional fixed amount (0 or undefined means "any amount")
 * @returns The link ID
 */
export async function createPaymentLinkOnChain(
    provider: Provider,
    description: string,
    amount?: number,
): Promise<string> {
    try {
        const contract = new SmartContract(provider, CONTRACT_ADDRESS);
        const amountValue = amount ? BigInt(amount) : BigInt(0);
        const args = new Args().addString(description).addU64(amountValue);

        const operation = await contract.call("createPaymentLink", args, {
            coins: Mas.fromString(STORAGE_FEE),
        });

        if (typeof operation.waitSpeculativeExecution === "function") {
            const status = await operation.waitSpeculativeExecution();
            if (status !== OperationStatus.SpeculativeSuccess) {
                throw new Error("Payment link creation failed on-chain");
            }
        }

        // Try to extract link ID from events
        try {
            const events = await operation.getSpeculativeEvents();
            for (const event of events) {
                const eventData = event.data;
                if (eventData) {
                    const eventStr = typeof eventData === "string"
                        ? eventData
                        : bytesToStr(eventData);
                    // Event format: "Payment link {linkId} created by {address} for {description}"
                    const match = eventStr.match(/Payment link (\d+) created by/);
                    if (match && match[1]) {
                        console.log(`Extracted link ID from event: ${match[1]}`);
                        return match[1];
                    }
                }
            }
        } catch (eventError) {
            console.warn("Could not extract link ID from events", eventError);
        }

        // Fallback: return operation ID (user can check their links later)
        console.log("Could not extract link ID, returning operation ID:", operation.id);
        return operation.id;
    } catch (error) {
        throw new Error(extractReadableError(error));
    }
}

/**
 * Sends a payment to a registered name on-chain
 * @param provider - The wallet provider
 * @param name - The registered name to pay to
 * @param amount - The amount in MAS to send
 * @returns The operation ID
 */
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

/**
 * Sends a payment to a payment link on-chain
 * @param provider - The wallet provider
 * @param linkId - The payment link ID
 * @param amount - The amount in MAS to send
 * @returns The operation ID
 */
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

/**
 * Gets payment link data from the contract (read-only, no wallet required)
 * @param linkId - The payment link ID
 * @returns Payment link data: { recipientAddress, description, amount }
 */
export async function getPaymentLinkData(linkId: string): Promise<{
    recipientAddress: string;
    description: string;
    amount: bigint | null; // null means "any amount"
}> {
    try {
        const client = JsonRPCClient.buildnet();
        const args = new Args().addString(linkId);

        const result = await client.executeReadOnlyCall({
            target: CONTRACT_ADDRESS,
            func: "getPaymentLink",
            parameter: args.serialize(),
            caller: "AU0000000000000000000000000000000000000000000000000000000000000", // Dummy caller for read-only
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

