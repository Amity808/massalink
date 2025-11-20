import { Outlet } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";

export function AppLayout() {
    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sidebar__brand">Paystream</div>
                <div className="sidebar__section">
                    <div className="sidebar__label">Navigation</div>
                    <SidebarNav />
                </div>
                <div className="sidebar__section" style={{ marginTop: "auto" }}>
                    <div className="sidebar__label">Need help?</div>
                    <p className="helper-text" style={{ margin: 0 }}>
                        Reach out to the Massa community or review the docs to deploy your own
                        payment experience.
                    </p>
                </div>
            </aside>
            <div className="content-area">
                <TopBar />
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

