'use client';

import { useState, useEffect } from 'react';
import styles from './wallet.module.css';
import pageStyles from '../page.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Wallet { id: string; label: string; public_key: string; is_active: boolean; created_at: string; }

export default function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await fetch(`${API}/wallets`);
      setWallets(await res.json());
    } catch { showToast('Failed to load wallets', false); }
    finally { setLoading(false); }
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`${API}/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, privateKey }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add wallet');
      }
      setLabel(''); setPrivateKey(''); setShowForm(false);
      showToast('Wallet added successfully!', true);
      load();
    } catch (err: any) { showToast(err.message, false); }
    finally { setAdding(false); }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`${API}/wallets/${id}/activate`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      showToast('Wallet activated!', true);
      load();
    } catch { showToast('Failed to activate wallet', false); }
  };

  const handleDelete = async (id: string, isActive: boolean) => {
    if (isActive) return showToast('Cannot delete the active wallet', false);
    if (!confirm('Delete this wallet?')) return;
    try {
      await fetch(`${API}/wallets/${id}`, { method: 'DELETE' });
      showToast('Wallet deleted', true);
      load();
    } catch { showToast('Failed to delete wallet', false); }
  };

  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.pageTitle}>Wallet Manager</h1>
          <p className={pageStyles.pageDesc}>Manage trading wallets — private keys are encrypted (AES-256)</p>
        </div>
        <button className={pageStyles.saveBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Wallet'}
        </button>
      </header>

      {/* Add Wallet Form */}
      {showForm && (
        <div className={`${pageStyles.card} ${styles.addForm}`}>
          <div className={pageStyles.cardHeader}>
            <span className={pageStyles.cardIcon}>🔐</span>
            <div>
              <h2 className={pageStyles.cardTitle}>Add New Wallet</h2>
              <p className={pageStyles.cardDesc}>Private key is encrypted before storage</p>
            </div>
          </div>
          <form onSubmit={handleAdd} className={styles.formBody}>
            <div className={pageStyles.field}>
              <label className={pageStyles.label}>Wallet Label</label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)} required placeholder='e.g. "Main Wallet"' className={pageStyles.input} />
            </div>
            <div className={pageStyles.field}>
              <label className={pageStyles.label}>Private Key (Base58)</label>
              <div className={styles.pkInput}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={e => setPrivateKey(e.target.value)}
                  required
                  placeholder="Your Solana private key..."
                  className={pageStyles.input}
                  style={{ paddingRight: '48px' }}
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowKey(!showKey)}>
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className={styles.securityNote}>
              🔒 Key is encrypted with AES-256 and stored only in your local database.
            </div>
            <button type="submit" className={`${pageStyles.saveBtn} ${styles.submitBtn}`} disabled={adding}>
              {adding ? <span className={pageStyles.spinner} /> : '💾'}
              {adding ? 'Adding...' : 'Save Wallet'}
            </button>
          </form>
        </div>
      )}

      {/* Wallets List */}
      {loading ? (
        <div className={pageStyles.loadingScreen} style={{ height: '200px' }}>
          <div className={pageStyles.spinner} /> Loading wallets...
        </div>
      ) : wallets.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💼</div>
          <p>No wallets added yet</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Add a wallet to start trading</p>
        </div>
      ) : (
        <div className={styles.walletList}>
          {wallets.map(w => (
            <div key={w.id} className={`${pageStyles.card} ${styles.walletCard} ${w.is_active ? styles.activeCard : ''}`}>
              <div className={styles.walletLeft}>
                <div className={styles.walletAvatar}>{w.label.charAt(0).toUpperCase()}</div>
                <div>
                  <div className={styles.walletLabel}>
                    {w.label}
                    {w.is_active && <span className={styles.activePill}>Active</span>}
                  </div>
                  <div className={styles.walletPk}>
                    {w.public_key.slice(0, 12)}...{w.public_key.slice(-8)}
                    <button className={styles.copyBtn} title="Copy address" onClick={() => { navigator.clipboard.writeText(w.public_key); showToast('Address copied!', true); }}>⎘</button>
                  </div>
                </div>
              </div>
              <div className={styles.walletActions}>
                {!w.is_active && (
                  <button className={styles.activateBtn} onClick={() => handleActivate(w.id)}>
                    ✓ Activate
                  </button>
                )}
                <button className={styles.deleteBtn} onClick={() => handleDelete(w.id, w.is_active)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className={`${pageStyles.toast} ${toast.ok ? pageStyles.toastOk : pageStyles.toastErr}`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </div>
  );
}
