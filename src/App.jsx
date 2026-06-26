import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileUp,
  Home,
  ImageUp,
  Layers3,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trash2,
  UploadCloud,
  WalletCards,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { recognize } from 'tesseract.js';
import readXlsxFile from 'read-excel-file/browser';
import './style.css';

const LS = 'tcxjournal.free.v3';
const USER_LS_PREFIX = 'tcxjournal.user.v1.';
const cloudConfigured = [
  import.meta.env.VITE_FIREBASE_API_KEY,
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  import.meta.env.VITE_FIREBASE_APP_ID,
].every(Boolean);
let cloudModulePromise;
const getCloud = () => (cloudModulePromise ||= import('./cloud'));
const DEFAULT_SETTINGS = {
  enabled: { FTT: true, CFD: true },
  defaultMarket: 'ALL',
  ocrMode: 'AUTO',
  maxTrades: 5000,
  archiveAfterDays: 365,
};
const IMPORT_LATER_KEY = 'tcxjournal.importLater.v1';
const MAX_TRANSACTIONS = 1500;
const STRATEGIES = ['Unclassified', 'Signal Following', 'Stochastic', 'Price Action', 'Support & Resistance', 'Trend Following', 'Breakout', 'Reversal', 'Scalping', 'News Trading', 'Fibonacci', 'Moving Average', 'Bollinger Bands', 'RSI Divergence', 'OTC Strategy'];
const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'Revenge', 'Bored', 'Focused', 'Patient', 'Neutral'];
const TIMEFRAMES = ['10s', '15s', '30s', '1m', '2m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];
const SESSION_OPTIONS = ['Sydney', 'Tokyo', 'London', 'New York'];
const OUTCOME_LABELS = { WIN: 'Profit', LOSS: 'Loss', DRAW: 'Refund' };
const FTT_ASSETS = [
  'AUD/CAD', 'AUD/CHF', 'AUD/JPY', 'AUD/NZD', 'AUD/USD', 'CAD/CHF', 'CAD/JPY', 'CHF/JPY',
  'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'EUR/GBP', 'EUR/JPY', 'EUR/NZD', 'EUR/USD',
  'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'GBP/JPY', 'GBP/NZD', 'GBP/USD',
  'NZD/CAD', 'NZD/CHF', 'NZD/JPY', 'NZD/USD', 'USD/BRL', 'USD/CAD', 'USD/CHF', 'USD/JPY', 'USD/MXN', 'USD/TRY', 'USD/ZAR',
  'AUD/CAD (OTC)', 'AUD/CHF (OTC)', 'AUD/JPY (OTC)', 'AUD/NZD (OTC)', 'AUD/USD (OTC)',
  'CAD/CHF (OTC)', 'CAD/JPY (OTC)', 'CHF/JPY (OTC)', 'EUR/AUD (OTC)', 'EUR/CAD (OTC)', 'EUR/CHF (OTC)', 'EUR/GBP (OTC)', 'EUR/JPY (OTC)', 'EUR/NZD (OTC)', 'EUR/USD (OTC)',
  'GBP/AUD (OTC)', 'GBP/CAD (OTC)', 'GBP/CHF (OTC)', 'GBP/JPY (OTC)', 'GBP/NZD (OTC)', 'GBP/USD (OTC)',
  'NZD/CAD (OTC)', 'NZD/CHF (OTC)', 'NZD/JPY (OTC)', 'NZD/USD (OTC)',
  'USD/ARS (OTC)', 'USD/BDT (OTC)', 'USD/BRL (OTC)', 'USD/COP (OTC)', 'USD/DZD (OTC)', 'USD/EGP (OTC)', 'USD/IDR (OTC)', 'USD/INR (OTC)', 'USD/MXN (OTC)', 'USD/NGN (OTC)', 'USD/PKR (OTC)', 'USD/PHP (OTC)', 'USD/TRY (OTC)', 'USD/ZAR (OTC)',
  'XAU/USD (OTC)', 'XAG/USD (OTC)', 'Bitcoin (OTC)', 'Ethereum (OTC)', 'Litecoin (OTC)', 'Dogecoin (OTC)', 'Solana (OTC)', 'Cardano (OTC)', 'Ripple (OTC)', 'Toncoin (OTC)', 'Polkadot (OTC)', 'Chainlink (OTC)', 'Binance Coin (OTC)',
  'Apple (OTC)', 'Amazon (OTC)', 'Tesla (OTC)', 'Microsoft (OTC)', 'Meta (OTC)', 'Netflix (OTC)', 'Alibaba (OTC)', 'McDonalds (OTC)',
  'US 100 (OTC)', 'US 500 (OTC)', 'US 30 (OTC)', 'UK 100 (OTC)', 'Germany 40 (OTC)', 'Hong Kong 50 (OTC)',
];
const CFD_ASSETS = [
  'XAU/USD', 'XAG/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY',
  'BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD', 'BNB/USD', 'SOL/USD',
  'NAS100', 'US30', 'SPX500', 'GER40', 'UK100', 'JP225', 'HK50',
  'USOIL', 'BRENT', 'NATGAS',
];

const seedTrades = [
  makeTrade({
    market: 'FTT',
    sourceId: 'c942fa43-1702-4adf-bdf8-74cfd350c5c4',
    account: 'Quotex',
    asset: 'USD/JPY',
    direction: 'UP',
    amount: 165.75,
    income: 316.58,
    payout: 91,
    open: 159.221,
    close: 159.226,
    openedAt: '2026-05-29T23:11:59',
    closedAt: '2026-05-29T23:13:00',
    duration: '00:01:01',
  }),
  makeTrade({
    market: 'FTT',
    sourceId: '2fd2b8af-2856-4c26-8a45-86e52aa138af',
    account: 'Quotex',
    asset: 'AUD/JPY',
    direction: 'DOWN',
    amount: 20,
    income: 0,
    payout: 87,
    open: 114.445,
    close: 114.446,
    openedAt: '2026-05-29T22:48:59',
    closedAt: '2026-05-29T22:50:00',
    duration: '00:01:01',
  }),
  makeTrade({
    market: 'CFD',
    sourceId: '2115811377',
    account: 'MT5',
    asset: 'XAU/USD',
    direction: 'SELL',
    amount: 0.01,
    open: 4635.749,
    close: 4636.155,
    openedAt: '2026-05-06T02:50:55',
    closedAt: '2026-05-06T02:51:36',
    profit: -0.41,
    closeReason: 'Stop out',
    commission: -0.11,
    equity: -0.05,
  }),
  makeTrade({
    market: 'CFD',
    sourceId: '2115806773',
    account: 'MT5',
    asset: 'XAU/USD',
    direction: 'SELL',
    amount: 0.15,
    open: 4636.936,
    close: 4638.524,
    openedAt: '2026-05-06T02:47:04',
    closedAt: '2026-05-06T02:47:29',
    profit: -23.82,
    closeReason: 'Stop loss',
    commission: -1.65,
  }),
];

function makeTrade(input) {
  const market = input.market || 'FTT';
  const amount = toNumber(input.amount);
  const desiredResult = input.result ? normalizeTradeResult(input.result) : input.profit !== undefined ? tradeResult(input.profit) : 'WIN';
  const explicitIncome = input.income === undefined ? input.resultAmount : input.income;
  const hasFttResult = explicitIncome !== undefined && explicitIncome !== '';
  const income = hasFttResult ? explicitIncome : deriveFttIncome(amount, input.payout, desiredResult);
  const netProfit =
    market === 'FTT'
      ? calculateFttNet(amount, income)
      : toNumber(input.profit);
  return {
    id: input.id || crypto.randomUUID(),
    sourceId: clean(input.sourceId || input.ticket || input.positionId || input.ID || ''),
    market,
    account: input.account || (market === 'FTT' ? 'Quotex' : 'CFD'),
    asset: normalizeAsset(input.asset || input.symbol || input.info || assetOptionsForMarket(market)[0] || ''),
    direction: normalizeDirection(input.direction || input.type || ''),
    amount,
    income: market === 'FTT' ? toNumber(income) : '',
    payout: market === 'FTT' ? normalizePayout(input.payout, amount, income) : '',
    profit: netProfit,
    result: tradeResult(netProfit),
    open: cleanNumber(input.open ?? input.openingPrice ?? input.opening_price),
    close: cleanNumber(input.close ?? input.closingPrice ?? input.closing_price),
    openedAt: toIso(input.openedAt || input.openingTime || input.opening_time_utc || input.open_time, 'local', ''),
    closedAt: toIso(input.closedAt || input.closingTime || input.closing_time_utc || input.close_time, 'local', ''),
    duration: input.duration || input.timeframe || durationBetween(input.openedAt || input.openingTime, input.closedAt || input.closingTime),
    strategy: normalizeStrategy(input.strategy),
    session: normalizeSession(input.session, input.openedAt || input.openingTime || input.opening_time_utc || input.open_time),
    emotion: input.emotion || 'Neutral',
    closeReason: title(input.closeReason || input.close_reason || ''),
    commission: cleanNumber(input.commission),
    swap: cleanNumber(input.swap),
    equity: cleanNumber(input.equity),
    notes: input.notes || '',
    importedAt: input.importedAt || new Date().toISOString(),
  };
}

function saved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS));
    if (!parsed) return { trades: seedTrades, transactions: [], settings: DEFAULT_SETTINGS };
    return {
      trades: (parsed.trades || seedTrades).map((t) => makeTrade(t)),
      transactions: (parsed.transactions || []).map(makeTransaction),
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}), enabled: { ...DEFAULT_SETTINGS.enabled, ...(parsed.settings?.enabled || {}) } },
    };
  } catch {
    return { trades: seedTrades, transactions: [], settings: DEFAULT_SETTINGS };
  }
}

