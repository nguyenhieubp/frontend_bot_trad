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
  const [phantomWallet, setPhantomWallet] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const connectPhantom = async () => {
    try {
      const provider = (window as any)?.solana;
      if (provider?.isPhantom) {
        const resp = await provider.connect();
        setPhantomWallet(resp.publicKey.toString());
        showToast('Đã kết nối Phantom Wallet!', true);
      } else {
        window.open('https://phantom.app/', '_blank');
      }
    } catch (err) {
      showToast('Từ chối kết nối Phantom', false);
    }
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await fetch(`${API}/wallets`);
      setWallets(await res.json());
    } catch { showToast('Không thể tải danh sách ví', false); }
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
        throw new Error(err.message || 'Không thể thêm ví');
      }
      setLabel(''); setPrivateKey(''); setShowForm(false);
      showToast('Đã thêm ví thành công!', true);
      load();
    } catch (err: any) { showToast(err.message, false); }
    finally { setAdding(false); }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`${API}/wallets/${id}/activate`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      showToast('Đã kích hoạt ví!', true);
      load();
    } catch { showToast('Không thể kích hoạt ví', false); }
  };

  const handleDelete = async (id: string, isActive: boolean) => {
    if (isActive) return showToast('Không thể xóa ví đang kích hoạt', false);
    if (!confirm('Bạn có chắc muốn xóa ví này?')) return;
    try {
      await fetch(`${API}/wallets/${id}`, { method: 'DELETE' });
      showToast('Đã xóa ví', true);
      load();
    } catch { showToast('Không thể xóa ví', false); }
  };

  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.pageTitle}>Quản lý Ví</h1>
          <p className={pageStyles.pageDesc}>Quản lý các ví giao dịch — Private key được mã hóa AES-256 an toàn</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={connectPhantom}
            style={{ background: '#AB9FF2', color: '#000', border: 'none', padding: '0 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
          >
            {phantomWallet ? `${phantomWallet.slice(0, 4)}...${phantomWallet.slice(-4)}` : '👻 Kết nối Phantom'}
          </button>
          <button className={pageStyles.saveBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Hủy' : '+ Thêm Ví Base58'}
          </button>
        </div>
      </header>

      {/* Add Wallet Form */}
      {showForm && (
        <div className={`${pageStyles.card} ${styles.addForm}`}>
          <div className={pageStyles.cardHeader}>
            <span className={pageStyles.cardIcon}>🔐</span>
            <div>
              <h2 className={pageStyles.cardTitle}>Thêm Ví Mới</h2>
              <p className={pageStyles.cardDesc}>Private key sẽ được mã hóa trước khi lưu trữ</p>
            </div>
          </div>
          <form onSubmit={handleAdd} className={styles.formBody}>
            <div className={pageStyles.field}>
              <label className={pageStyles.label}>Tên gợi nhớ</label>
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
                  placeholder="Nhập Private key Solana của bạn..."
                  className={pageStyles.input}
                  style={{ paddingRight: '48px' }}
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowKey(!showKey)}>
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className={styles.securityNote}>
              🔒 Khóa của bạn được mã hóa AES-256 và chỉ lưu trên database cục bộ của bạn.
            </div>
            <button type="submit" className={`${pageStyles.saveBtn} ${styles.submitBtn}`} disabled={adding}>
              {adding ? <span className={pageStyles.spinner} /> : '💾'}
              {adding ? 'Đang thêm...' : 'Lưu Ví'}
            </button>
          </form>
        </div>
      )}

      {/* Wallets List */}
      {loading ? (
        <div className={pageStyles.loadingScreen} style={{ height: '200px' }}>
          <div className={pageStyles.spinner} /> Đang tải danh sách ví...
        </div>
      ) : wallets.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💼</div>
          <p>Chưa có ví nào</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Thêm một ví để bắt đầu giao dịch</p>
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
                    {w.is_active && <span className={styles.activePill}>Đang dùng</span>}
                  </div>
                  <div className={styles.walletPk}>
                    {w.public_key.slice(0, 12)}...{w.public_key.slice(-8)}
                    <button className={styles.copyBtn} title="Sao chép địa chỉ" onClick={() => { navigator.clipboard.writeText(w.public_key); showToast('Đã sao chép địa chỉ!', true); }}>⎘</button>
                  </div>
                </div>
              </div>
              <div className={styles.walletActions}>
                {!w.is_active && (
                  <button className={styles.activateBtn} onClick={() => handleActivate(w.id)}>
                    ✓ Chọn dùng
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
