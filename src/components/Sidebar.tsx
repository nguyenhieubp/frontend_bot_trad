'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const nav = [
  { href: '/', icon: '⚙️', label: 'Bot Config' },
  { href: '/scanner', icon: '⚡', label: 'Scanner' },
  { href: '/wallet', icon: '💼', label: 'Wallets' },
];

export default function Sidebar() {
  const path = usePathname();
  const [status, setStatus] = useState<'running' | 'stopped'>('stopped');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API}/bot/status`);
        const data = await res.json();
        setStatus(data.status);
      } catch (e) {
        // ignore
      }
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 3000);
    return () => clearInterval(iv);
  }, []);

  const toggleBot = async () => {
    setLoading(true);
    try {
      const action = status === 'running' ? 'stop' : 'start';
      const res = await fetch(`${API}/bot/${action}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch (e) {
      alert('Failed to toggle bot status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={`${styles.brandOrb} ${status === 'running' ? styles.brandOrbRunning : ''}`} />
        <span className={styles.brandName}>SniperBot</span>
      </div>

      <nav className={styles.nav}>
        {nav.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.navItem} ${path === href ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>{icon}</span>
            <span className={styles.navLabel}>{label}</span>
            {path === href && <span className={styles.activeIndicator} />}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <button
          className={`${styles.toggleBtn} ${status === 'running' ? styles.btnStop : styles.btnStart}`}
          onClick={toggleBot}
          disabled={loading}
        >
          {loading ? '...' : status === 'running' ? '⏹ Stop Bot' : '▶ Start Bot'}
        </button>
        <div className={styles.statusRow}>
          <div className={`${styles.status} ${status === 'running' ? styles.statusRunning : styles.statusStopped}`}>
            <span className={styles.statusDot} />
            <span>{status === 'running' ? 'Running' : 'Stopped'}</span>
          </div>
          <span className={styles.version}>v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}

