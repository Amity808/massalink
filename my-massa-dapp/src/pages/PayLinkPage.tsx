import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { getPaymentLinkData, payToLinkOnChain } from "../lib/contractClient";

interface LinkData {
    recipientAddress: string;
    description: string;
    amount: bigint | null;
}

export function PayLinkPage() {
    const { linkId } = useParams<{ linkId: string }>();
    const { address, provider, connect, isConnecting } = useWallet();
    const toast = useToast();
    const [linkData, setLinkData] = useState<LinkData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [amount, setAmount] = useState("");

    useEffect(() => {
        const loadLinkData = async () => {
            if (!linkId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const data = await getPaymentLinkData(linkId);
                setLinkData(data);
                // Pre-fill amount if it's a fixed amount link
                if (data.amount !== null) {
                    setAmount(data.amount.toString());
                }
            } catch (error) {
                console.error("Failed to load payment link", error);
                toast.error(
                    error instanceof Error ? error.message : "Payment link not found"
                );
            } finally {
                setIsLoading(false);
            }
        };
        void loadLinkData();
    }, [linkId, toast]);

    const handlePayment = async (event: FormEvent) => {
        event.preventDefault();
        if (!provider || !linkId) {
            toast.error("Please connect your wallet first");
            return;
        }

        const numericAmount = linkData?.amount
            ? Number(linkData.amount)
            : Number(amount);

        if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
            toast.error("Please enter a valid MAS amount greater than 0");
            return;
        }

        setIsProcessing(true);
        try {
            const operationId = await payToLinkOnChain(provider, linkId, numericAmount);
            toast.success(
                `Payment of ${numericAmount} MAS sent successfully! Operation ID: ${operationId.slice(0, 8)}...`
            );
            // Clear amount if it was user-entered
            if (linkData?.amount === null) {
                setAmount("");
            }
        } catch (error) {
            console.error(error);
            toast.error(
                error instanceof Error ? error.message : "Failed to send payment"
            );
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="app-container">
                <div className="card">
                    <div className="empty-state">Loading payment link...</div>
                </div>
            </div>
        );
    }

    if (!linkData) {
        return (
            <div className="app-container">
                <div className="card">
                    <h3 className="card__title">Payment Link Not Found</h3>
                    <p className="card__subtitle">
                        The payment link you're looking for doesn't exist or has been removed.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
                <h3 className="card__title">Payment Request</h3>
                <div style={{ marginBottom: "2rem" }}>
                    <p className="card__subtitle" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
                        {linkData.description}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="kpi__label">Amount</span>
                        <span className="kpi__value" style={{ fontSize: "1.5rem" }}>
                            {linkData.amount
                                ? `${linkData.amount.toString()} MAS`
                                : "Any amount"}
                        </span>
                    </div>
                </div>

                {!address ? (
                    <div>
                        <p className="helper-text" style={{ marginBottom: "1rem" }}>
                            Connect your wallet to proceed with payment
                        </p>
                        <button
                            className="btn btn--primary"
                            onClick={connect}
                            disabled={isConnecting}
                            style={{ width: "100%" }}
                        >
                            {isConnecting ? "Connecting..." : "Connect Wallet"}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handlePayment}>
                        {linkData.amount === null && (
                            <div className="form-group" style={{ marginBottom: "1rem" }}>
                                <label>Amount (MAS)</label>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    required
                                />
                            </div>
                        )}
                        <button
                            className="btn btn--primary"
                            type="submit"
                            disabled={isProcessing}
                            style={{ width: "100%" }}
                        >
                            {isProcessing ? "Processing Payment..." : "Pay Now"}
                        </button>
                        <p className="helper-text" style={{ marginTop: "0.5rem", textAlign: "center" }}>
                            Connected: {address.slice(0, 8)}...{address.slice(-6)}
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}

