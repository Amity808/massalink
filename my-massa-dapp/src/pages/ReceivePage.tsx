import { FormEvent, useState } from "react";
import { usePaymentData } from "../context/PaymentContext";
import { useWallet } from "../context/WalletContext";
import { ConnectPrompt } from "../components/common/ConnectPrompt";
import { useToast } from "../context/ToastContext";

type Mode = "name" | "link";

export function ReceivePage() {
    const { address } = useWallet();
    const { payToName, payToLink, isProcessing } = usePaymentData();
    const toast = useToast();
    const [mode, setMode] = useState<Mode>("name");
    const [identifier, setIdentifier] = useState("");
    const [amount, setAmount] = useState("");
    const [memo, setMemo] = useState("");

    if (!address) {
        return <ConnectPrompt />;
    }

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const numericAmount = Number(amount);
        if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
            toast.error("Please enter a valid MAS amount greater than 0");
            return;
        }
        try {
            let operationId: string;
            if (mode === "name") {
                if (!identifier.trim()) {
                    toast.error("Please enter a recipient name");
                    return;
                }
                operationId = await payToName(identifier.trim(), numericAmount, memo);
                toast.success(
                    `Payment of ${numericAmount} MAS sent to @${identifier}! Operation ID: ${operationId.slice(0, 8)}...`
                );
            } else {
                if (!identifier.trim()) {
                    toast.error("Please enter a link ID");
                    return;
                }
                operationId = await payToLink(identifier.trim(), numericAmount);
                toast.success(
                    `Payment of ${numericAmount} MAS sent via link ${identifier}! Operation ID: ${operationId.slice(0, 8)}...`
                );
            }
            // Clear form on success
            setAmount("");
            setIdentifier("");
            setMemo("");
        } catch (error) {
            console.error(error);
            toast.error(
                error instanceof Error ? error.message : "Failed to send payment"
            );
        }
    };

    return (
        <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                    <h3 className="card__title">Send Payments</h3>
                    <p className="card__subtitle">
                        Send MAS tokens to a registered name or payment link on-chain.
                    </p>
                </div>
                <div className="tabs">
                    <button
                        className={mode === "name" ? "active" : ""}
                        type="button"
                        onClick={() => setMode("name")}
                    >
                        Pay to Name
                    </button>
                    <button
                        className={mode === "link" ? "active" : ""}
                        type="button"
                        onClick={() => setMode("link")}
                    >
                        Pay to Link
                    </button>
                </div>
            </div>
            <form className="form-grid" onSubmit={onSubmit}>
                <div className="form-group">
                    <label>{mode === "name" ? "Recipient name" : "Link ID"}</label>
                    <input
                        className="input"
                        placeholder={mode === "name" ? "glowpay" : "a1b2c3d4"}
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Amount (MAS)</label>
                    <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        required
                    />
                </div>
                {mode === "name" && (
                    <div className="form-group">
                        <label>Memo (optional)</label>
                        <input
                            className="input"
                            placeholder="Describe this payment"
                            value={memo}
                            onChange={(event) => setMemo(event.target.value)}
                        />
                    </div>
                )}
                <button className="btn btn--primary" type="submit" disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Send Payment"}
                </button>
            </form>
        </div>
    );
}