function savedForUser(uid) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${USER_LS_PREFIX}${uid}`));
    if (!parsed) return null;
    return normalizeJournal(parsed);
  } catch {
    return null;
  }
}

function normalizeJournal(journal) {
  return {
    trades: (journal?.trades || []).map((trade) => makeTrade(trade)),
    transactions: (journal?.transactions || []).map(makeTransaction),
    settings: {
      ...DEFAULT_SETTINGS,
      ...(journal?.settings || {}),
      enabled: { ...DEFAULT_SETTINGS.enabled, ...(journal?.settings?.enabled || {}) },
    },
  };
}

function mergeTrades(primary, secondary = []) {
  const merged = [];
  const keys = new Set();
  [...primary, ...secondary].map((trade) => makeTrade(trade)).forEach((trade) => {
    const key = uniqueKey(trade);
    if (!keys.has(key)) {
      keys.add(key);
      merged.push(trade);
    }
  });
  return merged.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
}

function makeTransaction(input) {
  const type = /with|payout/i.test(input.type) ? 'WITHDRAWAL' : 'DEPOSIT';
  return {
    id: input.id || input.sourceId || crypto.randomUUID(),
    sourceId: clean(input.sourceId || input.invoice || ''),
    provider: input.provider || 'Imported',
    account: input.account || '',
    type,
    amount: Math.abs(toNumber(input.amount)),
    currency: input.currency || 'USD',
    occurredAt: toIso(input.occurredAt || input.date, input.zone || 'local', ''),
    status: title(input.status || 'Succeeded'),
    fingerprint: input.fingerprint || '',
    importedAt: input.importedAt || new Date().toISOString(),
  };
}

function mergeTransactions(primary = [], secondary = []) {
  const seen = new Set();
  return [...primary, ...secondary].map(makeTransaction).filter((item) => {
    const key = transactionKey(item);
    if (!item.occurredAt || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
}

function App() {
  const [data, setData] = useState(saved);
  const [page, setPage] = useState('Home');
  const [market, setMarket] = useState(data.settings.defaultMarket || 'ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [activeTrade, setActiveTrade] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);
  const [dayPopup, setDayPopup] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [authState, setAuthState] = useState({
    configured: cloudConfigured,
    loading: cloudConfigured,
    user: null,
    status: cloudConfigured ? 'connecting' : 'setup',
    security: null,
    error: '',
    hydrated: false,
  });
  const dataRef = useRef(data);
  const userRef = useRef(null);

  useEffect(() => {
    dataRef.current = data;
    if (authState.user && !authState.hydrated) return;
    const key = authState.user ? `${USER_LS_PREFIX}${authState.user.uid}` : LS;
    localStorage.setItem(key, JSON.stringify(data));
  }, [data, authState.user, authState.hydrated]);

  useEffect(() => {
    let unsubscribe = () => {};
    let disposed = false;
    const handleAuth = async (user) => {
      const previousUser = userRef.current;
      userRef.current = user;
      if (!user) {
        if (previousUser) setData(saved());
        setAuthState((current) => ({
          ...current,
          loading: false,
          user: null,
          status: cloudConfigured ? 'local' : 'setup',
          security: null,
          error: '',
          hydrated: false,
        }));
        return;
      }

      setAuthState((current) => ({ ...current, loading: true, user, status: 'syncing', security: 'checking', error: '', hydrated: false }));
      try {
        const cloud = await getCloud();
        const remote = await cloud.loadCloudJournal(user.uid);
        const userCache = savedForUser(user.uid);
        const hasRemote = Boolean(remote.trades.length || remote.transactions?.length || remote.settings);
        const base = hasRemote
          ? normalizeJournal(remote)
          : (userCache || normalizeJournal({ trades: [], settings: DEFAULT_SETTINGS }));
        const merged = {
          trades: hasRemote ? mergeTrades(base.trades, userCache?.trades) : mergeTrades(base.trades),
          transactions: hasRemote ? mergeTransactions(base.transactions, userCache?.transactions) : mergeTransactions(base.transactions),
          settings: remote.settings ? normalizeJournal({ settings: remote.settings }).settings : base.settings,
        };
        setData(merged);
        await cloud.initializeCloudJournal(user, merged);

        let security = 'verified';
        try {
          await cloud.verifyWithTcxSecurity(user);
        } catch {
          security = 'unavailable';
        }
        if (!disposed) setAuthState((current) => ({ ...current, loading: false, user, status: 'synced', security, error: '', hydrated: true }));
      } catch (error) {
        if (!disposed) setAuthState((current) => ({
          ...current,
          loading: false,
          user,
          status: 'error',
          security: 'unavailable',
          error: friendlyAuthError(error),
        }));
      }
    };

    if (!cloudConfigured) {
      handleAuth(null);
      return undefined;
    }
    getCloud().then((cloud) => {
      if (!disposed) unsubscribe = cloud.watchAuth(handleAuth);
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  const syncCloud = async (operation) => {
    const user = userRef.current;
    if (!user) return;
    setAuthState((current) => ({ ...current, status: 'syncing', error: '' }));
    try {
      await operation(user.uid, await getCloud());
      setAuthState((current) => ({ ...current, status: 'synced', error: '' }));
    } catch (error) {
      setAuthState((current) => ({ ...current, status: 'error', error: friendlyAuthError(error) }));
    }
  };

  const signIn = async () => {
    setAuthState((current) => ({ ...current, loading: true, status: 'connecting', error: '' }));
    try {
      const cloud = await getCloud();
      await cloud.loginWithGoogle();
    } catch (error) {
      setAuthState((current) => ({ ...current, loading: false, status: 'local', error: friendlyAuthError(error) }));
    }
  };

  const signOut = async () => {
    setAccountOpen(false);
    const cloud = await getCloud();
    await cloud.logout();
  };

  const startFresh = async () => {
    const user = userRef.current;
    if (!user || !window.confirm('Remove every trade from this cloud account and start with an empty journal? Your old anonymous browser journal will stay separate.')) return;
    setAuthState((current) => ({ ...current, loading: true, status: 'syncing', error: '' }));
    try {
      const cloud = await getCloud();
      await cloud.clearCloudJournal(user.uid);
      const emptyJournal = normalizeJournal({ trades: [], settings: DEFAULT_SETTINGS });
      setData(emptyJournal);
      await cloud.initializeCloudJournal(user, emptyJournal);
      setAuthState((current) => ({ ...current, loading: false, status: 'synced', error: '', hydrated: true }));
      setAccountOpen(false);
    } catch (error) {
      setAuthState((current) => ({ ...current, loading: false, status: 'error', error: friendlyAuthError(error) }));
    }
  };

  const enabledTrades = useMemo(
    () => data.trades.filter((t) => data.settings.enabled[t.market]),
    [data.trades, data.settings.enabled],
  );
  const trades = useMemo(
    () => enabledTrades.filter((t) => market === 'ALL' || t.market === market),
    [enabledTrades, market],
  );
  const selectedTrades = useMemo(
    () => selectedDate ? trades.filter((t) => dateKey(t.openedAt) === selectedDate) : [],
    [selectedDate, trades],
  );

  const importTrades = (items) => {
    const normalized = items.map((t) => makeTrade(t)).filter((t) => t.asset && t.openedAt);
    const keys = new Set(data.trades.map(uniqueKey));
    const fresh = [];
    for (const trade of normalized) {
      const key = uniqueKey(trade);
      if (!keys.has(key)) {
        keys.add(key);
        fresh.push(trade);
      }
    }
    const remaining = Math.max(0, data.settings.maxTrades - data.trades.length);
    const accepted = fresh.slice(0, remaining);
    if (accepted.length) {
      setData((current) => ({ ...current, trades: [...accepted, ...current.trades] }));
      syncCloud((uid, cloud) => cloud.saveCloudTrades(uid, accepted));
    }
    return { added: accepted.length, skipped: normalized.length - fresh.length, limited: fresh.length - accepted.length, detected: normalized.length };
  };

  const importTransactions = (items) => {
    const existing = new Set(data.transactions.map(transactionKey));
    const fresh = mergeTransactions(items).filter((item) => !existing.has(transactionKey(item)));
    const accepted = fresh.slice(0, Math.max(0, MAX_TRANSACTIONS - data.transactions.length));
    if (accepted.length) {
      setData((current) => ({ ...current, transactions: mergeTransactions(accepted, current.transactions) }));
      syncCloud((uid, cloud) => cloud.saveCloudTransactions(uid, accepted));
    }
    return { added: accepted.length, skipped: items.length - fresh.length, limited: fresh.length - accepted.length };
  };

  const saveTrade = (trade) => importTrades([trade]);
  const deleteTrade = (id) => {
    setData((current) => ({ ...current, trades: current.trades.filter((t) => t.id !== id) }));
    syncCloud((uid, cloud) => cloud.deleteCloudTrade(uid, id));
  };
  const updateTrade = (trade) => {
    const normalized = makeTrade(trade);
    setData((current) => ({
      ...current,
      trades: current.trades.map((item) => item.id === normalized.id ? normalized : item),
    }));
    syncCloud((uid, cloud) => cloud.saveCloudTrades(uid, [normalized]));
    setEditingTrade(null);
    setActiveTrade(normalized);
  };
  const removeTrade = (id) => {
    deleteTrade(id);
    setActiveTrade(null);
    setEditingTrade(null);
  };
  const updateSettings = (settings) => {
    const nextSettings = { ...dataRef.current.settings, ...settings };
    setData((current) => ({ ...current, settings: nextSettings }));
    syncCloud((uid, cloud) => cloud.saveCloudSettings(uid, nextSettings));
    if (settings.defaultMarket) setMarket(settings.defaultMarket);
  };
  const archiveOldTrades = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - data.settings.archiveAfterDays);
    const old = data.trades.filter((trade) => new Date(trade.openedAt) < cutoff);
    if (!old.length) return 0;
    exportTradesCsv(old, `tcxjournal-archive-before-${dateKey(cutoff)}.csv`);
    const ids = new Set(old.map((trade) => trade.id));
    setData((current) => ({ ...current, trades: current.trades.filter((trade) => !ids.has(trade.id)) }));
    syncCloud((uid, cloud) => cloud.deleteCloudTrades(uid, [...ids]));
    return old.length;
  };
  const pickDate = (key) => setSelectedDate((current) => (current === key ? '' : key));
  const openCalendarDay = (key) => {
    setSelectedDate(key);
    setDayPopup(key);
  };

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} open={navOpen} setOpen={setNavOpen} />
      <main onClick={() => page === 'Home' && selectedDate && setSelectedDate('')}>
        <Topbar
          page={page}
          market={market}
          setMarket={setMarket}
          settings={data.settings}
          setPage={setPage}
          openNav={() => setNavOpen(true)}
          authState={authState}
          openAccount={() => setAccountOpen(true)}
        />
        {page === 'Home' && (
          <Dashboard
            trades={trades}
            selectedDate={selectedDate}
            selectedTrades={selectedTrades}
            onDatePick={pickDate}
            clearDate={() => setSelectedDate('')}
            onOpenTrade={setActiveTrade}
            onEditTrade={setEditingTrade}
          />
        )}
        {page === 'New Trade' && <NewTrade onSave={saveTrade} onImport={importTrades} settings={data.settings} onOpenTrade={setActiveTrade} />}
        {page === 'History' && <History trades={trades} deleteTrade={removeTrade} onOpenTrade={setActiveTrade} onEditTrade={setEditingTrade} />}
        {page === 'Analytics' && <Analytics trades={trades} transactions={data.transactions} />}
        {page === 'Transactions' && <TransactionsPage transactions={data.transactions} trades={data.trades} onImport={importTransactions} settings={data.settings} />}
        {page === 'Calendar' && (
          <CalendarPage
            trades={trades}
            selectedDate={selectedDate}
            selectedTrades={selectedTrades}
            onDatePick={openCalendarDay}
            clearDate={() => setSelectedDate('')}
            onOpenTrade={setActiveTrade}
            onEditTrade={setEditingTrade}
          />
        )}
        {page === 'Settings' && <SettingsPage settings={data.settings} updateSettings={updateSettings} authState={authState} openAccount={() => setAccountOpen(true)} trades={data.trades} transactions={data.transactions} onArchive={archiveOldTrades} />}
      </main>
      <BottomNav page={page} setPage={setPage} />
      {accountOpen && (
        <AccountModal
          authState={authState}
          onClose={() => setAccountOpen(false)}
          onSignIn={signIn}
          onSignOut={signOut}
          onStartFresh={startFresh}
        />
      )}
      {activeTrade && (
        <TradeDetailModal
          trade={activeTrade}
          onClose={() => setActiveTrade(null)}
          onEdit={() => {
            setEditingTrade(activeTrade);
            setActiveTrade(null);
          }}
          onDelete={() => removeTrade(activeTrade.id)}
        />
      )}
      {editingTrade && (
        <TradeEditorModal
          trade={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSave={updateTrade}
          onDelete={() => removeTrade(editingTrade.id)}
        />
      )}
      {dayPopup && (
        <DayTradesModal
          date={dayPopup}
          trades={trades.filter((t) => dateKey(t.openedAt) === dayPopup)}
          onClose={() => setDayPopup('')}
          onOpenTrade={(trade) => {
            setDayPopup('');
            setActiveTrade(trade);
          }}
        />
      )}
    </div>
  );
}

function Sidebar({ page, setPage, open, setOpen }) {
  const nav = [
    ['Home', Home],
    ['New Trade', Plus],
    ['History', WalletCards],
    ['Analytics', Activity],
    ['Calendar', CalendarDays],
    ['Transactions', WalletCards],
    ['Settings', Settings],
  ];
  return (
    <aside className={open ? 'sidebar show' : 'sidebar'}>
      <div className="brand">
        <img className="brandLogo" src="/tcx-logo.svg" alt="Trading Candle X Journal logo" />
        <div><b>TCX Journal</b><span>Trading Candle X</span></div>
        <button className="closeNav" onClick={() => setOpen(false)}><X size={18} /></button>
      </div>
      <nav>
        {nav.map(([name, Icon]) => (
          <button
            key={name}
            className={page === name ? 'active' : ''}
            onClick={() => {
              setPage(name);
              setOpen(false);
            }}
          >
            <Icon size={18} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      <div className="sideNote">
        <ShieldCheck size={18} />
        <span>Protected by TCX Security</span>
      </div>
    </aside>
  );
}

function Topbar({ page, market, setMarket, settings, setPage, openNav, authState, openAccount }) {
  const options = ['ALL', 'FTT', 'CFD'].filter((m) => m === 'ALL' || settings.enabled[m]);
  return (
    <header className="topbar">
      <button className="hamb" onClick={openNav}><Menu size={20} /></button>
      <div className="titleBlock">
        <span>Trading journal</span>
        <h1>{page}</h1>
      </div>
      <div className="actions">
        <div className="segmented">
          {options.map((m) => (
            <button key={m} className={market === m ? 'on' : ''} onClick={() => setMarket(m)}>{m}</button>
          ))}
        </div>
        <button className="soft search"><Search size={17} /><span>Search</span></button>
        <button className="primary" onClick={() => setPage('New Trade')}><Plus size={17} /><span>New</span></button>
        <button className={authState.user ? 'accountButton signedIn' : 'accountButton'} onClick={openAccount} aria-label="Account and cloud sync">
          {authState.user?.photoURL
            ? <img src={authState.user.photoURL} alt="" referrerPolicy="no-referrer" />
            : <LogIn size={17} />}
          <span>{authState.user ? authState.user.displayName?.split(' ')[0] || 'Account' : 'Sign in'}</span>
          {authState.security === 'verified' && <ShieldCheck className="verifiedMark" size={15} />}
        </button>
      </div>
    </header>
  );
}

function BottomNav({ page, setPage }) {
  const nav = [
    ['Home', Home],
    ['New Trade', Plus],
    ['History', WalletCards],
    ['Analytics', Activity],
    ['Calendar', CalendarDays],
  ];
  return (
    <div className="bottomNav">
      {nav.map(([name, Icon]) => (
        <button key={name} className={page === name ? 'active' : ''} onClick={() => setPage(name)}>
          <Icon size={18} />
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
}

function Dashboard({ trades, selectedDate, selectedTrades, onDatePick, clearDate, onOpenTrade, onEditTrade }) {
  const scopedTrades = selectedDate ? selectedTrades : trades;
  const shownTrades = selectedDate ? selectedTrades : trades.slice(0, 8);
  return (
    <section className="page" onClick={() => selectedDate && clearDate()}>
      <Stats trades={scopedTrades} />
      <div className="dashGrid">
        <EquityPanel trades={scopedTrades} title={selectedDate ? `Equity on ${formatDate(selectedDate)}` : 'Equity Curve'} />
        <ResultPanel trades={scopedTrades} />
        <CalendarPanel trades={trades} selectedDate={selectedDate} onDatePick={onDatePick} />
        <TradeList
          title={selectedDate ? `Trades on ${formatDate(selectedDate)}` : 'Recent Trades'}
          trades={shownTrades}
          compact
          hideSession
          className="recentTradeCard"
          onOpenTrade={onOpenTrade}
          onEditTrade={onEditTrade}
        />
        <StrategyPanel trades={scopedTrades} />
      </div>
    </section>
  );
}

function Stats({ trades }) {
  const pnl = sum(trades, 'profit');
  const wins = trades.filter((t) => t.result === 'WIN').length;
  const losses = trades.filter((t) => t.result === 'LOSS').length;
  const ftt = trades.filter((t) => t.market === 'FTT').length;
  const cfd = trades.filter((t) => t.market === 'CFD').length;
  const winRate = trades.length ? wins / trades.length * 100 : 0;
  const avg = trades.length ? pnl / trades.length : 0;
  const cards = [
    ['Net P&L', money(pnl), pnl >= 0 ? 'green' : 'red', BarChart3],
    ['Win Rate', `${winRate.toFixed(1)}%`, 'blue', Activity],
    ['Trades', String(trades.length), '', Layers3],
    ['Expectancy', money(avg), avg >= 0 ? 'green' : 'red', SlidersHorizontal],
  ];
  return (
    <div className="metrics">
      {cards.map(([label, value, tone, Icon]) => (
        <div className="metric card" key={label}>
          <div className={`mIcon ${tone}`}><Icon size={19} /></div>
          <span>{label}</span>
          <b className={tone}>{value}</b>
          <small>{wins}W / {losses}L - {ftt} FTT / {cfd} CFD</small>
        </div>
      ))}
    </div>
  );
}

function EquityPanel({ trades, title = 'Equity Curve' }) {
  let running = 0;
  const data = [...trades]
    .sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt))
    .map((t, index) => ({
      index,
      label: `${shortDate(t.openedAt)} ${timeOnly(t.openedAt)}`,
      pnl: running += toNumber(t.profit),
      tradePnl: toNumber(t.profit),
      asset: t.asset,
      result: t.result,
    }));
  return (
    <div className="card chartXL">
      <PanelTitle title={title} tag="Cumulative" />
      <ResponsiveContainer height={310}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#35d49a" stopOpacity=".28" />
              <stop offset="100%" stopColor="#35d49a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,.06)" />
          <XAxis dataKey="label" stroke="#7f8da1" minTickGap={48} />
          <YAxis stroke="#7f8da1" />
          <Tooltip
            cursor={{ stroke: 'rgba(106,169,255,.55)', strokeDasharray: '4 4' }}
            contentStyle={tooltipStyle}
            labelFormatter={(_, payload) => payload?.[0]?.payload ? `${payload[0].payload.asset} - ${payload[0].payload.label}` : ''}
            formatter={(value, name, item) => [money(value), `Balance (${item?.payload?.result || ''} ${money(item?.payload?.tradePnl || 0)})`]}
          />
          <Area type="monotone" dataKey="pnl" stroke="#35d49a" strokeWidth={2.5} fill="url(#equityFill)" activeDot={{ r: 6, strokeWidth: 2 }} dot={data.length < 40} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ResultPanel({ trades }) {
  return <OutcomePanel trades={trades} />;
}

function OutcomePanel({ trades }) {
  const data = [
    { name: 'Profit', value: trades.filter((t) => t.result === 'WIN').length, color: '#10b981' },
    { name: 'Loss', value: trades.filter((t) => t.result === 'LOSS').length, color: '#f43f5e' },
    { name: 'Refund', value: trades.filter((t) => t.result === 'DRAW').length, color: '#f59e0b' },
  ];
  const assets = Object.entries(trades.reduce((acc, trade) => {
    acc[trade.asset] = acc[trade.asset] || { pnl: 0, count: 0 };
    acc[trade.asset].pnl += toNumber(trade.profit);
    acc[trade.asset].count += 1;
    return acc;
  }, {}));
  const bestAsset = assets.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const busiestAsset = [...assets].sort((a, b) => b[1].count - a[1].count)[0];
  const wins = trades.filter((t) => t.profit > 0).map((t) => toNumber(t.profit));
  const losses = trades.filter((t) => t.profit < 0).map((t) => Math.abs(toNumber(t.profit)));
  return (
    <div className="card outcomeCard">
      <PanelTitle title="Outcome Mix" tag="Count" />
      <div className="outcomeCompact">
        <div className="legend compactLegend">
          {data.map((item) => <p key={item.name}><i style={{ background: item.color }} />{item.name}<b>{item.value}</b></p>)}
        </div>
        <ResponsiveContainer height={132}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={36} outerRadius={58}>
              {data.map((item) => <Cell key={item.name} fill={item.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="outcomeStats">
        <Info label="Avg profit" value={money(average(wins))} />
        <Info label="Avg loss" value={money(-average(losses))} />
        <Info label="Best asset" value={bestAsset ? `${bestAsset[0]} ${money(bestAsset[1].pnl)}` : '-'} />
        <Info label="Most traded" value={busiestAsset ? `${busiestAsset[0]} (${busiestAsset[1].count})` : '-'} />
      </div>
    </div>
  );
}

function CalendarPage({ trades, selectedDate, selectedTrades, onDatePick, clearDate, onOpenTrade, onEditTrade }) {
  const [range, setRange] = useState('month');
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = useResponsivePageSize();
  const anchor = selectedDate || trades[0]?.openedAt || new Date().toISOString();
  const sideTrades = useMemo(() => filterTradesByPeriod(trades, range, anchor), [trades, range, anchor]);
  const sorted = [...sideTrades].sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(pageIndex, pages - 1);
  const listTrades = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);
  return (
    <section className="page calendarPage">
      <div className="rangeBar"><b>Focus range</b><div className="segmented inline">{['day', 'week', 'month', 'year'].map((item) => <button key={item} className={range === item ? 'on' : ''} onClick={() => { setRange(item); setPageIndex(0); }}>{title(item)}</button>)}</div><span>{periodLabel(range, anchor)}</span></div>
      <CalendarPanel trades={trades} selectedDate={selectedDate} onDatePick={(key) => { setRange('day'); setPageIndex(0); onDatePick(key); }} full />
      <div className="calendarSide">
        <CalendarInsightPanel trades={sideTrades} selectedDate={selectedDate} />
        <div className="calendarTrades"><TradeList title="Recent Trades" trades={listTrades} empty="No trades in this range." onOpenTrade={onOpenTrade} onEditTrade={onEditTrade} /><Pagination page={safePage} pages={pages} total={sorted.length} pageSize={pageSize} onChange={setPageIndex} /></div>
        {selectedDate && <button className="soft clearDay" onClick={clearDate}>Show recent trades</button>}
      </div>
    </section>
  );
}

function CalendarInsightPanel({ trades, selectedDate }) {
  const bySession = Object.entries(trades.reduce((acc, trade) => {
    acc[trade.session] = (acc[trade.session] || 0) + toNumber(trade.profit);
    return acc;
  }, {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const byStrategy = Object.entries(trades.reduce((acc, trade) => {
    acc[trade.strategy] = (acc[trade.strategy] || 0) + toNumber(trade.profit);
    return acc;
  }, {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return (
    <div className="card calendarInsight">
      <PanelTitle title={selectedDate ? 'Day Focus' : 'Calendar Focus'} tag={selectedDate ? formatDate(selectedDate) : 'Month'} />
      <div className="daySummary">
        <Info label="Trades" value={trades.length} />
        <Info label="P&L" value={money(sum(trades, 'profit'))} />
        <Info label="Win rate" value={`${winRate(trades).toFixed(1)}%`} />
        <Info label="Avg trade" value={money(average(trades.map((t) => t.profit)))} />
      </div>
      <div className="focusBars">
        <MiniRank title="Sessions" rows={bySession.slice(0, 4)} />
        <MiniRank title="Strategies" rows={byStrategy.slice(0, 4)} />
      </div>
    </div>
  );
}

function MiniRank({ title, rows }) {
  return (
    <div className="miniRank">
      <b>{title}</b>
      {rows.map(([name, pnl]) => (
        <p key={name}><span>{name}</span><strong className={pnl >= 0 ? 'green' : 'red'}>{money(pnl)}</strong></p>
      ))}
      {!rows.length && <p><span>No data</span><strong>-</strong></p>}
    </div>
  );
}

function CalendarPanel({ trades, selectedDate, onDatePick, full = false }) {
  const base = selectedDate || trades[0]?.openedAt || new Date().toISOString();
  const days = buildMonthDays(base);
  const byDay = groupByDay(trades);
  return (
    <div className={`card calendarCard ${full ? 'wideCard' : ''}`} onClick={(e) => e.stopPropagation()}>
      <PanelTitle title="P&L Calendar" tag={new Date(base).toLocaleString(undefined, { month: 'long', year: 'numeric' })} />
      <div className="weekHeader">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal">
        {days.map((day, index) => {
          if (!day) return <div className="blankDay" key={`blank-${index}`} />;
          const key = dateKey(day);
          const dayTrades = byDay[key] || [];
          const pnl = sum(dayTrades, 'profit');
          return (
            <button
              key={key}
              className={`day ${pnl > 0 ? 'win' : pnl < 0 ? 'loss' : ''} ${selectedDate === key ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onDatePick(key);
              }}
            >
              <span>{new Date(day).getDate()}</span>
              {!!dayTrades.length && <b>{money(pnl)}</b>}
              {!!dayTrades.length && <small>{dayTrades.length} trades - {winRate(dayTrades).toFixed(0)}%</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StrategyPanel({ trades }) {
  const rows = Object.entries(trades.reduce((acc, trade) => {
    acc[trade.strategy] = (acc[trade.strategy] || 0) + toNumber(trade.profit);
    return acc;
  }, {})).map(([name, pnl]) => ({ name, pnl })).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  return (
    <div className="card">
      <PanelTitle title="Strategy Edge" tag="P&L" />
      <ResponsiveContainer height={240}>
        <BarChart data={rows}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" />
          <XAxis dataKey="name" stroke="#7f8da1" hide={rows.length > 4} />
          <YAxis stroke="#7f8da1" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
          <Bar dataKey="pnl" fill="#6aa9ff" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TradeList({ title = 'Trade History', trades, compact = false, hideSession = false, className = '', deleteTrade, empty = 'No trades yet.', onOpenTrade, onEditTrade, actionSlot }) {
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const groups = useMemo(() => groupTradesForJournal(trades), [trades]);
  const collapsedCount = groups.filter((group) => group.trades.length > 1).length;
  const toggleGroup = (groupId) => setExpandedGroups((current) => {
    const next = new Set(current);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    return next;
  });

  const renderTradeRow = (trade, options = {}) => {
    const { group, child = false } = options;
    const multiple = group?.trades.length > 1;
    const expanded = multiple && expandedGroups.has(group.id);
    const open = () => multiple ? toggleGroup(group.id) : onOpenTrade?.(trade);
    return (
      <div
        className={`trow tradeButton ${hideSession ? 'noSession' : ''} ${multiple ? 'tradeGroup' : ''} ${child ? 'groupChild' : ''}`}
        key={child ? trade.id : group?.id || trade.id}
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && open()}
      >
        <div className="tradeIdentity">
          <b>{trade.asset}{multiple && <i className="groupCount">{group.trades.length} entries</i>}</b>
          <small>{shortDate(trade.openedAt)} - {timeOnly(trade.openedAt)} - {trade.market} {trade.direction}</small>
        </div>
        <span className="chipLine"><i>{trade.strategy}</i><i>{trade.emotion}</i></span>
        {!hideSession && <span>{trade.session}<small>{multiple ? `Closes ${timeOnly(trade.closedAt)}` : trade.duration || 'Timed trade'}</small></span>}
        <span className={trade.profit >= 0 ? 'green' : 'red'}>
          {money(trade.profit)}
          {multiple
            ? <small>{trade.market === 'FTT' ? `${money(trade.amount)} total stake` : `${formatAmount(trade.amount)} total lot`}</small>
            : trade.market === 'FTT' && <small>{trade.payout || 90}% payout</small>}
        </span>
        {!compact && (
          <span className="rowActions" onClick={(event) => event.stopPropagation()}>
            {multiple ? (
              <button className={`iconBtn groupToggle ${expanded ? 'open' : ''}`} title={expanded ? 'Collapse entries' : 'Show entries'} onClick={() => toggleGroup(group.id)}><ChevronDown size={16} /></button>
            ) : (
              <>
                <button className="iconBtn" title="View trade" onClick={() => onOpenTrade?.(trade)}><Eye size={15} /></button>
                <button className="iconBtn" title="Edit trade" onClick={() => onEditTrade?.(trade)}><Edit3 size={15} /></button>
                {deleteTrade && <button className="iconBtn danger" title="Delete trade" onClick={() => deleteTrade(trade.id)}><Trash2 size={15} /></button>}
              </>
            )}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`card tableCard ${compact ? '' : 'wideCard'} ${className}`}>
      <PanelTitle title={title} tag={`${trades.length} trades${collapsedCount ? ` - ${groups.length} rows` : ''}`} action={actionSlot} />
      <div className="table">
        <div className={`trow head ${hideSession ? 'noSession' : ''}`}>
          <span>Trade</span><span>Setup</span>{!hideSession && <span>Session</span>}<span>Result</span>{!compact && <span />}
        </div>
        {groups.map((group) => (
          <React.Fragment key={group.id}>
            {renderTradeRow(group.summary, { group })}
            {group.trades.length > 1 && expandedGroups.has(group.id) && (
              <div className="groupEntries">
                {group.trades.map((trade) => renderTradeRow(trade, { child: true }))}
              </div>
            )}
          </React.Fragment>
        ))}
        {!trades.length && <div className="empty">{empty}</div>}
      </div>
    </div>
  );
}

function NewTrade({ onSave, onImport, settings, onOpenTrade }) {
  const [market, setMarket] = useState(settings.defaultMarket === 'CFD' ? 'CFD' : 'FTT');
  const [status, setStatus] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [form, setForm] = useState({
    account: 'Quotex',
    asset: 'USD/JPY',
    direction: 'UP',
    amount: 10,
    payout: 90,
    profit: 9,
    result: 'WIN',
    open: '',
    close: '',
    openedAt: inputDateTime(),
    closedAt: inputDateTime(),
    strategy: 'Unclassified',
    session: inferForexSession(new Date()),
    emotion: 'Neutral',
    notes: '',
  });

  const set = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    if (key === 'openedAt') next.session = inferForexSession(value);
    if (key === 'result') next.income = '';
    return next;
  });
  const switchMarket = (next) => {
    setMarket(next);
    setForm((current) => ({
      ...current,
      asset: assetOptionsForMarket(next).includes(normalizeAsset(current.asset)) ? normalizeAsset(current.asset) : assetOptionsForMarket(next)[0],
      account: next === 'FTT' ? 'Quotex' : 'MT5',
      direction: next === 'FTT' ? 'UP' : 'BUY',
      payout: next === 'FTT' ? current.payout || 90 : '',
      income: next === 'FTT' ? '' : current.income,
      result: next === 'FTT' ? normalizeTradeResult(current.result) : current.result,
    }));
  };
  const save = () => {
    const trade = makeTrade({ ...form, market, profit: market === 'CFD' ? form.profit : undefined });
    const result = onSave(trade);
    setStatus(result.added ? 'Trade saved.' : 'That trade already exists.');
    if (result.added) onOpenTrade?.(trade);
  };

  return (
    <section className="page narrow">
      <div className="card formShell">
        <div className="formHead">
          <div>
            <span className="miniCaps">Trade log</span>
            <h2>New Trade</h2>
          </div>
        </div>
        <Importer onImport={onImport} settings={settings} onReviewChange={setReviewing} />
        {!reviewing && <><div className="orDivider"><span>or fill manually</span></div>
          <div className="manualTicket">
            <div className="segmented inline">
              {['FTT', 'CFD'].filter((m) => settings.enabled[m]).map((m) => (
                <button key={m} className={market === m ? 'on' : ''} onClick={() => switchMarket(m)}>{m}</button>
              ))}
            </div>
            <TradeFormFields draft={{ ...form, market }} set={set} />
            <button className="primary save" onClick={save}><Check size={18} />Save trade</button>
            {status && <p className="status">{status}</p>}
          </div>
        </>}
      </div>
    </section>
  );
}

function Importer({ onImport, settings, onReviewChange }) {
  const [mode, setMode] = useState(settings.ocrMode || 'AUTO');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(IMPORT_LATER_KEY)) || []; } catch { return []; }
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);

  useEffect(() => onReviewChange?.(Boolean(drafts.length)), [drafts.length, onReviewChange]);
  useEffect(() => {
    let depth = 0;
    const enter = (event) => { event.preventDefault(); depth += 1; setDragging(true); };
    const over = (event) => event.preventDefault();
    const leave = (event) => { event.preventDefault(); depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const drop = (event) => {
      event.preventDefault();
      depth = 0;
      setDragging(false);
      handleFiles(event.dataTransfer?.files);
    };
    document.addEventListener('dragenter', enter);
    document.addEventListener('dragover', over);
    document.addEventListener('dragleave', leave);
    document.addEventListener('drop', drop);
    return () => {
      document.removeEventListener('dragenter', enter);
      document.removeEventListener('dragover', over);
      document.removeEventListener('dragleave', leave);
      document.removeEventListener('drop', drop);
    };
  }, [mode]);

  async function handleFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    setBusy(true);
    setStatus('Reading files...');
    try {
      const allDrafts = [];
      for (const file of files) {
        if (isSheet(file)) {
          allDrafts.push(...await parseSheetFile(file));
        } else if (file.type.startsWith('image/')) {
          const text = await readImageText(file, mode, setStatus);
          const parsed = parseTradeText(text, mode);
          if (!parsed.length) throw new Error('not-trade-image');
          allDrafts.push(...parsed);
        } else {
          throw new Error('unsupported-file');
        }
      }
      if (!allDrafts.length) throw new Error('no-trades');
      setDrafts(allDrafts);
      setActiveIndex(0);
      setStatus(`${allDrafts.length} trade(s) detected.`);
    } catch (error) {
      const message = error.message === 'not-trade-image' || error.message === 'no-trades'
        ? 'No valid trade history found. Upload a proper Quotex FTT or CFD trade history screenshot/file.'
        : 'File type not supported. Upload CSV, XLSX, PNG, JPG, or WEBP trade history.';
      setStatus(message);
      setDrafts([]);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const updateDraft = (id, key, value) => setDrafts((current) => current.map((trade) => {
    if (trade.id !== id) return trade;
    const next = { ...trade, [key]: value };
    if (key === 'openedAt') next.session = inferForexSession(value);
    if (key === 'result') next.income = '';
    return makeTrade(next);
  }));
  const saveDrafts = () => {
    const result = onImport(drafts);
    setStatus(`${result.added} new saved. ${result.skipped} duplicate skipped.${result.limited ? ` ${result.limited} over the storage limit.` : ''}`);
    setDrafts([]);
    setActiveIndex(0);
    localStorage.removeItem(IMPORT_LATER_KEY);
  };
  const skipAll = () => {
    setDrafts([]);
    setActiveIndex(0);
    localStorage.removeItem(IMPORT_LATER_KEY);
    setStatus('Import skipped.');
  };
  const logLater = () => {
    localStorage.setItem(IMPORT_LATER_KEY, JSON.stringify(drafts));
    setStatus(`${drafts.length} trade(s) saved for later review.`);
  };
  const activeDraft = drafts[Math.min(activeIndex, Math.max(0, drafts.length - 1))];
  const updateActive = (key, value) => activeDraft && updateDraft(activeDraft.id, key, value);

  return (
    <div className="importer">
      {dragging && <div className="dropOverlay"><UploadCloud size={42} /><b>Drop files anywhere</b><span>Images, CSV, XLS, or XLSX</span></div>}
      <div className="importControls">
        <div className="segmented inline">
          {['AUTO', 'FTT', 'CFD'].map((name) => <button key={name} className={mode === name ? 'on' : ''} onClick={() => setMode(name)}>{name}</button>)}
        </div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,image/png,image/jpeg,image/webp" multiple onChange={(e) => handleFiles(e.target.files)} />
        <button className="uploadBtn" onClick={() => fileRef.current?.click()} disabled={busy}>
          <UploadCloud size={20} />
          {busy ? 'Processing' : 'Upload history'}
        </button>
      </div>
      <div className="uploadGrid">
        <button className="uploadTile" onClick={() => fileRef.current?.click()} disabled={busy}><FileSpreadsheet size={24} /><span>CSV / Excel</span></button>
        <button className="uploadTile" onClick={() => fileRef.current?.click()} disabled={busy}><ImageUp size={24} /><span>Screenshot</span></button>
      </div>
      {status && <p className="status">{status}</p>}
      {!!drafts.length && (
        <div className="importReview">
          <PanelTitle title="Review Import" tag={`${activeIndex + 1} of ${drafts.length}`} />
          <div className="reviewLayout">
            <div className="reviewQueue">
              {drafts.slice(0, 120).map((trade, index) => (
                <button key={trade.id} className={index === activeIndex ? 'queueItem active' : 'queueItem'} onClick={() => setActiveIndex(index)}>
                  <b>{trade.asset}</b>
                  <span>{trade.strategy} - {trade.emotion}</span>
                  <strong className={trade.profit >= 0 ? 'green' : 'red'}>{money(trade.profit)}</strong>
                </button>
              ))}
              {drafts.length > 120 && <p className="status">Showing first 120 in the queue. Save all includes every detected trade.</p>}
            </div>
            <div className="reviewEditor">
              {activeDraft && <TradeFormFields draft={activeDraft} set={updateActive} />}
              <div className="reviewNav">
                <button className="soft" onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}>Previous</button>
                <button className="soft" onClick={() => setActiveIndex((i) => Math.min(drafts.length - 1, i + 1))}>Next</button>
              </div>
            </div>
          </div>
          <div className="modalActions importActions">
            <div className="reviewSecondary"><button className="soft dangerText" onClick={skipAll}><X size={16} />Skip all</button><button className="soft" onClick={logLater}><StickyNote size={16} />Log later</button></div>
            <button className="primary" onClick={saveDrafts}><Check size={18} />Save all reviewed trades</button>
          </div>
        </div>
      )}
    </div>
  );
}

