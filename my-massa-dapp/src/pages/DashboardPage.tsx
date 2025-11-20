import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { usePaymentData } from "../context/PaymentContext";
import { ConnectPrompt } from "../components/common/ConnectPrompt";
import { useToast } from "../context/ToastContext";

export function DashboardPage() {
    const { address } = useWallet();
    const navigate = useNavigate();
    const {
        snapshot,
        events,
        links,
        isLoading,
        registerUserName,
        checkNameAvailability,
        isRegistering,
    } = usePaymentData();
    const [desiredName, setDesiredName] = useState("");
    const [availability, setAvailability] = useState<null | boolean>(null);
    const [checking, setChecking] = useState(false);
    const toast = useToast();
    const [registrationError, setRegistrationError] = useState<string | null>(null);

    useEffect(() => {
        if (!desiredName) {
            setAvailability(null);
            return;
        }
        setChecking(true);
        const handle = setTimeout(async () => {
            try {
                const result = await checkNameAvailability(desiredName);
                setAvailability(result);
            } catch (error) {
                console.error(error);
                setAvailability(null);
            } finally {
                setChecking(false);
            }
        }, 350);
        return () => clearTimeout(handle);
    }, [desiredName, checkNameAvailability]);

    const kpis = useMemo(
        () => [
            {
                label: "Total Received (MAS)",
                value: snapshot?.totalReceived?.toLocaleString() ?? "0",
            },
            { label: "Payment Links", value: snapshot?.totalLinks ?? 0 },
            {
                label: "Contract Balance (MAS)",
                value: snapshot?.contractBalance ?? 0,
            },
            {
                label: "Last Payment",
                value: snapshot?.lastPaymentAt
                    ? new Date(snapshot.lastPaymentAt).toLocaleString()
                    : "No payments yet",
            },
        ],
        [snapshot],
    );

    if (!address) {
        return <ConnectPrompt />;
    }

    const handleRegister = async () => {
        setRegistrationError(null);
        try {
            await registerUserName(desiredName);
            setDesiredName("");
            toast.success(`Registered ${desiredName}`);
        } catch (error) {
            console.error(error);
            setRegistrationError(
                error instanceof Error ? error.message : "Unable to register name",
            );
            toast.error(
                error instanceof Error ? error.message : "Unable to register name",
            );
        }
    };

    return (
        <div className="grid" style={{ gap: "2rem" }}>
            {!snapshot?.registeredName ? (
                <section className="card">
                    <h3 className="card__title">Register your payment name</h3>
                    <p className="card__subtitle">
                        Claim a human-readable identifier so customers can pay you more easily.
                        <br />
                        <span className="helper-text" style={{ display: "block", marginTop: "0.5rem" }}>
                            Note: Each wallet address needs its own registration. If you registered with a different address, you'll need to register a new name for this wallet.
                        </span>
                    </p>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="desiredName">Preferred name</label>
                            <input
                                id="desiredName"
                                className="input"
                                placeholder="e.g. glowpay"
                                value={desiredName}
                                onChange={(event) => setDesiredName(event.target.value)}
                            />
                            {desiredName && (
                                <span className={availability ? "helper-text" : "error-text"}>
                                    {checking
                                        ? "Checking availability..."
                                        : availability === null
                                            ? "Unable to verify this name"
                                            : availability
                                                ? "Name is available"
                                                : "Name is already taken"}
                                </span>
                            )}
                        </div>
                        <button
                            className="btn btn--primary"
                            disabled={!availability || isRegistering}
                            onClick={handleRegister}
                        >
                            {isRegistering ? "Registering..." : "Register Name"}
                        </button>
                        {registrationError && (
                            <span className="error-text">{registrationError}</span>
                        )}
                    </div>
                </section>
            ) : (
                <section className="card">
                    <h3 className="card__title">Your payment identity</h3>
                    <p className="card__subtitle">
                        Customers can send MAS directly using your registered name.
                    </p>
                    <div className="split" style={{ gap: "1rem" }}>
                        <div>
                            <span className="kpi__label">Registered name</span>
                            <div className="kpi__value" style={{ fontSize: "2rem" }}>
                                @{snapshot.registeredName}
                            </div>
                        </div>
                        <div>
                            <span className="kpi__label">Wallet address</span>
                            <div style={{ fontWeight: 600 }}>{snapshot.address}</div>
                        </div>
                    </div>
                    <p className="helper-text" style={{ marginTop: "1rem" }}>
                        Need to change your name? Deploy a new contract instance or add alias support
                        in the smart contract.
                    </p>
                </section>
            )}

            <section className="grid grid--four">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="card kpi">
                        <span className="kpi__label">{kpi.label}</span>
                        <span className="kpi__value">{kpi.value}</span>
                    </div>
                ))}
            </section>

            <section className="split">
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                            <h3 className="card__title">Recent Payment Links</h3>
                            <p className="card__subtitle">
                                Overview of the latest links you have generated.
                            </p>
                        </div>
                        <button className="btn btn--secondary" onClick={() => navigate("/links")}>
                            Manage Links
                        </button>
                    </div>
                    {links.length === 0 ? (
                        <div className="empty-state">No links yet. Create your first one!</div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Description</th>
                                    <th>Target</th>
                                    <th>Total Received</th>
                                </tr>
                            </thead>
                            <tbody>
                                {links.slice(0, 5).map((link) => (
                                    <tr key={link.id}>
                                        <td>{link.id}</td>
                                        <td>{link.description}</td>
                                        <td>{link.targetAmount ?? "Any"}</td>
                                        <td>{link.totalReceived}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                            <h3 className="card__title">Activity Feed</h3>
                            <p className="card__subtitle">
                                Track registrations, payments, and withdrawals in real time.
                            </p>
                        </div>
                        <button className="btn btn--ghost" onClick={() => navigate("/utilities")}>
                            View Utilities
                        </button>
                    </div>
                    {isLoading ? (
                        <div className="empty-state">Loading activity...</div>
                    ) : events.length === 0 ? (
                        <div className="empty-state">No activity recorded yet.</div>
                    ) : (
                        <div className="event-list">
                            {events.slice(0, 6).map((event) => (
                                <div key={event.id} className="event-item">
                                    <div className="event-item__meta">
                                        <span className="event-item__type">{event.type}</span>
                                        <span>{event.message}</span>
                                        <span className="helper-text">
                                            {new Date(event.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    {event.amount !== undefined && (
                                        <span className="badge badge--success">
                                            +{event.amount} MAS
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

