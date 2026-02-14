"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
    const { data: session } = useSession();
    const roles = (session as any)?.roles as string[] | undefined;
    const isAdmin = roles?.includes("admin");

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <div className="navbar-logo">⚡</div>
                <span className="navbar-title">Measurement System</span>
            </div>
            <div className="navbar-links">
                <a href="/" className="navbar-link">Dashboard</a>
                <a href="/agents" className="navbar-link">Agents</a>
            </div>
            <div className="navbar-user">
                {session ? (
                    <>
                        <span className="navbar-username">
                            {session.user?.name || session.user?.email}
                            {isAdmin && <span className="badge badge-admin">admin</span>}
                        </span>
                        <button onClick={() => signOut()} className="btn btn-ghost btn-sm">
                            Sign Out
                        </button>
                    </>
                ) : (
                    <button onClick={() => signIn("keycloak")} className="btn btn-primary btn-sm">
                        Sign In
                    </button>
                )}
            </div>
        </nav>
    );
}
