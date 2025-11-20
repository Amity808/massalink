import { useWallet } from "../../context/WalletContext";

export function ConnectPrompt() {
    const { connect, isConnecting, error } = useWallet();
    return (
        <div className="card" style={{ textAlign: "center" }}>
            <h2>Connect MassaWallet</h2>
            <p className="card__subtitle">
                Link your wallet to manage payment links, receive MAS, and withdraw funds.
            </p>
            <button className="btn btn--primary" onClick={connect} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
            {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}
        </div>
    );
}