function History({ trades, deleteTrade, onOpenTrade, onEditTrade }) {
  const [sort, setSort] = useState('newest');
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = useResponsivePageSize();
  const sorted = useMemo(() => [...trades].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.openedAt) - new Date(b.openedAt);
    if (sort === 'profit') return b.profit - a.profit;
    if (sort === 'loss') return a.profit - b.profit;
    if (sort === 'asset') return a.asset.localeCompare(b.asset);
    return new Date(b.openedAt) - new Date(a.openedAt);
  }), [trades, sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const visible = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const exportCsv = () => {
    const headers = ['market', 'sourceId', 'asset', 'direction', 'amount', 'income', 'payout', 'profit', 'open', 'close', 'openedAt', 'closedAt', 'closeReason'];
    const rows = trades.map((trade) => headers.map((key) => csvCell(trade[key])).join(','));
    downloadText([headers.join(','), ...rows].join('\n'), 'tcxjournal-trades.csv', 'text/csv');
  };
  return (
    <section className="page">
      <div className="toolbar">
        <label className="sortControl"><span>Sort</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPageIndex(0); }}><option value="newest">Latest first</option><option value="oldest">Oldest first</option><option value="profit">Highest profit</option><option value="loss">Largest loss</option><option value="asset">Asset A-Z</option></select></label>
        <button className="soft" onClick={exportCsv}><Download size={17} />Export CSV</button>
      </div>
      <TradeList trades={visible} deleteTrade={deleteTrade} onOpenTrade={onOpenTrade} onEditTrade={onEditTrade} />
      <Pagination page={safePage} pages={pageCount} total={sorted.length} pageSize={pageSize} onChange={setPageIndex} />
    </section>
  );
}

