import { FormEvent, useState } from "react";
import { usePaymentData } from "../context/PaymentContext";
import { useWallet } from "../context/WalletContext";
import { ConnectPrompt } from "../components/common/ConnectPrompt";

export function UtilitiesPage() {
    const { address } = useWallet();
    const { lookupAddress, checkNameAvailability, inspectLink } = usePaymentData();
    const [lookupName, setLookupName] = useState("");
    const [lookupResult, setLookupResult] = useState<string>();
    const [availabilityName, setAvailabilityName] = useState("");
    const [availabilityResult, setAvailabilityResult] = useState<string>();
    const [linkId, setLinkId] = useState("");
    const [rawResult, setRawResult] = useState<string>();

    if (!address) {
        return <ConnectPrompt />;
    }

    const handleLookup = async (event: FormEvent) => {
        event.preventDefault();
        const result = await lookupAddress(lookupName);
        setLookupResult(result ?? "Name not registered");
    };

    const handleAvailability = async (event: FormEvent) => {
        event.preventDefault();
        const result = await checkNameAvailability(availabilityName);
        setAvailabilityResult(result ? "Available" : "Taken");
    };

    const handleLinkInspect = async (event: FormEvent) => {
        event.preventDefault();
        const result = await inspectLink(linkId);
        setRawResult(result?.raw ?? "Link not found");
    };

    return (
        <div className="grid grid--two">
            <section className="card">
                <h3 className="card__title">Address lookup</h3>
                <p className="card__subtitle">Resolve a registered name to its address.</p>
                <form className="form-grid" onSubmit={handleLookup}>
                    <input
                        className="input"
                        placeholder="name"
                        value={lookupName}
                        onChange={(event) => setLookupName(event.target.value)}
                    />
                    <button className="btn btn--primary" type="submit">
                        Lookup
                    </button>
                    {lookupResult && <p className="helper-text">{lookupResult}</p>}
                </form>
            </section>
            <section className="card">
                <h3 className="card__title">Check availability</h3>
                <p className="card__subtitle">Confirm that a desired name is free.</p>
                <form className="form-grid" onSubmit={handleAvailability}>
                    <input
                        className="input"
                        placeholder="desired name"
                        value={availabilityName}
                        onChange={(event) => setAvailabilityName(event.target.value)}
                    />
                    <button className="btn btn--secondary" type="submit">
                        Check name
                    </button>
                    {availabilityResult && <p className="helper-text">{availabilityResult}</p>}
                </form>
            </section>
            <section className="card">
                <h3 className="card__title">Raw storage inspector</h3>
                <p className="card__subtitle">
                    View the raw payload stored for a payment link ID.
                </p>
                <form className="form-grid" onSubmit={handleLinkInspect}>
                    <input
                        className="input"
                        placeholder="link id"
                        value={linkId}
                        onChange={(event) => setLinkId(event.target.value)}
                    />
                    <button className="btn btn--ghost" type="submit">
                        Inspect
                    </button>
                    {rawResult && (
                        <code style={{ background: "#f4f5f7", padding: "0.75rem", borderRadius: "0.5rem" }}>
                            {rawResult}
                        </code>
                    )}
                </form>
            </section>
        </div>
    );
}

