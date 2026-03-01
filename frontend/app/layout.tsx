import type { Metadata } from "next";
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
                </Providers>
            </body>
        </html>
    );
}
