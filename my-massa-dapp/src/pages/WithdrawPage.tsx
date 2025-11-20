import { useState } from "react";
import { usePaymentData } from "../context/PaymentContext";
import { useWallet } from "../context/WalletContext";
import { ConnectPrompt } from "../components/common/ConnectPrompt";

export function WithdrawPage() {
    const { address } = useWallet();
    const { snapshot, withdrawFunds, isProcessing } = usePaymentData();
    const [message, setMessage] = useState<string>();

    if (!address) {
        return <ConnectPrompt />;
    }

    const handleWithdraw = async () => {
        try {
            const amount = await withdrawFunds();
            if (amount) {
                setMessage(`Withdrew ${amount} MAS to your MassaWallet`);
            }
        } catch (error) {
            console.error(error);
            setMessage("Unable to withdraw at the moment");
        }
    };

    return (
        <div className="split">
            <section className="card">
                <h3 className="card__title">Contract balance</h3>
                <p className="card__subtitle">
                    These funds are held by the Payment Link contract. Withdraw to your wallet
                    at any time.
                </p>
                <div className="kpi__value" style={{ fontSize: "2.5rem" }}>
                    {snapshot?.contractBalance ?? 0} MAS
                </div>
                <button
                    className="btn btn--primary"
                    style={{ marginTop: "1rem" }}
                    onClick={handleWithdraw}
                    disabled={isProcessing || (snapshot?.contractBalance ?? 0) <= 0}
                >
                    {isProcessing ? "Processing..." : "Withdraw to wallet"}
                </button>
                {message && <p className="helper-text" style={{ marginTop: "1rem" }}>{message}</p>}
            </section>
            <section className="card">
                <h3 className="card__title">Withdrawal guidance</h3>
                <ul style={{ paddingLeft: "1.25rem", color: "var(--text-muted)" }}>
                    <li>Withdrawals move MAS from the contract into your connected wallet.</li>
                    <li>Keep some balance on the contract to cover future refunds if needed.</li>
                    <li>Review the activity feed for a full audit trail of withdrawals.</li>
                </ul>
            </section>
        </div>
    );
}

