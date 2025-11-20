import { useWallet } from "../../context/WalletContext";

export function TopBar() {
    const { address, nativeBalance, connect, disconnect, isConnecting, error } =
        useWallet();

    const shortAddress = address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "Wallet disconnected";

    return (
        <header className="topbar">
            <div>
                <div className="pill">Payment Link Platform</div>
                <h2 style={{ margin: "0.4rem 0 0", fontSize: "1.5rem" }}>
                    {address ? "Welcome back" : "Connect your wallet to begin"}
                </h2>
                {error && <p className="error-text" style={{ margin: 0 }}>{error}</p>}
            </div>
            <div className="stack" style={{ alignItems: "flex-end" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={`status-dot ${address ? "" : "status-dot--warning"}`} />
                    <span style={{ fontWeight: 600 }}>{shortAddress}</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Native balance: {nativeBalance.toString()} nanoMAS
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {!address ? (
                        <button
                            className="btn btn--primary"
                            onClick={connect}
                            disabled={isConnecting}
                        >
                            {isConnecting ? "Connecting..." : "Connect Wallet"}
                        </button>
                    ) : (
                        <button className="btn btn--ghost" onClick={disconnect}>
                            Disconnect
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