function Pagination({ page, pages, total, pageSize, onChange }) {
  if (pages <= 1) return null;
  return <div className="pagination"><span>{page * pageSize + 1}-{Math.min(total, (page + 1) * pageSize)} of {total}</span><button className="soft" disabled={!page} onClick={() => onChange(page - 1)}><ChevronLeft size={16} />Previous</button><b>{page + 1} / {pages}</b><button className="soft" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>Next<ChevronRight size={16} /></button></div>;
}

function useResponsivePageSize() {
  const calculate = () => window.innerHeight >= 980 ? 20 : window.innerHeight >= 760 ? 15 : 10;
  const [size, setSize] = useState(calculate);
  useEffect(() => {
    const resize = () => setSize(calculate());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return size;
}

function Analytics({ trades, transactions = [] }) {
  const [period, setPeriod] = useState('all');
  const [venue, setVenue] = useState('all');
  const [assetClass, setAssetClass] = useState('all');
  const [edge, setEdge] = useState('asset');
  const filtered = useMemo(() => trades.filter((trade) => {
    const after = periodStart(period);
    if (after && new Date(trade.openedAt) < after) return false;
    if (venue === 'otc' && !/\(OTC\)/i.test(trade.asset)) return false;
    if (venue === 'real' && /\(OTC\)/i.test(trade.asset)) return false;
    if (assetClass !== 'all' && classifyAsset(trade.asset) !== assetClass) return false;
    return true;
  }), [trades, period, venue, assetClass]);
  const rowsFor = (key) => Object.entries(filtered.reduce((acc, trade) => {
    const label = key === 'venue' ? (/\(OTC\)/i.test(trade.asset) ? 'OTC' : 'Real market') : key === 'assetClass' ? title(classifyAsset(trade.asset)) : trade[key] || 'Unknown';
    acc[label] = (acc[label] || 0) + toNumber(trade.profit);
    return acc;
  }, {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const edgeRows = rowsFor(edge);
  const streaks = longestStreaks(filtered);
  const cycles = buildFundingCycles(transactions, trades);
  const activeCycle = cycles[cycles.length - 1];
  const settledTransactions = transactions.filter(isSettledTransaction);
  const hypothetical = sum(settledTransactions.filter((item) => item.type === 'DEPOSIT'), 'amount') - sum(settledTransactions.filter((item) => item.type === 'WITHDRAWAL'), 'amount') + sum(trades, 'profit');
  return (
    <section className="page analyticsPage">
      <div className="analyticsControls card"><div><b>Time</b><select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="all">All time</option><option value="day">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option></select></div><div><b>Venue</b><select value={venue} onChange={(e) => setVenue(e.target.value)}><option value="all">OTC + real</option><option value="otc">OTC only</option><option value="real">Real market</option></select></div><div><b>Asset class</b><select value={assetClass} onChange={(e) => setAssetClass(e.target.value)}><option value="all">All assets</option><option value="currency">Currency pairs</option><option value="crypto">Crypto</option><option value="commodity">Commodities</option><option value="index">Indices / stocks</option></select></div><span>{filtered.length} matching trades</span></div>
      <Stats trades={filtered} />
      <div className="analyticsGrid">
        <EquityPanel trades={filtered} />
        <OutcomePanel trades={filtered} />
        <div className="card insightCard">
          <PanelTitle title="Edge Map" tag="Selectable" />
          <select className="edgeSelect" value={edge} onChange={(event) => setEdge(event.target.value)}><option value="asset">Asset</option><option value="strategy">Strategy</option><option value="emotion">Emotion</option><option value="session">Session</option><option value="venue">OTC vs real</option><option value="assetClass">Asset class</option><option value="direction">Direction</option></select>
          <MiniRank title={title(edge)} rows={edgeRows.slice(0, 10)} />
        </div>
        <div className="card insightCard">
          <PanelTitle title="Momentum" tag="Streaks" />
          <div className="detailGrid">
            <Info label="Best streak" value={`${streaks.wins} wins`} />
            <Info label="Worst streak" value={`${streaks.losses} losses`} />
            <Info label="Current run" value={`${streaks.current.count} ${streaks.current.type.toLowerCase()}`} />
            <Info label="Filtered P&L" value={money(sum(filtered, 'profit'))} />
          </div>
        </div>
        <div className="card fundingCard">
          <PanelTitle title="Funding & Recovery" tag={`${cycles.length} cycle${cycles.length === 1 ? '' : 's'}`} />
          <div className="detailGrid"><Info label="Hypothetical balance" value={money(hypothetical)} /><Info label="Latest cycle P&L" value={money(activeCycle?.tradePnl || 0)} /><Info label="Recovery window" value={activeCycle ? durationHuman(activeCycle.startedAt, activeCycle.endedAt || new Date()) : '-'} /><Info label="Capital added" value={money(activeCycle?.deposits || 0)} /></div>
          <p className="mutedCopy">A cycle starts at a deposit and closes at the next withdrawal. Trades inside that window show how efficiently added capital recovered.</p>
        </div>
        <StrategyPanel trades={filtered} />
      </div>
    </section>
  );
}

function TransactionsPage({ transactions, trades, onImport, settings }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = useResponsivePageSize();
  const inputRef = useRef();
  const pages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = transactions.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const cycles = buildFundingCycles(transactions, trades);

  const handleFiles = async (fileList) => {
    const files = [...(fileList || [])].filter((file) => file.type.startsWith('image/'));
    if (!files.length) { setStatus('Drop PNG, JPG, or WEBP transaction screenshots.'); return; }
    setBusy(true);
    setStatus('Reading transaction screenshots...');
    try {
      const detected = [];
      for (const file of files) {
        const fingerprint = await hashFile(file);
        if (transactions.some((item) => item.fingerprint === fingerprint)) continue;
        const text = await readImageText(file, settings.ocrMode || 'AUTO', setStatus);
        detected.push(...parseTransactionText(text, fingerprint));
      }
      if (!detected.length) throw new Error('no-transactions');
      const result = onImport(detected);
      setStatus(`${result.added} transaction(s) saved. ${result.skipped} duplicate(s) ignored.${result.limited ? ` ${result.limited} over the account limit.` : ''}`);
    } catch {
      setStatus('No deposit or withdrawal rows were detected. Use a clear full-page transaction history screenshot.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return <section className="page transactionsPage">
    <div className="card transactionHero"><div><span className="miniCaps">Capital timeline</span><h2>Transactions</h2><p>Import Exness, Quotex, or similar deposit and withdrawal screenshots. Only extracted text records and a duplicate fingerprint are stored.</p></div><label className="transactionDrop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => handleFiles(e.target.files)} /><UploadCloud size={26} /><b>{busy ? 'Processing...' : 'Drop screenshots or browse'}</b><span>Duplicate and old rows are ignored</span></label></div>
    {status && <p className="status card">{status}</p>}
    <div className="transactionStats"><Info label="Deposited" value={money(sum(transactions.filter((item) => item.type === 'DEPOSIT' && isSettledTransaction(item)), 'amount'))} /><Info label="Withdrawn" value={money(sum(transactions.filter((item) => item.type === 'WITHDRAWAL' && isSettledTransaction(item)), 'amount'))} /><Info label="Funding cycles" value={cycles.length} /><Info label="Trade P&L" value={money(sum(trades, 'profit'))} /></div>
    <div className="card transactionList"><PanelTitle title="Transaction History" tag={`${transactions.length} records`} />{visible.map((item) => <div className="transactionRow" key={item.id}><span className={item.type === 'DEPOSIT' ? 'transactionIcon deposit' : 'transactionIcon withdrawal'}>{item.type === 'DEPOSIT' ? '+' : '-'}</span><div><b>{title(item.type)}</b><small>{new Date(item.occurredAt).toLocaleString()} - {item.provider}{item.sourceId ? ` - ${item.sourceId}` : ''}</small></div><span className="transactionStatus">{item.status}</span><strong className={item.type === 'DEPOSIT' ? 'green' : 'red'}>{item.type === 'DEPOSIT' ? '+' : '-'}{money(item.amount)}</strong></div>)}{!visible.length && <div className="empty">No transactions imported yet.</div>}</div>
    <Pagination page={safePage} pages={pages} total={transactions.length} pageSize={pageSize} onChange={setPage} />
  </section>;
}

function SettingsPage({ settings, updateSettings, authState, openAccount, trades, transactions, onArchive }) {
  const toggle = (market) => updateSettings({ enabled: { ...settings.enabled, [market]: !settings.enabled[market] } });
  const [archiveStatus, setArchiveStatus] = useState('');
  const bytes = new Blob([JSON.stringify({ trades, transactions })]).size;
  const percent = Math.min(100, trades.length / settings.maxTrades * 100);
  return (
    <section className="page narrow">
      <div className="card settings">
        <PanelTitle title="Settings" tag={authState.user ? 'Cloud' : 'Local'} />
        <button className="accountSettings" onClick={openAccount}>
          <div className="accountIdentity">
            {authState.user?.photoURL
              ? <img src={authState.user.photoURL} alt="" referrerPolicy="no-referrer" />
              : <span className="accountGlyph"><LogIn size={18} /></span>}
            <div>
              <b>{authState.user ? authState.user.displayName || authState.user.email : 'Cloud account'}</b>
              <small>{accountStatusText(authState)}</small>
            </div>
          </div>
          <span className={`syncPill ${authState.status}`}>{authState.user ? authState.status : 'Sign in'}</span>
        </button>
        <div className="settingsRows">
          <label><span>Default view</span><select value={settings.defaultMarket} onChange={(e) => updateSettings({ defaultMarket: e.target.value })}><option>ALL</option><option>FTT</option><option>CFD</option></select></label>
          <label><span>OCR preference</span><select value={settings.ocrMode} onChange={(e) => updateSettings({ ocrMode: e.target.value })}><option>AUTO</option><option>FTT</option><option>CFD</option></select></label>
          <label><span>Archive trades older than</span><select value={settings.archiveAfterDays} onChange={(e) => updateSettings({ archiveAfterDays: Number(e.target.value) })}><option value="90">90 days</option><option value="180">6 months</option><option value="365">1 year</option><option value="730">2 years</option></select></label>
          <div className="toggleRow"><span>FTT journal</span><button className={settings.enabled.FTT ? 'toggle on' : 'toggle'} onClick={() => toggle('FTT')} /></div>
          <div className="toggleRow"><span>CFD journal</span><button className={settings.enabled.CFD ? 'toggle on' : 'toggle'} onClick={() => toggle('CFD')} /></div>
        </div>
        <div className="storageNote">
          <b>Storage</b>
          <span>{trades.length.toLocaleString()} / {settings.maxTrades.toLocaleString()} trades - {formatBytes(bytes)} compact data</span>
          <div className="storageMeter"><i style={{ width: `${percent}%` }} /></div>
          <span>{authState.user ? 'Private cloud sync is active. Screenshots are processed, then discarded to minimize storage.' : 'Browser storage is active. Sign in to add private cloud sync.'}</span>
          <button className="soft archiveButton" onClick={() => { const count = onArchive(); setArchiveStatus(count ? `${count} trades exported and removed.` : 'No trades are old enough to archive.'); }}><Download size={16} />Export & remove old trades</button>
          {archiveStatus && <span className="green">{archiveStatus}</span>}
        </div>
        <div className="securityNote"><ShieldCheck size={18} /><div><b>TCX Security</b><span>{authState.security === 'verified' ? 'Google identity verified server-side.' : 'Identity verification activates with cloud sign-in.'}</span></div></div>
      </div>
    </section>
  );
}

function AccountModal({ authState, onClose, onSignIn, onSignOut, onStartFresh }) {
  const configured = authState.configured;
  return (
    <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modalPanel accountModal">
        <button className="modalClose" onClick={onClose}><X size={19} /></button>
        <div className="securitySeal"><ShieldCheck size={25} /></div>
        <span className="miniCaps">TCX Security</span>
        <h2>{authState.user ? 'Your journal is protected' : 'Take your journal with you'}</h2>
        <p className="accountLead">{authState.user
          ? 'Your trades are stored under your private account and remain cached on this device for fast access.'
          : 'Sign in with Google to privately sync trades, settings, strategies, and reviews across your devices.'}</p>

        {authState.user ? (
          <>
            <div className="signedProfile">
              {authState.user.photoURL && <img src={authState.user.photoURL} alt="" referrerPolicy="no-referrer" />}
              <div><b>{authState.user.displayName}</b><span>{authState.user.email}</span></div>
              <span className={`syncPill ${authState.status}`}>{authState.status}</span>
            </div>
            <div className="securityChecks">
              <div><Check size={16} /><span>Private user-scoped storage</span></div>
              <div><Check size={16} /><span>Automatic local-to-cloud migration</span></div>
              <div className={authState.security === 'verified' ? '' : 'pending'}><ShieldCheck size={16} /><span>{authState.security === 'verified' ? 'TCX identity verified' : 'TCX verification pending'}</span></div>
            </div>
            {authState.error && <p className="accountError">{authState.error}</p>}
            <button className="soft accountAction" onClick={onSignOut}><LogOut size={17} />Sign out</button>
            <button className="emptyJournalAction" disabled={authState.loading} onClick={onStartFresh}><Trash2 size={16} />Start with an empty journal</button>
          </>
        ) : (
          <>
            <div className="securityChecks">
              <div><Check size={16} /><span>Free Google sign-in</span></div>
              <div><Check size={16} /><span>Free Firestore cloud sync</span></div>
              <div><ShieldCheck size={16} /><span>TCX Security token verification</span></div>
            </div>
            {!configured && <p className="setupNotice">Cloud access is installed and awaiting the Firebase project keys in Netlify.</p>}
            {authState.error && <p className="accountError">{authState.error}</p>}
            <button className="googleButton" disabled={!configured || authState.loading} onClick={onSignIn}>
              <span className="googleGlyph">G</span>{!configured ? 'Firebase setup required' : authState.loading ? 'Connecting...' : 'Continue with Google'}
            </button>
            <small className="privacyCopy">TCX Journal never receives your Google password.</small>
          </>
        )}
      </div>
    </div>
  );
}

function PanelTitle({ title, tag, action }) {
  return <div className="panelTitle"><h3>{title}</h3><div className="panelActions">{action}{tag && <button>{tag}<ChevronDown size={14} /></button>}</div></div>;
}

function Input({ label, value, onChange, type = 'text' }) {
  return <label className="field"><span>{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function AssetSelect({ value, onChange, market }) {
  const options = assetOptionsForMarket(market);
  const normalizedValue = normalizeAsset(value);
  const allOptions = options.includes(normalizedValue) || !normalizedValue ? options : [normalizedValue, ...options];
  const selectValue = normalizedValue || allOptions[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);
  const needle = query.trim().toLowerCase();
  const visibleOptions = allOptions
    .filter((option) => !needle || option.toLowerCase().replace(/[^a-z0-9]+/g, '').includes(needle.replace(/[^a-z0-9]+/g, '')) || option.toLowerCase().includes(needle))
    .slice(0, 60);

  useEffect(() => {
    const close = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const pick = (asset) => {
    onChange(asset);
    setQuery('');
    setOpen(false);
  };

  return (
    <label className="field assetSelect" ref={boxRef}>
      <span>Asset</span>
      <div className="assetCombobox">
        <input
          aria-label="Search asset"
          value={open ? query : selectValue}
          placeholder={selectValue}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && visibleOptions[0]) {
              event.preventDefault();
              pick(visibleOptions[0]);
            }
            if (event.key === 'Escape') setOpen(false);
          }}
        />
        <ChevronDown size={16} />
        {open && (
          <div className="assetMenu">
            {visibleOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={option === selectValue ? 'assetOption selected' : 'assetOption'}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
              >
                {option}
              </button>
            ))}
            {!visibleOptions.length && <p>No asset found</p>}
          </div>
        )}
      </div>
    </label>
  );
}

function TradeEditorModal({ trade, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => ({ ...makeTrade(trade), openedAt: inputDateTime(trade.openedAt), closedAt: inputDateTime(trade.closedAt) }));
  const set = (key, value) => setDraft((current) => {
    const next = { ...current, [key]: value };
    if (key === 'openedAt') next.session = inferForexSession(value);
    if (key === 'result') next.income = '';
    return next;
  });
  return (
    <Modal onClose={onClose} className="tradeModal">
      <div className="modalHead">
        <div>
          <span className="miniCaps">{draft.market} trade</span>
          <h2>{trade.id === draft.id ? 'Edit Trade' : 'Trade'}</h2>
        </div>
        <button className="iconBtn" onClick={onClose}><X size={16} /></button>
      </div>
      <TradeFormFields draft={draft} set={set} />
      <div className="modalActions">
        <button className="soft dangerText" onClick={onDelete}><Trash2 size={16} />Delete</button>
        <button className="primary" onClick={() => onSave(makeTrade(draft))}><Check size={17} />Save changes</button>
      </div>
    </Modal>
  );
}

function TradeDetailModal({ trade, onClose, onEdit, onDelete }) {
  return (
    <Modal onClose={onClose} className="tradeModal detailModal">
      <div className="modalHead">
        <div>
          <span className="miniCaps">{trade.market} - {trade.session}</span>
          <h2>{trade.asset}</h2>
        </div>
        <button className="iconBtn" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="detailHero">
        <div>
          <span className={['UP', 'BUY'].includes(trade.direction) ? 'green' : 'red'}>{trade.direction}</span>
          <b className={trade.profit >= 0 ? 'green' : 'red'}>{money(trade.profit)}</b>
        </div>
        <div className="chipLine"><i>{trade.strategy}</i><i>{trade.emotion}</i><i>{trade.duration || 'Timed trade'}</i></div>
      </div>
      <div className="detailGrid">
        <Info label="Open time" value={`${shortDate(trade.openedAt)} ${timeOnly(trade.openedAt)}`} />
        <Info label="Close time" value={`${shortDate(trade.closedAt)} ${timeOnly(trade.closedAt)}`} />
        <Info label="Open price" value={trade.open || '-'} />
        <Info label="Close price" value={trade.close || '-'} />
        <Info label={trade.market === 'FTT' ? 'Stake' : 'Lot'} value={trade.amount} />
        <Info label="Result" value={OUTCOME_LABELS[trade.result] || trade.result} />
        <Info label="Payout" value={trade.market === 'FTT' ? `${trade.payout || 90}%` : trade.closeReason || '-'} />
        {!!trade.notes && <Info label="Notes" value={trade.notes} wide />}
      </div>
      <div className="modalActions">
        <button className="soft dangerText" onClick={onDelete}><Trash2 size={16} />Delete</button>
        <button className="primary" onClick={onEdit}><Edit3 size={17} />Edit trade</button>
      </div>
    </Modal>
  );
}

function DayTradesModal({ date, trades, onClose, onOpenTrade }) {
  const [expandedGroup, setExpandedGroup] = useState('');
  const groups = useMemo(() => groupTradesForJournal(trades), [trades]);
  return (
    <Modal onClose={onClose} className="dayModal">
      <div className="modalHead">
        <div>
          <span className="miniCaps">Calendar trades</span>
          <h2>{formatDate(date)}</h2>
        </div>
        <button className="iconBtn" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="daySummary">
        <Info label="Trades" value={trades.length} />
        <Info label="P&L" value={money(sum(trades, 'profit'))} />
        <Info label="Win rate" value={`${winRate(trades).toFixed(1)}%`} />
      </div>
      <div className="modalTradeStack">
        {groups.map((group) => (
          <React.Fragment key={group.id}>
            <button className="miniTrade" onClick={() => group.trades.length > 1 ? setExpandedGroup((current) => current === group.id ? '' : group.id) : onOpenTrade(group.summary)}>
              <b>{group.summary.asset}{group.trades.length > 1 && <small>{group.trades.length} entries</small>}</b>
              <span>{group.summary.strategy} - {group.summary.emotion}</span>
              <strong className={group.summary.profit >= 0 ? 'green' : 'red'}>{money(group.summary.profit)}</strong>
            </button>
            {group.trades.length > 1 && expandedGroup === group.id && (
              <div className="miniGroupEntries">
                {group.trades.map((trade) => (
                  <button key={trade.id} className="miniTrade" onClick={() => onOpenTrade(trade)}>
                    <b>{timeOnly(trade.openedAt)}</b><span>{money(trade.amount)} stake</span><strong className={trade.profit >= 0 ? 'green' : 'red'}>{money(trade.profit)}</strong>
                  </button>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
        {!trades.length && <p className="empty">No trades on this day.</p>}
      </div>
    </Modal>
  );
}

function TradeFormFields({ draft, set }) {
  const isFtt = draft.market === 'FTT';
  const previewTrade = makeTrade(draft);
  return (
    <div className="form">
      <div className="directionChooser">
        <span>Direction</span>
        <div className="twoBtns">
          <button className={['UP', 'BUY'].includes(draft.direction) ? 'selected up' : ''} onClick={() => set('direction', isFtt ? 'UP' : 'BUY')}>
            Buy
          </button>
          <button className={['DOWN', 'SELL'].includes(draft.direction) ? 'selected dn' : ''} onClick={() => set('direction', isFtt ? 'DOWN' : 'SELL')}>
            Sell
          </button>
        </div>
      </div>
      <OutcomeChooser draft={draft} set={set} />
      <div className="pnlPreview">
        <span>Calculated P&L</span>
        <b className={previewTrade.profit >= 0 ? 'green' : 'red'}>{money(previewTrade.profit)}</b>
      </div>
      <div className="fields">
        <AssetSelect value={draft.asset} market={draft.market} onChange={(v) => set('asset', v)} />
        <Input label="Open time" type="datetime-local" value={inputDateTime(draft.openedAt)} onChange={(v) => set('openedAt', v)} />
        <Input label="Close time" type="datetime-local" value={inputDateTime(draft.closedAt)} onChange={(v) => set('closedAt', v)} />
        <Input label={isFtt ? 'Amount ($)' : 'Lot'} type="number" value={draft.amount} onChange={(v) => set('amount', v)} />
        {isFtt ? (
          <Input label="Payout %" type="number" value={draft.payout} onChange={(v) => set('payout', v)} />
        ) : (
          <Input label="P/L" type="number" value={draft.profit} onChange={(v) => set('profit', v)} />
        )}
        <Input label="Entry price" value={draft.open} onChange={(v) => set('open', v)} />
        <Input label="Exit price" value={draft.close} onChange={(v) => set('close', v)} />
        <Select label="Strategy" value={draft.strategy} onChange={(v) => set('strategy', v)} options={STRATEGIES} />
        <Select label="Timeframe" value={draft.duration || '1m'} onChange={(v) => set('duration', v)} options={TIMEFRAMES.includes(draft.duration) || !draft.duration ? TIMEFRAMES : [draft.duration, ...TIMEFRAMES]} />
        <Select label="Session" value={normalizeSession(draft.session, draft.openedAt)} onChange={(v) => set('session', v)} options={SESSION_OPTIONS} />
        <Select label="Emotion" value={draft.emotion || 'Neutral'} onChange={(v) => set('emotion', v)} options={EMOTIONS} />
      </div>
      <label className="area"><span>Notes</span><textarea value={draft.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>
    </div>
  );
}

function OutcomeChooser({ draft, set }) {
  const trade = makeTrade(draft);
  const choose = (result) => {
    if (draft.market === 'FTT') {
      set('result', result);
      return;
    }
    const size = Math.abs(toNumber(draft.profit)) || 1;
    set('profit', result === 'WIN' ? size : result === 'LOSS' ? -size : 0);
  };
  return (
    <div className="outcomeChooser">
      <span>Result</span>
      <div className="threeBtns">
        {['WIN', 'LOSS', 'DRAW'].map((result) => (
          <button
            key={result}
            className={trade.result === result ? `selected ${result.toLowerCase()}` : ''}
            onClick={() => choose(result)}
          >
            {OUTCOME_LABELS[result]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Modal({ children, onClose, className = '' }) {
  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className={`modalPanel ${className}`} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Info({ label, value, wide = false }) {
  return <div className={wide ? 'info wideInfo' : 'info'}><span>{label}</span><b>{value}</b></div>;
}

async function parseSheetFile(file) {
  let workbook;
  try {
    workbook = file.name.toLowerCase().endsWith('.csv') ? parseCsv(await file.text()) : await readXlsxFile(file);
  } catch (error) {
    throw new Error(`sheet-read:${error.message}`);
  }
  const matrices = Array.isArray(workbook) && workbook[0]?.data ? workbook.map((sheet) => sheet.data) : [workbook];
  const rows = matrices.flatMap((matrix) => rowsFromMatrix(matrix));
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]).map(normalizeHeader);
  const isFtt = keys.some((key) => ['info', 'asset', 'instrument'].includes(key)) && keys.some((key) => ['income', 'payout', 'return'].includes(key));
  const isCfd = keys.some((key) => ['ticket', 'position_id', 'position'].includes(key)) && keys.includes('profit');
  if (!isFtt && !isCfd) throw new Error('no-trades');
  return rows.map((row) => isFtt ? mapFttRow(row) : mapCfdRow(row)).filter(Boolean);
}

function mapFttRow(row) {
  const get = getter(row);
  const amount = toNumber(get('Amount'));
  const income = toNumber(get('Income'));
  return makeTrade({
    market: 'FTT',
    sourceId: get('ID', 'Trade ID', 'Order ID'),
    account: 'Quotex',
    asset: get('Info', 'Asset', 'Instrument', 'Symbol'),
    direction: get('Type', 'Direction'),
    amount,
    income: get('Income', 'Return', 'Result amount'),
    payout: get('Profit', 'Payout', 'Payout percent'),
    open: get('Open Price'),
    close: get('Close Price'),
    openedAt: get('Open time', 'Opening time', 'Opened at', 'Date and time'),
    closedAt: get('Close Time', 'Closing time', 'Closed at', 'Expiry time'),
    duration: get('Duration', 'Timeframe', 'Trade timeframe'),
    strategy: 'Unclassified',
  });
}

function mapCfdRow(row) {
  const get = getter(row);
  return makeTrade({
    market: 'CFD',
    sourceId: get('ticket', 'position_id', 'position'),
    account: 'CFD',
    asset: slashSymbol(get('symbol')),
    direction: get('type'),
    amount: get('lots') || get('original_position_size'),
    open: get('opening_price'),
    close: get('closing_price'),
    openedAt: toIso(get('opening_time_utc', 'open_time', 'opening_time', 'opened_at'), 'utc'),
    closedAt: toIso(get('closing_time_utc', 'close_time', 'closing_time', 'closed_at'), 'utc'),
    duration: get('duration', 'timeframe'),
    profit: get('profit'),
    closeReason: get('close_reason'),
    commission: get('commission'),
    swap: get('swap'),
    equity: get('equity'),
    strategy: 'Unclassified',
  });
}

async function readImageText(file, mode, setStatus) {
  if (mode === 'AUTO') {
    try {
      const cloud = await callCloudOcr(file);
      if (cloud) return cloud;
    } catch {
      setStatus('Cloud OCR unavailable. Running browser OCR...');
    }
  }
  const result = await recognize(file, 'eng', {
    logger: (m) => {
      if (m.status && m.progress) setStatus(`${m.status} ${Math.round(m.progress * 100)}%`);
    },
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core.wasm.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  });
  return result.data.text;
}

async function callCloudOcr(file) {
  const base64 = await fileToBase64(file);
  const response = await fetch('/.netlify/functions/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mimeType: file.type, fileName: file.name }),
  });
  if (!response.ok) return '';
  const data = await response.json();
  return data.text || '';
}

function parseTradeText(text, forced = 'AUTO') {
  const cleanText = String(text || '').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map((line) => line.trim()).filter(Boolean);
  const trades = [];
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const ticket = /\b\d{8,12}\b/;

  if (forced !== 'CFD') {
    for (let i = 0; i < lines.length; i += 1) {
      const block = lines.slice(i, i + 8).join(' ');
      const asset = block.match(/[A-Z]{3}\/[A-Z]{3}(?:\s*\(OTC\))?|[A-Z]{3,5}\/?[A-Z]{3}/);
      const id = block.match(uuid);
      const pct = block.match(/(\d{2,3})\s*%/);
      const values = [...block.matchAll(/([+-]?\s*\d+(?:[.,]\d+)?)\s*\$/g)].map((m) => toNumber(m[1]));
      const prices = block.match(/\b\d{1,6}(?:\.\d{2,6})\b/g) || [];
      if ((asset || id) && values.length) {
        const amount = values[0];
        const income = values[values.length - 1];
        trades.push(makeTrade({
          market: 'FTT',
          sourceId: id?.[0],
          account: 'Quotex',
          asset: asset?.[0] || 'FTT trade',
          direction: /down|sell/i.test(block) ? 'DOWN' : 'UP',
          amount,
          income,
          payout: pct?.[1],
          open: prices[0],
          close: prices[1],
          openedAt: parseVisibleDate(block) || new Date().toISOString(),
          closedAt: parseVisibleDate(block) || new Date().toISOString(),
          strategy: 'Unclassified',
          notes: 'Imported from screenshot.',
        }));
        i += 4;
      }
    }
  }

  if (forced !== 'FTT') {
    for (let i = 0; i < lines.length; i += 1) {
      const block = lines.slice(i, i + 7).join(' ');
      const asset = block.match(/XAU\/USD|XAG\/USD|[A-Z]{3}\/[A-Z]{3}|BTCUSD|ETHUSD|NAS100|US30/i);
      const side = block.match(/\b(Buy|Sell)\b/i);
      const lot = block.match(/\b(?:Buy|Sell)\s+(\d+(?:\.\d+)?)\s*lot/i);
      const id = block.match(ticket);
      const pl = block.match(/([+-]\s*\d+(?:\.\d+)?)\s*(?:USD|\$)/i);
      const prices = block.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g) || [];
      if (asset && (side || id) && pl) {
        trades.push(makeTrade({
          market: 'CFD',
          sourceId: id?.[0],
          account: 'CFD',
          asset: asset[0],
          direction: side?.[1] || 'SELL',
          amount: lot?.[1] || 0,
          open: prices[0],
          close: prices[1],
          openedAt: parseVisibleDate(block) || new Date().toISOString(),
          closedAt: parseVisibleDate(block) || new Date().toISOString(),
          profit: pl[1],
          closeReason: /stop\s*out/i.test(block) ? 'Stop out' : /stop\s*loss/i.test(block) ? 'Stop loss' : '',
          strategy: 'Unclassified',
          notes: 'Imported from screenshot.',
        }));
        i += 4;
      }
    }
  }

  const seen = new Set();
  return trades.filter((trade) => {
    const key = uniqueKey(trade);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeStrategy(value) {
  const strategy = clean(value);
  if (!strategy || /^(imported|screenshot)$/i.test(strategy)) return 'Unclassified';
  return STRATEGIES.includes(strategy) ? strategy : strategy;
}

function assetOptionsForMarket(market) {
  return market === 'CFD' ? CFD_ASSETS : FTT_ASSETS;
}

function normalizeSession(value, dateValue) {
  const session = title(value);
  if (SESSION_OPTIONS.includes(session)) return session;
  return inferForexSession(dateValue);
}

function normalizeTradeResult(value) {
  const text = clean(value).toUpperCase();
  if (['WIN', 'PROFIT'].includes(text)) return 'WIN';
  if (['LOSS', 'LOSE'].includes(text)) return 'LOSS';
  if (['DRAW', 'REFUND', 'BREAKEVEN', 'BREAK EVEN'].includes(text)) return 'DRAW';
  return 'WIN';
}

function inferForexSession(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return inferForexSession(new Date());
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const london = isEuropeDst(date) ? [7, 16] : [8, 17];
  const ny = isUsDst(date) ? [12, 21] : [13, 22];
  const sydney = isAustraliaDst(date) ? [21, 6] : [22, 7];
  const sessions = [
    ['New York', ny],
    ['London', london],
    ['Tokyo', [0, 9]],
    ['Sydney', sydney],
  ];
  return sessions.find(([, range]) => inUtcWindow(hour, range[0], range[1]))?.[0] || 'New York';
}

function inUtcWindow(hour, start, end) {
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

function isEuropeDst(date) {
  const year = date.getUTCFullYear();
  return date >= lastSundayUtc(year, 2, 1) && date < lastSundayUtc(year, 9, 1);
}

function isUsDst(date) {
  const year = date.getUTCFullYear();
  return date >= nthSundayUtc(year, 2, 2, 7) && date < nthSundayUtc(year, 10, 1, 6);
}

function isAustraliaDst(date) {
  const year = date.getUTCFullYear();
  const start = firstSundayUtc(year, 9, 16);
  const end = firstSundayUtc(year + 1, 3, 16);
  const previousStart = firstSundayUtc(year - 1, 9, 16);
  const currentEnd = firstSundayUtc(year, 3, 16);
  return (date >= start && date < end) || (date >= previousStart && date < currentEnd);
}

function lastSundayUtc(year, month, hour = 0) {
  const date = new Date(Date.UTC(year, month + 1, 0, hour));
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date;
}

function firstSundayUtc(year, month, hour = 0) {
  return nthSundayUtc(year, month, 1, hour);
}

function nthSundayUtc(year, month, nth, hour = 0) {
  const date = new Date(Date.UTC(year, month, 1, hour));
  const offset = (7 - date.getUTCDay()) % 7;
  date.setUTCDate(1 + offset + (nth - 1) * 7);
  return date;
}

function normalizePayout(value, amount, income) {
  const explicit = parsePercent(value);
  if (explicit) return explicit;
  const stake = Math.abs(toNumber(amount));
  const resultAmount = Math.abs(toNumber(income));
  if (!stake || resultAmount <= stake) return 90;
  const calculated = ((resultAmount - stake) / stake) * 100;
  return Number.isFinite(calculated) && calculated > 0 ? Math.round(calculated) : 90;
}

function deriveFttIncome(amount, payout, result = 'WIN') {
  const stake = Math.abs(toNumber(amount));
  const pct = toNumber(payout) || 90;
  if (!stake) return 0;
  if (result === 'LOSS') return 0;
  if (result === 'DRAW') return stake;
  return round(stake + (stake * pct / 100));
}

function calculateFttNet(amount, income) {
  const stake = Math.abs(toNumber(amount));
  const resultAmount = toNumber(income);
  if (!stake && !resultAmount) return 0;
  if (!resultAmount) return -stake;
  return round(resultAmount - stake);
}

function uniqueKey(trade) {
  if (trade.sourceId) return `${trade.market}:${String(trade.sourceId).toLowerCase()}`;
  return [trade.market, trade.asset, trade.direction, dateKey(trade.openedAt), timeOnly(trade.openedAt), trade.amount, trade.duration, trade.profit].join('|').toLowerCase();
}

function groupTradesForJournal(trades) {
  const groups = new Map();
  trades.forEach((trade) => {
    const closeTime = secondKey(trade.closedAt);
    const key = closeTime
      ? [trade.account, trade.market, trade.asset, trade.direction, closeTime].map((value) => clean(value).toLowerCase()).join('|')
      : `single|${trade.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(trade);
  });
  return [...groups.entries()].map(([id, entries]) => ({
    id,
    trades: entries,
    summary: entries.length === 1 ? entries[0] : summarizeTradeGroup(id, entries),
  }));
}

function summarizeTradeGroup(id, trades) {
  const first = trades[0];
  const totalAmount = sum(trades, 'amount');
  const profit = sum(trades, 'profit');
  return {
    ...first,
    id: `group:${id}`,
    sourceId: '',
    amount: round(totalAmount),
    income: first.market === 'FTT' ? round(sum(trades, 'income')) : '',
    profit: round(profit),
    result: tradeResult(profit),
    open: weightedTradeValue(trades, 'open'),
    close: weightedTradeValue(trades, 'close'),
    payout: first.market === 'FTT' ? Math.round(weightedTradeValue(trades, 'payout')) : '',
    openedAt: [...trades].sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt))[0].openedAt,
    closedAt: [...trades].sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))[0].closedAt,
    duration: `${trades.length} entries`,
    strategy: commonTradeValue(trades, 'strategy', 'Mixed strategy'),
    emotion: commonTradeValue(trades, 'emotion', 'Mixed emotion'),
    session: commonTradeValue(trades, 'session', 'Mixed session'),
  };
}

function weightedTradeValue(trades, key) {
  const weighted = trades.reduce((total, trade) => total + toNumber(trade[key]) * Math.abs(toNumber(trade.amount)), 0);
  const weight = trades.reduce((total, trade) => total + Math.abs(toNumber(trade.amount)), 0);
  return round(weight ? weighted / weight : average(trades.map((trade) => trade[key])));
}

function commonTradeValue(trades, key, fallback) {
  const values = [...new Set(trades.map((trade) => trade[key]).filter(Boolean))];
  return values.length === 1 ? values[0] : fallback;
}

function secondKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 19);
}

function getter(row) {
  const entries = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});
  return (...names) => {
    for (const name of names) {
      const value = entries[normalizeHeader(name)];
      if (value !== undefined && value !== '') return value;
    }
    return '';
  };
}

function normalizeHeader(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function isSheet(file) {
  return /\.(csv|xls|xlsx)$/i.test(file.name);
}

function rowsFromMatrix(matrix) {
  const [header = [], ...body] = matrix.filter((row) => row.some((cell) => String(cell ?? '').trim()));
  const headers = header.map((cell) => String(cell ?? '').trim());
  return body.map((row) => headers.reduce((acc, key, index) => {
    if (key) acc[key] = row[index] ?? '';
    return acc;
  }, {}));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildMonthDays(base) {
  const date = new Date(base);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const days = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= last.getDate(); d += 1) days.push(new Date(date.getFullYear(), date.getMonth(), d));
  while (days.length % 7) days.push(null);
  return days;
}

function groupByDay(trades) {
  return trades.reduce((acc, trade) => {
    const key = dateKey(trade.openedAt);
    acc[key] = acc[key] || [];
    acc[key].push(trade);
    return acc;
  }, {});
}

function parseVisibleDate(text) {
  const iso = text.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/);
  if (iso) return toIso(iso[0]);
  const eu = text.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (eu) return `${eu[3]}-${eu[2]}-${eu[1]}T${eu[4]}:${eu[5]}:${eu[6] || '00'}`;
  return '';
}

function toIso(value, zone = 'local', fallback = new Date().toISOString()) {
  const date = parseTradeDate(value, zone);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  return fallback;
}

function transactionKey(item) {
  return item.sourceId ? `${item.provider}:${item.sourceId}`.toLowerCase() : [item.type, item.amount, item.currency, secondKey(item.occurredAt), item.fingerprint].join('|').toLowerCase();
}

async function hashFile(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseTransactionText(text, fingerprint = '') {
  const source = String(text || '')
    .replace(/\bo(?=\d)/gi, '0')
    .replace(/\b(\d{1,2})\s*u+n\b/gi, '$1 Jun')
    .replace(/([+-])5(?=\d{1,3}[,.])/g, '$1$')
    .replace(/\s+/g, ' ')
    .trim();
  const provider = /exness/i.test(source) ? 'Exness' : /quotex/i.test(source) ? 'Quotex' : 'Imported';
  const year = source.match(/\b20\d{2}\b/)?.[0] || String(new Date().getFullYear());
  const markers = [...source.matchAll(/\b(Deposit|Withdrawal|Payout)\b/gi)];
  const results = [];
  markers.forEach((marker, index) => {
    const start = Math.max(0, marker.index - 90);
    const end = markers[index + 1]?.index || Math.min(source.length, marker.index + 300);
    const block = source.slice(start, end);
    const beforeType = block.slice(0, marker.index - start);
    const amountMatches = [...block.matchAll(/([+-])\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})(?:\s*USD)?|\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})/gi)];
    const amount = amountMatches.at(-1);
    const date = parseTransactionDate(block, year);
    if (!amount || !date) return;
    const ids = [...block.matchAll(/\b\d{8,15}\b/g)].map((match) => match[0]);
    const leadingIds = [...beforeType.matchAll(/\b\d{8,15}\b/g)].map((match) => match[0]);
    const invoice = block.match(/Invoice\s*ID\s*(\d{8,15})/i)?.[1];
    const sourceId = invoice || leadingIds.at(-1) || ids[0] || '';
    const type = /with|payout/i.test(marker[1]) ? 'WITHDRAWAL' : 'DEPOSIT';
    results.push(makeTransaction({
      id: `${fingerprint.slice(0, 18)}-${index}-${sourceId || date.getTime()}`,
      sourceId,
      provider,
      type,
      amount: amount[2] || amount[3],
      occurredAt: date,
      status: block.match(/Succeeded|Successful|Done|Sent|Rejected|Cancelled/i)?.[0] || 'Succeeded',
      fingerprint,
    }));
  });
  return mergeTransactions(results);
}

function parseTransactionDate(text, fallbackYear) {
  const numeric = text.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})[, T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (numeric) return new Date(`${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}T${numeric[4].padStart(2, '0')}:${numeric[5]}:${numeric[6] || '00'}`);
  const named = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?[, ]+(?:(20\d{2})[, ]+)?(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
  if (!named) return null;
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(named[2].slice(0, 3).toLowerCase());
  return new Date(Number(named[3] || fallbackYear), month, Number(named[1]), Number(named[4]), Number(named[5]), Number(named[6] || 0));
}

function periodStart(period) {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') { const day = (now.getDay() + 6) % 7; return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day); }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

function filterTradesByPeriod(trades, period, anchorValue) {
  const anchor = new Date(anchorValue);
  let start;
  let end;
  if (period === 'day') { start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()); end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 1); }
  else if (period === 'week') { const day = (anchor.getDay() + 6) % 7; start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - day); end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7); }
  else if (period === 'year') { start = new Date(anchor.getFullYear(), 0, 1); end = new Date(anchor.getFullYear() + 1, 0, 1); }
  else { start = new Date(anchor.getFullYear(), anchor.getMonth(), 1); end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1); }
  return trades.filter((trade) => { const date = new Date(trade.openedAt); return date >= start && date < end; });
}

function periodLabel(period, anchorValue) {
  const rows = filterTradesByPeriod([{ openedAt: anchorValue }], period, anchorValue);
  if (period === 'day') return formatDate(dateKey(anchorValue));
  const date = new Date(anchorValue);
  if (period === 'year') return String(date.getFullYear());
  if (period === 'month') return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return rows.length ? `Week of ${formatDate(dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7))))}` : 'Selected week';
}

function classifyAsset(asset) {
  const value = String(asset).replace(/\s*\(OTC\)/i, '').toUpperCase();
  if (/BTC|ETH|LTC|XRP|BNB|SOL|BITCOIN|ETHEREUM|DOGE|CARDANO|RIPPLE|TONCOIN|POLKADOT|CHAINLINK/.test(value)) return 'crypto';
  if (/XAU|XAG|OIL|BRENT|NATGAS/.test(value)) return 'commodity';
  if (/^[A-Z]{3}\/[A-Z]{3}$/.test(value)) return 'currency';
  return 'index';
}

function longestStreaks(trades) {
  const ordered = [...trades].sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt));
  let wins = 0; let losses = 0; let runType = 'NONE'; let run = 0;
  ordered.forEach((trade) => {
    const type = trade.profit > 0 ? 'WIN' : trade.profit < 0 ? 'LOSS' : 'DRAW';
    if (type === runType) run += 1; else { runType = type; run = 1; }
    if (type === 'WIN') wins = Math.max(wins, run);
    if (type === 'LOSS') losses = Math.max(losses, run);
  });
  return { wins, losses, current: { type: runType, count: ordered.length ? run : 0 } };
}

function buildFundingCycles(transactions, trades) {
  const events = transactions.filter(isSettledTransaction).sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
  const cycles = [];
  let cycle = null;
  events.forEach((event) => {
    if (event.type === 'DEPOSIT') {
      if (!cycle) cycle = { startedAt: event.occurredAt, endedAt: '', deposits: 0, withdrawals: 0, tradePnl: 0 };
      cycle.deposits += event.amount;
    } else if (cycle) {
      cycle.withdrawals += event.amount;
      cycle.endedAt = event.occurredAt;
      cycle.tradePnl = sum(trades.filter((trade) => new Date(trade.openedAt) >= new Date(cycle.startedAt) && new Date(trade.openedAt) <= new Date(cycle.endedAt)), 'profit');
      cycles.push(cycle);
      cycle = null;
    }
  });
  if (cycle) {
    cycle.tradePnl = sum(trades.filter((trade) => new Date(trade.openedAt) >= new Date(cycle.startedAt)), 'profit');
    cycles.push(cycle);
  }
  return cycles;
}

function isSettledTransaction(item) {
  return !/reject|cancel|fail/i.test(item.status);
}

function durationHuman(start, end) {
  const hours = Math.max(0, new Date(end) - new Date(start)) / 3600000;
  if (hours < 48) return `${hours.toFixed(1)} hours`;
  return `${(hours / 24).toFixed(1)} days`;
}

function parseTradeDate(value, zone = 'local') {
  if (!value) return new Date(NaN);
  if (value instanceof Date) return value;
  if (typeof value === 'number' && value > 20000 && value < 100000) return new Date(Math.round((value - 25569) * 86400000));
  const text = String(value).trim();
  if (!text) return new Date(NaN);
  const locale = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (locale) {
    const iso = `${locale[3]}-${locale[2].padStart(2, '0')}-${locale[1].padStart(2, '0')}T${locale[4].padStart(2, '0')}:${locale[5]}:${locale[6] || '00'}`;
    return new Date(zone === 'utc' ? `${iso}Z` : iso);
  }
  const normalized = text.replace(' ', 'T');
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized)) return new Date(normalized);
  return new Date(zone === 'utc' ? `${normalized}Z` : normalized);
}

function inputDateTime(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function dateKey(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function timeOnly(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function durationBetween(start, end) {
  if (!start || !end) return '';
  const ms = new Date(end) - new Date(start);
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function clean(value) {
  return String(value || '').trim();
}

function cleanNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  return toNumber(value);
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? '').replace(/,/g, '').replace(/[^\d.+-]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function parsePercent(value) {
  const number = toNumber(value);
  return number > 0 ? Math.round(number) : 0;
}

function normalizeAsset(value) {
  const text = clean(value).replace(/([A-Z]{3})([A-Z]{3})$/, '$1/$2');
  return text || 'Unknown';
}

function slashSymbol(value) {
  const text = clean(value).toUpperCase();
  if (/^[A-Z]{6}$/.test(text)) return `${text.slice(0, 3)}/${text.slice(3)}`;
  return text;
}

function normalizeDirection(value) {
  const text = clean(value).toUpperCase();
  if (['UP', 'BUY', 'CALL'].includes(text)) return text === 'CALL' ? 'UP' : text;
  if (['DOWN', 'SELL', 'PUT'].includes(text)) return text === 'PUT' ? 'DOWN' : text;
  return text || 'UP';
}

function tradeResult(profit) {
  const value = toNumber(profit);
  if (value > 0) return 'WIN';
  if (value < 0) return 'LOSS';
  return 'DRAW';
}

function title(value) {
  return clean(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function round(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function money(value) {
  const number = toNumber(value);
  const sign = number < 0 ? '-' : '';
  return `${sign}$${Math.abs(number).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + toNumber(row[key]), 0);
}

function formatAmount(value) {
  return toNumber(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function average(values) {
  return values.length ? values.reduce((total, value) => total + toNumber(value), 0) / values.length : 0;
}

function winRate(trades) {
  return trades.length ? trades.filter((trade) => trade.result === 'WIN').length / trades.length * 100 : 0;
}

function accountStatusText(authState) {
  if (!authState.configured) return 'Cloud connection needs Firebase project keys';
  if (!authState.user) return 'Use Google to sync your journal privately';
  if (authState.status === 'syncing') return 'Saving your latest changes';
  if (authState.status === 'error') return authState.error || 'Cloud sync needs attention';
  if (authState.security === 'verified') return 'Synced and verified by TCX Security';
  return 'Private cloud journal connected';
}

function friendlyAuthError(error) {
  const code = String(error?.code || '');
  if (code.includes('popup-closed')) return 'Sign-in was closed before it finished.';
  if (code.includes('popup-blocked')) return 'Your browser blocked the sign-in window. Allow popups and try again.';
  if (code.includes('unauthorized-domain')) return 'This domain must be added to Firebase authorized domains.';
  if (code.includes('permission-denied')) return 'Firestore access was denied. Publish the included security rules.';
  if (code.includes('network')) return 'The cloud is unreachable right now. Your journal is still safe on this device.';
  return error?.message || 'Cloud sign-in could not be completed.';
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportTradesCsv(trades, filename = 'tcxjournal-trades.csv') {
  const headers = ['market', 'account', 'sourceId', 'asset', 'direction', 'amount', 'income', 'payout', 'profit', 'result', 'open', 'close', 'openedAt', 'closedAt', 'duration', 'strategy', 'session', 'emotion', 'closeReason', 'commission', 'swap', 'notes'];
  const rows = trades.map((trade) => headers.map((key) => csvCell(trade[key])).join(','));
  downloadText([headers.join(','), ...rows].join('\n'), filename, 'text/csv;charset=utf-8');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function downloadText(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const tooltipStyle = {
  background: '#0c121a',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 8,
  color: '#eef4ff',
};

createRoot(document.getElementById('root')).render(<App />);
