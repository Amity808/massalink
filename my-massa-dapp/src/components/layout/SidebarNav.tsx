import { NavLink } from "react-router-dom";

const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Payment Links", path: "/links" },
    { label: "Receive MAS", path: "/receive" },
    { label: "Withdraw", path: "/withdraw" },
    { label: "Utilities", path: "/utilities" },
];

export function SidebarNav() {
    return (
        <nav className="sidebar__nav">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        ["sidebar__link", isActive ? "sidebar__link--active" : ""].join(" ")
                    }
                >
                    {item.label}
                </NavLink>
            ))}
        </nav>
    );
}

