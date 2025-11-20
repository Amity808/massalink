import { FormEvent, useState } from "react";
import { usePaymentData } from "../context/PaymentContext";
import { useWallet } from "../context/WalletContext";
import { ConnectPrompt } from "../components/common/ConnectPrompt";
import { useToast } from "../context/ToastContext";

export function PaymentLinksPage() {
    const { address } = useWallet();
    const { links, createLink, isProcessing } = usePaymentData();
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState<string>("");
    const [anyAmount, setAnyAmount] = useState(true);
    const toast = useToast();

    if (!address) {
        return <ConnectPrompt />;
    }

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const parsedAmount = anyAmount || !amount ? undefined : Number(amount);
        if (parsedAmount !== undefined && Number.isNaN(parsedAmount)) {
            toast.error("Amount must be a valid number");
            return;
        }
        try {
            const linkId = await createLink(description, parsedAmount);
            setDescription("");
            setAmount("");
            toast.success(`Payment link created! Link ID: ${linkId}`);
        } catch (error) {
            console.error(error);
            toast.error(
                error instanceof Error ? error.message : "Failed to create payment link",
            );
        }
    };

    const copyLink = async (id: string) => {
        const url = `${window.location.origin}/pay/${id}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success(`Copied payment URL: ${url}`);
        } catch (error) {
            toast.error("Failed to copy link to clipboard");
        }
    };

    return (
        <div className="grid" style={{ gap: "2rem" }}>
            <section className="card">
                <h3 className="card__title">Create new payment link</h3>
                <p className="card__subtitle">
                    Generate sharable links to receive MAS payments for specific items or open
                    donations.
                </p>
                <form className="form-grid" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            className="textarea"
                            placeholder="Describe the purpose of this link"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Amount (MAS)</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <input
                                className="input"
                                type="number"
                                min={0}
                                step="0.01"
                                disabled={anyAmount}
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                placeholder="10"
                                style={{
                                    opacity: anyAmount ? 0.6 : 1,
                                    cursor: anyAmount ? "not-allowed" : "text"
                                }}
                            />
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    cursor: "pointer",
                                    userSelect: "none"
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={anyAmount}
                                    onChange={(event) => {
                                        setAnyAmount(event.target.checked);
                                        if (event.target.checked) {
                                            setAmount("");
                                        }
                                    }}
                                    style={{ cursor: "pointer" }}
                                />
                                <span>Allow any amount</span>
                            </label>
                        </div>
                    </div>
                    <button className="btn btn--primary" type="submit" disabled={isProcessing}>
                        {isProcessing ? "Creating..." : "Create Link"}
                    </button>
                </form>
            </section>

            <section className="card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                        <h3 className="card__title">Your payment links</h3>
                        <p className="card__subtitle">Share these URLs with your customers.</p>
                    </div>
                </div>
                {links.length === 0 ? (
                    <div className="empty-state">No links yet. Create one above.</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Link ID</th>
                                <th>Description</th>
                                <th>Target</th>
                                <th>Payment URL</th>
                                <th>Total Received</th>
                                <th>Last Payment</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {links.map((link) => {
                                const paymentUrl = `${window.location.origin}/pay/${link.id}`;
                                return (
                                    <tr key={link.id}>
                                        <td>{link.id}</td>
                                        <td>{link.description}</td>
                                        <td>{link.amountType === "any" ? "Any" : link.targetAmount}</td>
                                        <td>
                                            <code style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
                                                {paymentUrl}
                                            </code>
                                        </td>
                                        <td>{link.totalReceived}</td>
                                        <td>
                                            {link.lastPaymentAt
                                                ? new Date(link.lastPaymentAt).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn--ghost"
                                                type="button"
                                                onClick={() => copyLink(link.id)}
                                            >
                                                Copy URL
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}

