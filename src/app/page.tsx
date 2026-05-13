'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const NUM = ['trade_amount_sol', 'take_profit_percent', 'stop_loss_percent', 'slippage_bps', 'min_mcap', 'max_mcap', 'min_liquidity', 'max_daily_trades', 'daily_stop_loss_usd'];

export default function ConfigPage() {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API}/config`);
      if (!res.ok) throw new Error();
      setConfig(await res.json());
    } catch { showToast('Failed to load configuration', false); }
    finally { setLoading(false); }
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setConfig((p: any) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...config };
    NUM.forEach(f => { payload[f] = payload[f] !== '' && payload[f] !== null ? Number(payload[f]) : null; });
    try {
      const res = await fetch(`${API}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      showToast('Configuration saved!', true);
    } catch { showToast('Failed to save configuration', false); }
    finally { setSaving(false); }
  };

  if (loading) return <div className={styles.loadingScreen}><div className={styles.spinner} /><span>Loading config...</span></div>;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Bot Configuration</h1>
          <p className={styles.pageDesc}>Adjust trading rules and risk parameters</p>
        </div>
        <button form="config-form" type="submit" className={styles.saveBtn} disabled={saving}>
          {saving ? <span className={styles.spinner} /> : '💾'}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      <form id="config-form" onSubmit={handleSubmit} className={styles.formGrid}>
        {/* Trading Rules */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>📈</span>
            <div>
              <h2 className={styles.cardTitle}>Trading Rules</h2>
              <p className={styles.cardDesc}>Core trade execution parameters</p>
            </div>
          </div>
          <div className={styles.fields}>
            <Field label="Trade Amount (SOL)" name="trade_amount_sol" value={config.trade_amount_sol} step="0.0001" onChange={handleChange} required />
            <Field label="Take Profit (%)" name="take_profit_percent" value={config.take_profit_percent} step="0.1" onChange={handleChange} required />
            <Field label="Stop Loss (%)" name="stop_loss_percent" value={config.stop_loss_percent} step="0.1" onChange={handleChange} required />
            <Field label="Slippage (BPS)" name="slippage_bps" value={config.slippage_bps} step="1" onChange={handleChange} required />
          </div>
        </section>

        {/* Market Filters */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🔍</span>
            <div>
              <h2 className={styles.cardTitle}>Market Filters</h2>
              <p className={styles.cardDesc}>Token screening criteria</p>
            </div>
          </div>
          <div className={styles.fields}>
            <Field label="Min Market Cap ($)" name="min_mcap" value={config.min_mcap} step="1000" onChange={handleChange} />
            <Field label="Max Market Cap ($)" name="max_mcap" value={config.max_mcap} step="1000" onChange={handleChange} />
            <Field label="Min Liquidity ($)" name="min_liquidity" value={config.min_liquidity} step="100" onChange={handleChange} />
            <div className={styles.toggleRow}>
              <Toggle label="Require LP Burned" name="require_lp_burned" checked={!!config.require_lp_burned} onChange={handleChange} />
              <Toggle label="Require Socials" name="require_socials" checked={!!config.require_socials} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* Risk Management */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🛡️</span>
            <div>
              <h2 className={styles.cardTitle}>Risk Management</h2>
              <p className={styles.cardDesc}>Daily limits and loss protection</p>
            </div>
          </div>
          <div className={styles.fields}>
            <Field label="Max Daily Trades" name="max_daily_trades" value={config.max_daily_trades} step="1" onChange={handleChange} required />
            <Field label="Daily Stop Loss ($)" name="daily_stop_loss_usd" value={config.daily_stop_loss_usd} step="0.01" onChange={handleChange} required />
          </div>
        </section>
      </form>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </div>
  );
}

function Field({ label, name, value, step, onChange, required }: any) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        type="number"
        name={name}
        value={value ?? ''}
        step={step}
        onChange={onChange}
        required={required}
        className={styles.input}
        placeholder="—"
      />
    </div>
  );
}

function Toggle({ label, name, checked, onChange }: any) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className={styles.toggleInput} />
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb} />
      </span>
      <span className={styles.toggleLabel}>{label}</span>
    </label>
  );
}
