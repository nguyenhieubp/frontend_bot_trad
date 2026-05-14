'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const NUM = ['trade_amount_sol', 'take_profit_percent', 'stop_loss_percent', 'slippage_bps', 'min_mcap', 'max_mcap', 'min_liquidity', 'max_daily_trades', 'daily_stop_loss_usd', 'max_top10_percent', 'volume_surge_threshold', 'slippage_surge_multiplier', 'trail_profit_trigger_percent', 'trail_stop_loss_percent', 'trail_drop_from_ath_percent'];

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
    } catch { showToast('Không thể tải cấu hình', false); }
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
      showToast('Đã lưu cấu hình!', true);
    } catch { showToast('Không thể lưu cấu hình', false); }
    finally { setSaving(false); }
  };

  if (loading) return <div className={styles.loadingScreen}><div className={styles.spinner} /><span>Đang tải cấu hình...</span></div>;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Cấu hình Bot</h1>
          <p className={styles.pageDesc}>Điều chỉnh quy tắc giao dịch và thông số rủi ro</p>
        </div>
        <button form="config-form" type="submit" className={styles.saveBtn} disabled={saving}>
          {saving ? <span className={styles.spinner} /> : '💾'}
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </header>

      <form id="config-form" onSubmit={handleSubmit} className={styles.formGrid}>
        {/* Trading Rules */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>📈</span>
            <div>
              <h2 className={styles.cardTitle}>Quy tắc Giao dịch</h2>
              <p className={styles.cardDesc}>Các thông số khớp lệnh cốt lõi</p>
            </div>
          </div>
          <div className={styles.fields}>
            <Field label="Số lượng vào lệnh (USDT)" name="trade_amount_usd" value={config.trade_amount_usd} step="1" onChange={handleChange} required />
            <Field label="Chốt lời (%)" name="take_profit_percent" value={config.take_profit_percent} step="0.1" onChange={handleChange} required />
            <Field label="Cắt lỗ (%)" name="stop_loss_percent" value={config.stop_loss_percent} step="0.1" onChange={handleChange} required />
            <Field label="Độ trượt giá (BPS)" name="slippage_bps" value={config.slippage_bps} step="1" onChange={handleChange} required />
          </div>
        </section>

        {/* Market Filters */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🔍</span>
            <div>
              <h2 className={styles.cardTitle}>Bộ lọc Thị trường</h2>
              <p className={styles.cardDesc}>Tiêu chuẩn lựa chọn Token</p>
            </div>
          </div>
          <div className={styles.fields}>
            <Field label="Vốn hóa tối thiểu ($)" name="min_mcap" value={config.min_mcap} step="1000" onChange={handleChange} />
            <Field label="Vốn hóa tối đa ($)" name="max_mcap" value={config.max_mcap} step="1000" onChange={handleChange} />
            <Field label="Thanh khoản tối thiểu ($)" name="min_liquidity" value={config.min_liquidity} step="100" onChange={handleChange} />
            <div className={styles.toggleRow}>
              <Toggle label="Bắt buộc khóa thanh khoản (LP Burned)" name="require_lp_burned" checked={!!config.require_lp_burned} onChange={handleChange} />
              <Toggle label="Bắt buộc có mạng xã hội" name="require_socials" checked={!!config.require_socials} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* Risk Management */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🛡️</span>
            <div>
              <h2 className={styles.cardTitle}>Quản lý Rủi ro</h2>
              <p className={styles.cardDesc}>Giới hạn lệnh và bảo vệ vốn mỗi ngày</p>
            </div>
          </div>
          <div className={styles.fields}>
            <Field label="Số lệnh tối đa/ngày" name="max_daily_trades" value={config.max_daily_trades} step="1" onChange={handleChange} required />
            <Field label="Giới hạn Cắt lỗ/ngày ($)" name="daily_stop_loss_usd" value={config.daily_stop_loss_usd} step="0.01" onChange={handleChange} required />
          </div>
        </section>
        {/* Dynamic & Security */}
        <section className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🛡️</span>
            <div>
              <h2 className={styles.cardTitle}>Bảo mật & Tối ưu Lợi nhuận</h2>
              <p className={styles.cardDesc}>Cơ chế bảo vệ nâng cao và khóa lãi tự động (Trailing)</p>
            </div>
          </div>
          <div className={styles.fields} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Field label="Top 10 ví giữ tối đa (%)" name="max_top10_percent" value={config.max_top10_percent} step="1" onChange={handleChange} />
            <Field label="Volume đột biến ($)" name="volume_surge_threshold" value={config.volume_surge_threshold} step="1000" onChange={handleChange} />
            <Field label="Hệ số Slippage khi đột biến" name="slippage_surge_multiplier" value={config.slippage_surge_multiplier} step="0.1" onChange={handleChange} />
            <Field label="Lãi kích hoạt Trailing (%)" name="trail_profit_trigger_percent" value={config.trail_profit_trigger_percent} step="1" onChange={handleChange} />
            <Field label="Khóa Cắt lỗ ở mức (%)" name="trail_stop_loss_percent" value={config.trail_stop_loss_percent} step="1" onChange={handleChange} />
            <Field label="Bán khi sụt từ đỉnh (%)" name="trail_drop_from_ath_percent" value={config.trail_drop_from_ath_percent} step="1" onChange={handleChange} />
          </div>
        </section>

        {/* System & Network */}
        <section className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>⚙️</span>
            <div>
              <h2 className={styles.cardTitle}>Hệ thống & Tối ưu Mạng</h2>
              <p className={styles.cardDesc}>Tinh chỉnh tốc độ quét, timeout và priority fee (Lamports)</p>
            </div>
          </div>
          <div className={styles.fields} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Field label="RPC Polling (ms)" name="rpc_polling_interval_ms" value={config.rpc_polling_interval_ms} step="100" onChange={handleChange} />
            <Field label="Scanner Polling (ms)" name="scanner_polling_interval_ms" value={config.scanner_polling_interval_ms} step="100" onChange={handleChange} />
            <Field label="API Timeout (ms)" name="api_timeout_ms" value={config.api_timeout_ms} step="100" onChange={handleChange} />
            <div className={styles.field}>
              <label className={styles.label}>Priority Fee (Lamports)</label>
              <input
                type="text"
                name="priority_fee"
                value={config.priority_fee || ''}
                placeholder='"auto" hoặc số (vd: 10000)'
                onChange={handleChange}
                className={styles.input}
              />
            </div>
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
