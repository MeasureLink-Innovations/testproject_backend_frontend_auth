"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
    const { data: session } = useSession();
    const roles = (session as unknown as { roles?: string[] })?.roles;
    const isAdmin = roles?.includes("admin");

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <div className="navbar-logo">⚡</div>
                <span className="navbar-title">Measurement System</span>
            </div>
            <div className="navbar-links">
                <Link href="/" className="navbar-link">
                    Dashboard
                </Link>
                <Link href="/agents" className="navbar-link">
                    Agents
                </Link>
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
                    <button
                        onClick={() => signIn("keycloak")}
                        className="btn btn-primary btn-sm"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </nav>
    );
}
