'use client';

import { useState, useEffect } from 'react';
import styles from './terminal.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const fmt = (n: number) => !n ? '$0' : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
const ago = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`; };

export default function TerminalPage() {
  const [feed, setFeed] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('1.0');
  const [activeToken, setActiveToken] = useState<any>(null);
  const [phantomWallet, setPhantomWallet] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL');
  const [isTradingEnabled, setIsTradingEnabled] = useState(false);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [isPaperTrading, setIsPaperTrading] = useState(true);
  const [stats, setStats] = useState({ virtualBalance: 1000, totalTrades: 0, winRate: 0, totalPnL: 0 });
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [config, setConfig] = useState<any>({});

  const connectPhantom = async () => {
    try {
      const provider = (window as any)?.solana;
      if (provider?.isPhantom) {
        const resp = await provider.connect();
        setPhantomWallet(resp.publicKey.toString());
      } else {
        window.open('https://phantom.app/', '_blank');
      }
    } catch (err) {
      console.error('User rejected or error:', err);
    }
  };

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const [fr, pr, sr, str] = await Promise.all([
          fetch(`${API}/scanner/feed`),
          fetch(`${API}/trades/open`),
          fetch(`${API}/monitor/sol-price`),
          fetch(`${API}/monitor/stats/summary`)
        ]);
        if (!fr.ok) throw new Error();
        const f = await fr.json();
        const p = pr.ok ? await pr.json() : [];
        const s = sr.ok ? await sr.json() : { price: 0 };
        const st = str.ok ? await str.json() : null;

        if (active) {
          setFeed(f || []);
          setPositions(p || []);
          setSolPrice(s.price);
          if (st) {
            setStats(st);
            setIsPaperTrading(st.isPaperTrading);
          }
          setConnected(true);
          if (!activeToken && f?.length > 0) setActiveToken(f[0]);
        }
      } catch { if (active) setConnected(false); }
    };
    poll();
    const iv = setInterval(poll, 2500);

    fetch(`${API}/scanner/exchanges`).then(res => res.json()).then(setExchanges).catch(() => { });
    fetch(`${API}/config`).then(res => res.json()).then(data => {
      setIsTradingEnabled(data.is_trading_enabled);
      setConfig(data);
    }).catch(() => { });

    return () => { active = false; clearInterval(iv); };
  }, []);

  const toggleTrading = async () => {
    try {
      const res = await fetch(`${API}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_trading_enabled: !isTradingEnabled })
      });
      if (res.ok) {
        const data = await res.json();
        setIsTradingEnabled(data.is_trading_enabled);
      }
    } catch (err) {
      console.error('Failed to toggle trading:', err);
    }
  };

  const togglePaperTrading = async () => {
    try {
      const res = await fetch(`${API}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paper_trading: !isPaperTrading })
      });
      if (res.ok) {
        const data = await res.json();
        setIsPaperTrading(data.is_paper_trading);
      }
    } catch (err) {
      console.error('Failed to toggle paper trading:', err);
    }
  };

  const updateConfig = async (updates: any) => {
    try {
      const res = await fetch(`${API}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setIsTradingEnabled(data.is_trading_enabled);
        setIsPaperTrading(data.is_paper_trading);
      }
    } catch (err) { console.error('Update config failed:', err); }
  };

  const resetSimulation = async () => {
    if (!confirm('Bạn có chắc muốn xóa hết dữ liệu đánh thử và reset số dư về $1000?')) return;
    try {
      await fetch(`${API}/monitor/stats/reset`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  };

  const snipeToken = async (t: any) => {
    try {
      const res = await fetch(`${API}/trading/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAddress: t.mintAddress,
          pairAddress: t.pairAddress,
          currentPriceUsd: t.priceUsd,
          slippageBps: 1000
        })
      });
      if (res.ok) alert(`Đã phát lệnh mua ${t.symbol}!`);
    } catch (err) { alert('Lỗi khi mua nhanh'); }
  };

  const filteredFeed = selectedExchange === 'ALL'
    ? feed
    : feed.filter(t => t.symbol?.startsWith(selectedExchange.slice(0, 4).toUpperCase()));

  return (
    <div className={`${styles.page} ${isPaperTrading ? '' : styles.pageLive}`}>
      {/* Header */}
      <header className={`${styles.header} ${isPaperTrading ? '' : styles.headerLive}`}>
        <div className={styles.brand}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: connected ? '#00ff66' : '#ff3366', boxShadow: connected ? '0 0 10px #00ff66' : '0 0 10px #ff3366' }} />
          <h1 className={styles.brandTitle}>PUMP-SNIPER TERMINAL</h1>
          <div className={`${styles.modeBadge} ${isPaperTrading ? styles.modeBadgeTest : styles.modeBadgeLive}`}>
            {isPaperTrading ? 'DANG TEST (GIA LAP)' : 'DANG CHAY THAT (LIVE)'}
          </div>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Giá Solana</span>
            <span className={styles.statValue}>${solPrice > 0 ? solPrice.toFixed(2) : '---'}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Độ trễ Mạng</span>
            <span className={`${styles.statValue} ${styles.statValueGreen}`}>12ms</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Ví đang kết nối</span>
            {phantomWallet ? (
              <span className={styles.statValue}>{phantomWallet.slice(0, 4)}...{phantomWallet.slice(-4)}</span>
            ) : (
              <button
                onClick={connectPhantom}
                style={{ background: '#AB9FF2', color: '#000', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                Kết nối Phantom
              </button>
            )}
          </div>
          <div className={styles.stat}>
            <button
              onClick={toggleTrading}
              className={`${styles.tradingBtn} ${isTradingEnabled ? styles.tradingBtnActive : ''}`}
            >
              {isTradingEnabled ? '⏹ DỪNG BOT' : '▶ BẬT BOT'}
            </button>
          </div>
          <div className={styles.stat}>
            <button
              onClick={togglePaperTrading}
              className={`${styles.testModeBtn} ${isPaperTrading ? styles.testModeBtnActive : ''}`}
            >
              {isPaperTrading ? '🧪 TEST ON' : '💵 LIVE ON'}
            </button>
          </div>
          <div className={styles.stat}>
            <button
              onClick={() => setIsRulesOpen(true)}
              className={styles.rulesBtn}
            >
              🛡️ RULES
            </button>
          </div>
        </div>
      </header>

      {/* Stats Summary Bar */}
      <div className={styles.statsSummaryBar}>
        <div className={styles.statsSummaryItem}>
          <span className={styles.statsSummaryLabel}>Số dư ảo:</span>
          <span className={styles.statsSummaryValue}>${stats.virtualBalance.toFixed(2)}</span>
        </div>
        <div className={styles.statsSummaryItem}>
          <span className={styles.statsSummaryLabel}>Tổng PnL:</span>
          <span className={`${styles.statsSummaryValue} ${stats.totalPnL >= 0 ? styles.plus : styles.minus}`}>
            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
          </span>
        </div>
        <div className={styles.statsSummaryItem}>
          <span className={styles.statsSummaryLabel}>Win Rate:</span>
          <span className={styles.statsSummaryValue}>{stats.winRate}%</span>
        </div>
        <div className={styles.statsSummaryItem}>
          <span className={styles.statsSummaryLabel}>Tổng lệnh:</span>
          <span className={styles.statsSummaryValue}>{stats.totalTrades}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className={styles.resetBtn} onClick={resetSimulation}>RESET TEST</button>
      </div>

      {/* Left Feed Panel */}
      <div className={`${styles.panel} ${styles.feed}`}>
        <div className={styles.panelHeader} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <h2 className={styles.panelTitle}>⚡ DexScreener Live</h2>
          <span style={{ fontSize: '0.7rem', color: '#00ff66', background: 'rgba(0,255,102,0.1)', padding: '2px 8px', borderRadius: '10px' }}>POLLING ACTIVE</span>
        </div>
        <div className={styles.panelContent} style={{ padding: 0 }}>
          {filteredFeed.length === 0 ? (
            <div style={{ padding: 20, color: '#555', textAlign: 'center' }}>Không có token nào...</div>
          ) : filteredFeed.map((t, i) => (
            <div
              key={i}
              className={`${styles.feedItem} ${t.status === 'fail' ? styles.feedItemFail : ''}`}
              onClick={() => setActiveToken(t)}
            >
              <div className={styles.feedItemMain} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(t.imageUrl || t.image_url) ? (
                  <img src={t.imageUrl || t.image_url} alt={t.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#333' }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span className={styles.feedSymbol} style={{ lineHeight: 1, color: t.status === 'fail' ? '#888' : '#00ff66' }}>{t.symbol || 'UNKNOWN'}</span>
                  <span style={{ fontSize: '0.7rem', color: '#555' }}>{t.name || 'Token'}</span>
                </div>
                <span className={styles.feedTime}>{ago(t.created_at || t.scannedAt)}</span>
              </div>
              <div className={styles.feedMeta} style={{ opacity: t.status === 'fail' ? 0.5 : 1 }}>
                <span>Giá: ${parseFloat(t.priceUsd || t.price_usd || 0).toFixed(6)}</span>
                <span>MC: {fmt(t.market_cap || t.mcap)}</span>
                <span>Liq: {fmt(t.liquidity_usd || t.liquidity)}</span>
              </div>
              {t.status === 'fail' ? (
                <div style={{ fontSize: '0.7rem', color: '#ff3366', marginTop: '4px' }}>Bỏ qua: {t.failReason}</div>
              ) : (
                <button
                  className={styles.feedSnipeBtn}
                  onClick={(e) => { e.stopPropagation(); snipeToken(t); }}
                >
                  Mua Nhanh
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center Chart Panel */}
      <div className={`${styles.panel} ${styles.chart}`}>
        {activeToken ? (
          <>
            <div className={styles.chartTokenInfo}>
              <div className={styles.tokenSymbolBig} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(activeToken.imageUrl || activeToken.image_url) && (
                  <img src={activeToken.imageUrl || activeToken.image_url} alt={activeToken.symbol} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                )}
                {activeToken.symbol}
              </div>
              <div className={styles.tokenAddress}>
                {activeToken.name} | {activeToken.mint_address}
              </div>
              <div style={{ flex: 1 }} />
              <div className={styles.stat}>
                <span className={styles.statLabel}>Giá (USD)</span>
                <span className={styles.statValue} style={{ color: '#00ff66' }}>${parseFloat(activeToken.priceUsd || activeToken.price_usd || 0).toFixed(6)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Vốn Hóa</span>
                <span className={styles.statValue}>{fmt(activeToken.market_cap)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Thanh Khoản</span>
                <span className={styles.statValue}>{fmt(activeToken.liquidity_usd)}</span>
              </div>
            </div>
            <div className={styles.chartPlaceholder}>
              <span style={{ fontSize: '3rem' }}>📈</span>
              <p>Đang tải biểu đồ TradingView...</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Cần tích hợp Datafeed</p>
            </div>
          </>
        ) : (
          <div className={styles.chartPlaceholder}>Chọn một token để xem biểu đồ</div>
        )}
      </div>

      {/* Right Console Panel */}
      <div className={`${styles.panel} ${styles.console}`}>
        <div className={styles.tradeTabs}>
          <button className={`${styles.tradeTab} ${tradeMode === 'buy' ? styles.tradeTabBuy : ''}`} onClick={() => setTradeMode('buy')}>BUY</button>
          <button className={`${styles.tradeTab} ${tradeMode === 'sell' ? styles.tradeTabSell : ''}`} onClick={() => setTradeMode('sell')}>SELL</button>
        </div>

        <div className={styles.consoleBody}>
          <div className={styles.inputGroup}>
            <span className={styles.inputLabel}>Khối lượng (USDT)</span>
            <div className={styles.amtInputWrap}>
              <input type="number" className={styles.amtInput} value={amount} onChange={e => setAmount(e.target.value)} />
              <span className={styles.amtSuffix}>USDT</span>
            </div>
          </div>

          <div className={styles.quickAmounts}>
            {['10', '50', '100', 'Max'].map(a => (
              <button key={a} className={styles.quickBtn} onClick={() => setAmount(a === 'Max' ? '10' : a)}>{a}</button>
            ))}
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Trượt giá</span>
              <select style={{ background: '#0d0d12', border: '1px solid #2a2a36', color: '#fff', padding: '8px', borderRadius: '4px' }}>
                <option>Tự động (Động)</option>
                <option>Cố định 10%</option>
                <option>Cố định 20%</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Phí Ưu Tiên</span>
              <select style={{ background: '#0d0d12', border: '1px solid #2a2a36', color: '#fff', padding: '8px', borderRadius: '4px' }}>
                <option>Turbo (0.005)</option>
                <option>Ultra (0.01)</option>
                <option>Jito VIP</option>
              </select>
            </div>
          </div>

          <button className={`${styles.executeBtn} ${tradeMode === 'sell' ? styles.executeBtnSell : ''}`}>
            {tradeMode === 'buy' ? 'MUA MẠNH' : 'XẢ HÀNG'}
          </button>
        </div>
      </div>

      {/* Bottom Positions Panel */}
      <div className={`${styles.panel} ${styles.positions}`}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>💼 Lệnh Đang Mở</h2>
        </div>
        <div className={styles.panelContent} style={{ padding: 0 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Giá Vào</th>
                <th>Giá Đỉnh (ATH)</th>
                <th>Khối Lượng (USDT)</th>
                <th>Lãi/Lỗ</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#555' }}>Không có lệnh nào đang mở</td></tr>
              ) : positions.map((p, i) => (
                <tr key={i}>
                  <td>{p.token_mint?.slice(0, 8)}...</td>
                  <td>${parseFloat(p.entry_price || 0).toFixed(6)}</td>
                  <td>${parseFloat(p.highest_price_reached || p.entry_price || 0).toFixed(6)}</td>
                  <td>{p.amount_usd} USDT</td>
                  <td className={p.pnl > 0 ? styles.pnlGreen : styles.pnlRed}>
                    {p.pnl > 0 ? '+' : ''}{p.pnl}%
                  </td>
                  <td><button className={styles.actionBtn}>Đóng Lệnh</button></td>
                </tr>
              ))}
              {/* Fake Data for preview if empty and not connected */}
              {positions.length === 0 && !connected && (
                <tr>
                  <td style={{ color: '#00ff66', fontWeight: 'bold' }}>PEPE</td>
                  <td>$0.0000012</td>
                  <td>$0.0000018</td>
                  <td>50 USDT</td>
                  <td className={styles.pnlGreen}>+50.00%</td>
                  <td><button className={styles.actionBtn}>Đóng Lệnh</button></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Rules Modal */}
      {isRulesOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRulesOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>🛡️ CẤU HÌNH BẢO MẬT 3 LỚP</h2>
              <button className={styles.closeBtn} onClick={() => setIsRulesOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.ruleSection}>
                <h3 className={styles.ruleSectionTitle}>LỚP 1: BẢO MẬT ON-CHAIN</h3>
                <div className={styles.ruleItem}>
                  <label>LP Burned (100%)</label>
                  <input type="checkbox" checked={config.rule_lp_burned} onChange={e => updateConfig({ rule_lp_burned: e.target.checked })} />
                </div>
                <div className={styles.ruleItem}>
                  <label>Mint Authority (Renounced)</label>
                  <input type="checkbox" checked={config.rule_mint_renounced} onChange={e => updateConfig({ rule_mint_renounced: e.target.checked })} />
                </div>
                <div className={styles.ruleItem}>
                  <label>Freeze Authority (Renounced)</label>
                  <input type="checkbox" checked={config.rule_freeze_disabled} onChange={e => updateConfig({ rule_freeze_disabled: e.target.checked })} />
                </div>
                <div className={styles.ruleItem}>
                  <label>Top 10 Holders Max (%)</label>
                  <input type="number" value={config.max_top_10_holders_pct} onChange={e => updateConfig({ max_top_10_holders_pct: e.target.value })} />
                </div>
              </div>

              <div className={styles.ruleSection}>
                <h3 className={styles.ruleSectionTitle}>LỚP 2: DATA LOGIC</h3>
                <div className={styles.ruleItem}>
                  <label>Tuổi Token (Min - Max phút)</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input type="number" style={{ width: '60px' }} value={config.min_token_age_min} onChange={e => updateConfig({ min_token_age_min: e.target.value })} />
                    <input type="number" style={{ width: '60px' }} value={config.max_token_age_min} onChange={e => updateConfig({ max_token_age_min: e.target.value })} />
                  </div>
                </div>
                <div className={styles.ruleItem}>
                  <label>Insider Wallet Max (%)</label>
                  <input type="number" value={config.max_insider_bundle_pct} onChange={e => updateConfig({ max_insider_bundle_pct: e.target.value })} />
                </div>
                <div className={styles.ruleItem}>
                  <label>Unique Buyers Min (%)</label>
                  <input type="number" value={config.min_unique_buyers_ratio} onChange={e => updateConfig({ min_unique_buyers_ratio: e.target.value })} />
                </div>
              </div>

              <div className={styles.ruleSection}>
                <h3 className={styles.ruleSectionTitle}>LỚP 3: THANH KHOẢN</h3>
                <div className={styles.ruleItem}>
                  <label>Market Cap ($ Min - $ Max)</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input type="number" style={{ width: '80px' }} value={config.min_mcap_usd} onChange={e => updateConfig({ min_mcap_usd: e.target.value })} />
                    <input type="number" style={{ width: '80px' }} value={config.max_mcap_usd} onChange={e => updateConfig({ max_mcap_usd: e.target.value })} />
                  </div>
                </div>
                <div className={styles.ruleItem}>
                  <label>Liquidity / MCAP Min (%)</label>
                  <input type="number" value={config.min_liquidity_mcap_ratio} onChange={e => updateConfig({ min_liquidity_mcap_ratio: e.target.value })} />
                </div>
                <div className={styles.ruleItem}>
                  <label>Phải có Social Links</label>
                  <input type="checkbox" checked={config.rule_social_links_required} onChange={e => updateConfig({ rule_social_links_required: e.target.checked })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
