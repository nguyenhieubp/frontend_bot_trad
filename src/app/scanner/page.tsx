'use client';

import { useState, useEffect } from 'react';
import styles from './scanner.module.css';
import pageStyles from '../page.module.css';

interface FeedItem {
  symbol: string; mintAddress: string; pairAddress: string;
  mcap: number; liquidity: number; status: 'pass' | 'fail'; failReason?: string; scannedAt: string;
}

interface PassedToken {
  id: string; symbol: string; mint_address: string;
  market_cap: number; liquidity_usd: number; status: string; created_at: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const fmt = (n: number) => !n ? '$0' : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
const ago = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`; };

export default function ScannerPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [passed, setPassed] = useState<PassedToken[]>([]);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<'all' | 'pass' | 'fail'>('all');

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const [fr, pr] = await Promise.all([fetch(`${API}/scanner/feed`), fetch(`${API}/scanner/passed`)]);
        if (!fr.ok || !pr.ok) throw new Error();
        const [f, p] = await Promise.all([fr.json(), pr.json()]);
        if (active) { setFeed(f); setPassed(p); setConnected(true); }
      } catch { if (active) setConnected(false); }
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  const filtered = tab === 'all' ? feed : feed.filter(f => f.status === tab);
  const passCount = feed.filter(f => f.status === 'pass').length;
  const failCount = feed.filter(f => f.status === 'fail').length;

  return (
    <div className={pageStyles.page} style={{ maxWidth: '100%' }}>
      <header className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.pageTitle}>Scanner Feed</h1>
          <p className={pageStyles.pageDesc}>Real-time token scanning &amp; filter results</p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${connected ? styles.live : styles.offline}`}>
            <span className={styles.dot} />
            {connected ? 'Live' : 'Offline'}
          </span>
          <span className={styles.badge}>✅ {passCount}</span>
          <span className={styles.badge}>❌ {failCount}</span>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Feed Panel */}
        <div className={pageStyles.card} style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 180px)' }}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>⚡ Live Feed</h2>
            <div className={styles.tabs}>
              {(['all', 'pass', 'fail'] as const).map(t => (
                <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                  {t === 'all' ? 'All' : t === 'pass' ? '✅ Pass' : '❌ Fail'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.feedList}>
            {filtered.length === 0
              ? <div className={styles.empty}>Waiting for scanner data...</div>
              : filtered.map((item, i) => (
                <div key={i} className={`${styles.feedItem} ${item.status === 'pass' ? styles.feedPass : styles.feedFail}`}>
                  <div className={styles.feedMain}>
                    <span className={styles.feedIcon}>{item.status === 'pass' ? '✅' : '❌'}</span>
                    <div>
                      <span className={styles.feedSymbol}>{item.symbol}</span>
                      {item.failReason && <span className={styles.feedReason}>{item.failReason}</span>}
                      {item.status === 'pass' && <span className={styles.feedReason} style={{ color: 'var(--success)' }}>All filters passed!</span>}
                    </div>
                  </div>
                  <div className={styles.feedMeta}>
                    <div className={styles.feedStat}><span>{fmt(item.mcap)}</span><span className={styles.feedStatLabel}>MCap</span></div>
                    <div className={styles.feedStat}><span>{fmt(item.liquidity)}</span><span className={styles.feedStatLabel}>Liq</span></div>
                    <span className={styles.feedTime}>{ago(item.scannedAt)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Passed Tokens */}
        <div className={pageStyles.card} style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 180px)' }}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>🎯 Candidates ({passed.length})</h2>
          </div>
          <div className={styles.feedList}>
            {passed.length === 0
              ? <div className={styles.empty}>No tokens yet.<br /><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>Disable LP Burned filter to see results</span></div>
              : passed.map(t => (
                <div key={t.id} className={`${styles.feedItem} ${styles.feedPass}`}>
                  <div className={styles.feedMain}>
                    <span className={styles.feedIcon}>🪙</span>
                    <div>
                      <span className={styles.feedSymbol}>{t.symbol}</span>
                      <a href={`https://dexscreener.com/solana/${t.mint_address}`} target="_blank" rel="noreferrer" className={styles.feedLink}>
                        {t.mint_address.slice(0, 6)}...{t.mint_address.slice(-4)} ↗
                      </a>
                    </div>
                  </div>
                  <div className={styles.feedMeta}>
                    <div className={styles.feedStat}><span>{fmt(t.market_cap)}</span><span className={styles.feedStatLabel}>MCap</span></div>
                    <span className={`${styles.pill} ${t.status === 'TRADING' ? styles.pillTrade : t.status === 'DONE' ? styles.pillDone : styles.pillQueue}`}>{t.status}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
