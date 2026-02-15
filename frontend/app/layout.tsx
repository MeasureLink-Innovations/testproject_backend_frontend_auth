import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "Measurement System Dashboard",
    description: "Real-time monitoring and control of measurement agents",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <Providers>
                    <Navbar />
                    <main className="main-content">{children}</main>
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            style: {
                                background: "var(--bg-card)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-highlight)",
                                backdropFilter: "blur(12px)",
                            },
                            success: {
                                iconTheme: {
                                    primary: "var(--accent-green)",
                                    secondary: "var(--bg-card)",
                                },
                                style: {
                                    borderLeft: "4px solid var(--accent-green)",
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: "var(--accent-red)",
                                    secondary: "var(--bg-card)",
                                },
                                style: {
                                    borderLeft: "4px solid var(--accent-red)",
                                },
                            },
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}
