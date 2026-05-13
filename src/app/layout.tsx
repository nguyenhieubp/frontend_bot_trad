import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Sniper Bot",
  description: "Autonomous Solana Sniper Bot Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{
            flex: 1,
            marginLeft: 'var(--sidebar-w)',
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at 20% 50%, rgba(102,252,241,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(34,211,165,0.03) 0%, transparent 50%), var(--bg)',
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
