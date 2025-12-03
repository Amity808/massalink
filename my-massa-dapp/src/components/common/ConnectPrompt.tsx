import { useState } from "react";
import { useWallet } from "../../context/WalletContext";

export function ConnectPrompt() {
    const { connect, connectToWallet, isConnecting, error, availableWallets } = useWallet();
    const [showWalletSelection, setShowWalletSelection] = useState(false);

    const handleConnect = async () => {
        if (availableWallets.length > 1) {
            setShowWalletSelection(true);
        } else {
            await connect();
        }
    };

    const handleSelectWallet = async (wallet: any) => {
        setShowWalletSelection(false);
        await connectToWallet(wallet);
    };

    if (showWalletSelection && availableWallets.length > 1) {
        return (
            <div className="card" style={{ textAlign: "center" }}>
                <h2>Select Wallet</h2>
                <p className="card__subtitle">
                    Choose a wallet to connect:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
                    {availableWallets.map((wallet) => (
                        <button
                            key={wallet.name()}
                            className="btn btn--primary"
                            onClick={() => handleSelectWallet(wallet)}
                            disabled={isConnecting}
                            style={{ width: "100%" }}
                        >
                            {isConnecting ? "Connecting..." : `Connect ${wallet.name()}`}
                        </button>
                    ))}
                </div>
                <button
                    className="btn"
                    onClick={() => setShowWalletSelection(false)}
                    disabled={isConnecting}
                    style={{ marginTop: "1rem", background: "transparent" }}
                >
                    Cancel
                </button>
                {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}
            </div>
        );
    }

    return (
        <div className="card" style={{ textAlign: "center" }}>
            <h2>Connect Wallet</h2>
            <p className="card__subtitle">
                Link your wallet to manage payment links, receive MAS, and withdraw funds.
            </p>
            {availableWallets.length > 0 ? (
                <button className="btn btn--primary" onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
            ) : (
                <div>
                    <p style={{ marginBottom: "1rem", color: "#666" }}>
                        No wallets detected. Please install a Massa wallet extension:
                    </p>
                    <ul style={{ textAlign: "left", display: "inline-block", margin: "0 auto" }}>
                        <li>MassaStation</li>
                        <li>Bearby</li>
                        <li>MassaWallet</li>
                    </ul>
                </div>
            )}
            {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}
        </div>
    );
}

