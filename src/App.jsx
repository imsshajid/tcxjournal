import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowUp,
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
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Sun,
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
import SignalGenerator from './SignalGenerator';
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
  maxTrades: 10000,
  archiveAfterDays: 365,
  theme: 'dark',
};
const IMPORT_LATER_KEY = 'tcxjournal.importLater.v1';
const LOCAL_TRADE_STORAGE_TARGET = 10000;
const CLOUD_TRADE_LIMIT = 10000;
const CLOUD_TRANSACTION_LIMIT = 1500;
const MAX_UPLOAD_BYTES = {
  image: 10 * 1024 * 1024,
  csv: 5 * 1024 * 1024,
  excel: 8 * 1024 * 1024,
};
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
    duration: market === 'FTT' ? input.duration || input.timeframe || durationBetween(input.openedAt || input.openingTime, input.closedAt || input.closingTime) : '',
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
      settings: normalizeSettings(parsed.settings),
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
    settings: normalizeSettings(journal?.settings),
  };
}

function normalizeSettings(settings = {}) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...settings,
    enabled: { ...DEFAULT_SETTINGS.enabled, ...(settings.enabled || {}) },
  };
  merged.maxTrades = Math.max(CLOUD_TRADE_LIMIT, toNumber(merged.maxTrades) || CLOUD_TRADE_LIMIT);
  return merged;
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
  const amountText = String(input.amount ?? '').trim();
  const signedAmount = toNumber(input.amount);
  const type = amountText.startsWith('-')
    ? 'WITHDRAWAL'
    : amountText.startsWith('+')
      ? 'DEPOSIT'
      : /with|payout/i.test(input.type)
        ? 'WITHDRAWAL'
        : 'DEPOSIT';
  return {
    id: input.id || input.sourceId || crypto.randomUUID(),
    sourceId: clean(input.sourceId || input.invoice || ''),
    provider: input.provider || 'Imported',
    account: input.account || '',
    type,
    amount: Math.abs(signedAmount),
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

function useScrollChrome() {
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let idleTimer;
    const hideScrollTopSoon = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setShowScrollTop(false), 1250);
    };
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;
      if (currentY < 64) {
        setBottomNavHidden(false);
        setShowScrollTop(false);
      } else if (delta > 5) {
        setBottomNavHidden(true);
        setShowScrollTop(true);
        hideScrollTopSoon();
      } else if (delta < -5) {
        setBottomNavHidden(false);
        setShowScrollTop(false);
      }
      lastY = Math.max(0, currentY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(idleTimer);
    };
  }, []);

  return {
    bottomNavHidden,
    showScrollTop,
    scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  };
}

function App() {
  const [data, setData] = useState(saved);
  const [page, setPage] = useState('Home');
  const [market, setMarket] = useState(data.settings.defaultMarket || 'ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [activeTrade, setActiveTrade] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);
  const [bulkEditGroup, setBulkEditGroup] = useState(null);
  const [dayPopup, setDayPopup] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const { bottomNavHidden, showScrollTop, scrollToTop } = useScrollChrome();
  const [authState, setAuthState] = useState({
    configured: cloudConfigured,
    loading: cloudConfigured,
    user: null,
    status: cloudConfigured ? 'connecting' : 'setup',
    security: null,
    securitySession: null,
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

  const hydrateCloudJournal = async (user) => {
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
    return merged;
  };

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
          securitySession: null,
          error: '',
          hydrated: false,
        }));
        return;
      }

      setAuthState((current) => ({ ...current, loading: true, user, status: 'verify', security: 'checking', securitySession: null, error: '', hydrated: false }));
      try {
        const cloud = await getCloud();
        const securitySession = await cloud.getTcxSecuritySession().catch(() => null);
        if (!securitySession) {
          if (!disposed) setAuthState((current) => ({
            ...current,
            loading: false,
            user,
            status: 'verify',
            security: 'pending',
            securitySession: null,
            error: '',
            hydrated: false,
          }));
          return;
        }

        await hydrateCloudJournal(user);
        await cloud.verifyWithTcxSecurity(user).catch(() => null);
        if (!disposed) setAuthState((current) => ({ ...current, loading: false, user, status: 'synced', security: 'verified', securitySession, error: '', hydrated: true }));
      } catch (error) {
        if (!disposed) setAuthState((current) => ({
          ...current,
          loading: false,
          user,
          status: 'error',
          security: 'pending',
          securitySession: null,
          error: friendlyAuthError(error),
          hydrated: false,
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

  const verifyTcxSecurity = async (credentials) => {
    const user = userRef.current;
    if (!user) {
      await signIn();
      return;
    }
    setAuthState((current) => ({ ...current, loading: true, status: 'verify', security: 'checking', error: '' }));
    try {
      const cloud = await getCloud();
      await cloud.loginWithTcxSecurity(credentials);
      const securitySession = await cloud.getTcxSecuritySession();
      if (!securitySession) throw new Error('TCX Security session was not created.');
      await hydrateCloudJournal(user);
      await cloud.verifyWithTcxSecurity(user).catch(() => null);
      setAuthState((current) => ({
        ...current,
        loading: false,
        user,
        status: 'synced',
        security: 'verified',
        securitySession,
        error: '',
        hydrated: true,
      }));
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        loading: false,
        status: 'verify',
        security: 'pending',
        securitySession: null,
        error: friendlySecurityError(error),
        hydrated: false,
      }));
    }
  };

  const signOut = async () => {
    setAccountOpen(false);
    const cloud = await getCloud();
    await cloud.logoutTcxSecurity();
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
  const theme = data.settings.theme === 'light' ? 'light' : 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

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
    const cloudTradeLimit = data.settings.maxTrades || CLOUD_TRADE_LIMIT;
    const cloudLimited = Boolean(authState.user);
    const remaining = cloudLimited ? Math.max(0, cloudTradeLimit - data.trades.length) : fresh.length;
    const accepted = cloudLimited ? fresh.slice(0, remaining) : fresh;
    if (accepted.length) {
      setData((current) => ({ ...current, trades: [...accepted, ...current.trades] }));
      syncCloud((uid, cloud) => cloud.saveCloudTrades(uid, accepted));
    }
    return { added: accepted.length, skipped: normalized.length - fresh.length, limited: cloudLimited ? fresh.length - accepted.length : 0, detected: normalized.length };
  };

  const importTransactions = (items) => {
    const normalized = mergeTransactions(items);
    const incomingFingerprints = new Set(normalized.map((item) => item.fingerprint).filter(Boolean));
    const replacedIds = data.transactions.filter((item) => incomingFingerprints.has(item.fingerprint)).map((item) => item.id);
    const retained = data.transactions.filter((item) => !incomingFingerprints.has(item.fingerprint));
    const existing = new Set(retained.map(transactionKey));
    const fresh = normalized.filter((item) => !existing.has(transactionKey(item)));
    const cloudLimited = Boolean(authState.user);
    const accepted = cloudLimited ? fresh.slice(0, Math.max(0, CLOUD_TRANSACTION_LIMIT - retained.length)) : fresh;
    if (accepted.length || replacedIds.length) {
      setData((current) => ({
        ...current,
        transactions: mergeTransactions(accepted, current.transactions.filter((item) => !incomingFingerprints.has(item.fingerprint))),
      }));
      if (replacedIds.length) syncCloud((uid, cloud) => cloud.deleteCloudTransactions?.(uid, replacedIds));
      syncCloud((uid, cloud) => cloud.saveCloudTransactions(uid, accepted));
    }
    return { added: accepted.length, skipped: normalized.length - fresh.length, limited: cloudLimited ? fresh.length - accepted.length : 0 };
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
  const updateTradeGroup = (ids, patch) => {
    const idSet = new Set(ids);
    const updated = dataRef.current.trades
      .filter((item) => idSet.has(item.id))
      .map((item) => makeTrade({ ...item, ...patch }));
    const updatedById = new Map(updated.map((trade) => [trade.id, trade]));
    setData((current) => ({
      ...current,
      trades: current.trades.map((item) => updatedById.get(item.id) || item),
    }));
    if (updated.length) syncCloud((uid, cloud) => cloud.saveCloudTrades(uid, updated));
    setBulkEditGroup(null);
  };
  const removeTrade = (id) => {
    deleteTrade(id);
    setActiveTrade(null);
    setEditingTrade(null);
  };
  const updateSettings = (settings) => {
    const nextSettings = normalizeSettings({ ...dataRef.current.settings, ...settings });
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

  const accessGranted = Boolean(authState.user && authState.hydrated && authState.security === 'verified');
  if (!accessGranted) {
    return (
      <div className="authOnly" data-theme={theme}>
        <AuthGate
          authState={authState}
          onGoogleSignIn={signIn}
          onTcxSecuritySubmit={verifyTcxSecurity}
          onSignOut={signOut}
        />
      </div>
    );
  }

  return (
    <div className="app" data-theme={theme}>
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
          theme={theme}
          onThemeChange={(nextTheme) => updateSettings({ theme: nextTheme })}
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
            onEditGroup={setBulkEditGroup}
          />
        )}
        {page === 'New Trade' && <NewTrade onSave={saveTrade} onImport={importTrades} settings={data.settings} onOpenTrade={setActiveTrade} />}
        {page === 'History' && <History trades={trades} deleteTrade={removeTrade} onOpenTrade={setActiveTrade} onEditTrade={setEditingTrade} onEditGroup={setBulkEditGroup} />}
        {page === 'Analytics' && <Analytics trades={trades} transactions={data.transactions} />}
        {page === 'Signals' && <SignalGenerator />}
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
            onEditGroup={setBulkEditGroup}
          />
        )}
        {page === 'Settings' && <SettingsPage settings={data.settings} updateSettings={updateSettings} authState={authState} openAccount={() => setAccountOpen(true)} trades={data.trades} transactions={data.transactions} onArchive={archiveOldTrades} theme={theme} />}
      </main>
      <BottomNav page={page} setPage={setPage} hidden={bottomNavHidden} />
      <button className={showScrollTop ? 'scrollTop show' : 'scrollTop'} onClick={scrollToTop} aria-label="Scroll to top">
        <ArrowUp size={18} />
      </button>
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
      {bulkEditGroup && (
        <TradeGroupEditorModal
          group={bulkEditGroup}
          onClose={() => setBulkEditGroup(null)}
          onSave={updateTradeGroup}
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
          onEditGroup={setBulkEditGroup}
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
    ['Signals', Sparkles],
    ['Calendar', CalendarDays],
    ['Transactions', WalletCards],
    ['Settings', Settings],
  ];
  return (
    <aside className={open ? 'sidebar show' : 'sidebar'}>
      <div className="brand">
        <img className="brandLogo" src="/tcx-logo.svg" alt="Trading Candle X Journal logo" />
        <div><b>TCX Journal</b><span>Trading Candle X</span></div>
        <button className="closeNav" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button>
      </div>
      <nav>
        {nav.map(([name, Icon]) => (
          <button
            key={name}
            className={page === name ? 'active' : ''}
            aria-label={name}
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

function Topbar({ page, market, setMarket, settings, setPage, openNav, authState, openAccount, theme, onThemeChange }) {
  const options = ['ALL', 'FTT', 'CFD'].filter((m) => m === 'ALL' || settings.enabled[m]);
  const lightMode = theme === 'light';
  return (
    <header className="topbar">
      <button className="hamb" onClick={openNav} aria-label="Open navigation"><Menu size={20} /></button>
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
        <button
          className="themeButton"
          onClick={() => onThemeChange(lightMode ? 'dark' : 'light')}
          aria-label={lightMode ? 'Switch to night mode' : 'Switch to light mode'}
          title={lightMode ? 'Night mode' : 'Light mode'}
        >
          {lightMode ? <Moon size={17} /> : <Sun size={17} />}
        </button>
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

function BottomNav({ page, setPage, hidden }) {
  const nav = [
    ['Home', Home],
    ['New Trade', Plus],
    ['History', WalletCards],
    ['Signals', Sparkles],
    ['Analytics', Activity],
    ['Calendar', CalendarDays],
  ];
  return (
    <div className={hidden ? 'bottomNav hide' : 'bottomNav'}>
      {nav.map(([name, Icon]) => (
        <button key={name} className={page === name ? 'active' : ''} onClick={() => setPage(name)} aria-label={name}>
          <Icon size={18} />
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
}

function Dashboard({ trades, selectedDate, selectedTrades, onDatePick, clearDate, onOpenTrade, onEditTrade, onEditGroup }) {
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
          onEditGroup={onEditGroup}
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
          <CartesianGrid stroke="var(--chart-grid)" />
          <XAxis dataKey="label" stroke="var(--chart-axis)" minTickGap={48} />
          <YAxis stroke="var(--chart-axis)" />
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

function CalendarPage({ trades, selectedDate, selectedTrades, onDatePick, clearDate, onOpenTrade, onEditTrade, onEditGroup }) {
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
        <div className="calendarTrades"><TradeList title="Recent Trades" trades={listTrades} empty="No trades in this range." onOpenTrade={onOpenTrade} onEditTrade={onEditTrade} onEditGroup={onEditGroup} /><Pagination page={safePage} pages={pages} total={sorted.length} pageSize={pageSize} onChange={setPageIndex} /></div>
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
          <CartesianGrid stroke="var(--chart-grid)" />
          <XAxis dataKey="name" stroke="var(--chart-axis)" hide={rows.length > 4} />
          <YAxis stroke="var(--chart-axis)" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
          <Bar dataKey="pnl" fill="#6aa9ff" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TradeList({ title = 'Trade History', trades, compact = false, hideSession = false, className = '', deleteTrade, empty = 'No trades yet.', onOpenTrade, onEditTrade, onEditGroup, actionSlot }) {
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
        {!hideSession && <span className="tradeSessionValue">{trade.session}<small>{multiple ? `Closes ${timeOnly(trade.closedAt)}` : trade.market === 'FTT' ? trade.duration || 'Timed trade' : trade.closeReason || 'CFD trade'}</small></span>}
        <span className={`tradeResultValue ${trade.profit >= 0 ? 'green' : 'red'}`}>
          {money(trade.profit)}
          {multiple
            ? <small>{trade.market === 'FTT' ? `${money(trade.amount)} total stake` : `${formatAmount(trade.amount)} total lot`}</small>
            : trade.market === 'FTT' && <small>{trade.payout || 90}% payout</small>}
        </span>
        {!compact && (
          <span className="rowActions" onClick={(event) => event.stopPropagation()}>
            {multiple ? (
              <>
                <button className="iconBtn" title="Edit merged row" onClick={() => onEditGroup?.(group)}><Edit3 size={15} /></button>
                <button className={`iconBtn groupToggle ${expanded ? 'open' : ''}`} title={expanded ? 'Collapse entries' : 'Show entries'} onClick={() => toggleGroup(group.id)}><ChevronDown size={16} /></button>
              </>
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
  const [savingImport, setSavingImport] = useState(false);
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
    const validation = validateUploadFiles(files, ['image', 'csv', 'excel']);
    if (!validation.ok) {
      setStatus(validation.message);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setBusy(true);
    setStatus(`Preparing ${files.length} file${files.length === 1 ? '' : 's'}...`);
    try {
      const allDrafts = [];
      for (const [index, file] of files.entries()) {
        const fileLabel = `File ${index + 1} of ${files.length}: ${file.name}`;
        setStatus(`${fileLabel} - reading...`);
        if (isSheet(file)) {
          setStatus(`${fileLabel} - reading spreadsheet...`);
          allDrafts.push(...await parseSheetFile(file));
        } else if (file.type.startsWith('image/')) {
          setStatus(`${fileLabel} - reading screenshot...`);
          const text = await readImageText(file, mode, (message) => setStatus(`${fileLabel} - ${message}`));
          setStatus(`${fileLabel} - detecting trades...`);
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
  const saveDrafts = async () => {
    if (savingImport || !drafts.length) return;
    setSavingImport(true);
    setStatus(`Saving ${drafts.length.toLocaleString()} reviewed trade${drafts.length === 1 ? '' : 's'}...`);
    await waitForPaint();
    try {
      const result = onImport(drafts);
      setStatus(`${result.added} new saved. ${result.skipped} duplicate skipped.${result.limited ? ` ${result.limited} over the cloud storage limit.` : ''}`);
      setDrafts([]);
      setActiveIndex(0);
      localStorage.removeItem(IMPORT_LATER_KEY);
    } finally {
      setSavingImport(false);
    }
  };
  const skipAll = () => {
    if (savingImport) return;
    setDrafts([]);
    setActiveIndex(0);
    localStorage.removeItem(IMPORT_LATER_KEY);
    setStatus('Import skipped.');
  };
  const logLater = () => {
    if (savingImport) return;
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
          {['AUTO', 'FTT', 'CFD'].map((name) => <button key={name} className={mode === name ? 'on' : ''} onClick={() => setMode(name)} disabled={busy || savingImport}>{name}</button>)}
        </div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,image/png,image/jpeg,image/webp" multiple onChange={(e) => handleFiles(e.target.files)} />
        <button className="uploadBtn" onClick={() => fileRef.current?.click()} disabled={busy || savingImport}>
          <UploadCloud size={20} />
          {busy ? 'Processing' : 'Upload history'}
        </button>
      </div>
      <div className="uploadGrid">
        <button className="uploadTile" onClick={() => fileRef.current?.click()} disabled={busy || savingImport}><FileSpreadsheet size={24} /><span>CSV / Excel</span></button>
        <button className="uploadTile" onClick={() => fileRef.current?.click()} disabled={busy || savingImport}><ImageUp size={24} /><span>Screenshot</span></button>
      </div>
      {busy && (
        <div className="processingCard" role="status" aria-live="polite">
          <span className="spinner" />
          <div><b>Processing upload</b><span>{status || 'Reading files...'}</span></div>
        </div>
      )}
      {savingImport && (
        <div className="processingCard saveProgress" role="status" aria-live="polite">
          <span className="spinner" />
          <div><b>Saving reviewed trades</b><span>{status}</span></div>
        </div>
      )}
      {status && !busy && !savingImport && <p className="status">{status}</p>}
      {!!drafts.length && (
        <div className={savingImport ? 'importReview saving' : 'importReview'}>
          <PanelTitle
            title="Review Import"
            tag={<ReviewJumpSelect activeIndex={activeIndex} count={drafts.length} onChange={setActiveIndex} disabled={savingImport} />}
          />
          <div className="reviewLayout">
            <div className="reviewQueue">
              {drafts.slice(0, 120).map((trade, index) => (
                <button key={trade.id} className={index === activeIndex ? 'queueItem active' : 'queueItem'} onClick={() => setActiveIndex(index)} disabled={savingImport}>
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
                <button className="soft" onClick={() => setActiveIndex((i) => Math.max(0, i - 1))} disabled={savingImport}>Previous</button>
                <button className="soft" onClick={() => setActiveIndex((i) => Math.min(drafts.length - 1, i + 1))} disabled={savingImport}>Next</button>
              </div>
            </div>
          </div>
          <div className="modalActions importActions">
            <div className="reviewSecondary"><button className="soft dangerText" onClick={skipAll} disabled={savingImport}><X size={16} />Skip all</button><button className="soft" onClick={logLater} disabled={savingImport}><StickyNote size={16} />Log later</button></div>
            <button className="primary" onClick={saveDrafts} disabled={savingImport}>{savingImport ? <span className="spinner miniSpinner" /> : <Check size={18} />}{savingImport ? 'Saving trades...' : 'Save all reviewed trades'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function History({ trades, deleteTrade, onOpenTrade, onEditTrade, onEditGroup }) {
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
      <TradeList trades={visible} deleteTrade={deleteTrade} onOpenTrade={onOpenTrade} onEditTrade={onEditTrade} onEditGroup={onEditGroup} />
      <Pagination page={safePage} pages={pageCount} total={sorted.length} pageSize={pageSize} onChange={setPageIndex} />
    </section>
  );
}

function Pagination({ page, pages, total, pageSize, onChange }) {
  if (pages <= 1) return null;
  return <div className="pagination"><span>{page * pageSize + 1}-{Math.min(total, (page + 1) * pageSize)} of {total}</span><button className="soft" disabled={!page} onClick={() => onChange(page - 1)}><ChevronLeft size={16} />Previous</button><b>{page + 1} / {pages}</b><button className="soft" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>Next<ChevronRight size={16} /></button></div>;
}

function useResponsivePageSize() {
  const calculate = () => Math.min(20, window.innerHeight >= 980 ? 20 : window.innerHeight >= 760 ? 15 : 10);
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
    const incoming = [...(fileList || [])];
    const invalid = incoming.find((file) => fileUploadKind(file) !== 'image');
    if (invalid) { setStatus('Drop PNG, JPG, or WEBP transaction screenshots.'); return; }
    const validation = validateUploadFiles(incoming, ['image']);
    if (!validation.ok) { setStatus(validation.message); return; }
    const files = incoming.filter((file) => file.type.startsWith('image/'));
    if (!files.length) { setStatus('Drop PNG, JPG, or WEBP transaction screenshots.'); return; }
    setBusy(true);
    setStatus('Reading transaction screenshots...');
    try {
      const detected = [];
      for (const file of files) {
        const fingerprint = await hashFile(file);
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

function SettingsPage({ settings, updateSettings, authState, openAccount, trades, transactions, onArchive, theme }) {
  const toggle = (market) => updateSettings({ enabled: { ...settings.enabled, [market]: !settings.enabled[market] } });
  const [archiveStatus, setArchiveStatus] = useState('');
  const bytes = new Blob([JSON.stringify({ trades, transactions })]).size;
  const cloudTradeLimit = settings.maxTrades || CLOUD_TRADE_LIMIT;
  const percent = Math.min(100, trades.length / (authState.user ? cloudTradeLimit : LOCAL_TRADE_STORAGE_TARGET) * 100);
  const storageSummary = authState.user
    ? `${trades.length.toLocaleString()} / ${cloudTradeLimit.toLocaleString()} cloud trades - ${formatBytes(bytes)} compact data`
    : `${trades.length.toLocaleString()} local trades - ${formatBytes(bytes)} compact data`;
  const storageCopy = authState.user
    ? 'Private cloud sync is active. Cloud trade imports are capped; screenshots are processed, then discarded.'
    : 'Browser local storage is active with no app-level trade count cap. Sign in to add private cloud sync.';
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
          <div className="themeRow">
            <span>Appearance</span>
            <div className="themeChoice" role="group" aria-label="Appearance">
              <button className={theme === 'dark' ? 'on' : ''} onClick={() => updateSettings({ theme: 'dark' })}><Moon size={16} />Night</button>
              <button className={theme === 'light' ? 'on' : ''} onClick={() => updateSettings({ theme: 'light' })}><Sun size={16} />Light</button>
            </div>
          </div>
          <div className="toggleRow"><span>FTT journal</span><button className={settings.enabled.FTT ? 'toggle on' : 'toggle'} onClick={() => toggle('FTT')} /></div>
          <div className="toggleRow"><span>CFD journal</span><button className={settings.enabled.CFD ? 'toggle on' : 'toggle'} onClick={() => toggle('CFD')} /></div>
        </div>
        <div className="storageNote">
          <b>Storage</b>
          <span>{storageSummary}</span>
          <div className="storageMeter"><i style={{ width: `${percent}%` }} /></div>
          <span>{storageCopy}</span>
          <button className="soft archiveButton" onClick={() => { const count = onArchive(); setArchiveStatus(count ? `${count} trades exported and removed.` : 'No trades are old enough to archive.'); }}><Download size={16} />Export & remove old trades</button>
          {archiveStatus && <span className="green">{archiveStatus}</span>}
        </div>
        <div className="securityNote"><ShieldCheck size={18} /><div><b>TCX Security</b><span>{authState.security === 'verified' ? 'Google and TCX Security login verified.' : 'Verification is required before journal access.'}</span></div></div>
      </div>
    </section>
  );
}

function AuthGate({ authState, onGoogleSignIn, onTcxSecuritySubmit, onSignOut }) {
  const [securityConfig, setSecurityConfig] = useState({ turnstileSiteKey: '', links: {} });
  const [portalUrl, setPortalUrl] = useState('');

  useEffect(() => {
    let active = true;
    getCloud().then(async (cloud) => {
      const config = await cloud.loadTcxSecurityPublicConfig().catch(() => ({}));
      if (!active) return;
      setSecurityConfig({
        turnstileSiteKey: String(config?.turnstileSiteKey || '').trim(),
        links: config?.links || {},
      });
      setPortalUrl(cloud.getTcxSecurityPortalUrl(window.location.href));
    });
    return () => { active = false; };
  }, []);

  const googleComplete = Boolean(authState.user);
  const securityComplete = authState.security === 'verified';

  return (
    <section className="authGate">
      <div className="authGatePanel">
        <div className="authGateBrand">
          <img src="/tcx-logo.svg" alt="" />
          <div>
            <span>TCX Journal</span>
            <small>Protected trading journal</small>
          </div>
        </div>

        <div className="authStepGrid" aria-label="Authentication progress">
          <div className={googleComplete ? 'authStep done' : 'authStep active'}>
            {googleComplete ? <Check size={16} /> : <LogIn size={16} />}
            <span>Google</span>
          </div>
          <div className={securityComplete ? 'authStep done' : googleComplete ? 'authStep active' : 'authStep'}>
            <ShieldCheck size={16} />
            <span>Verify yourself</span>
          </div>
        </div>

        {!authState.configured ? (
          <div className="authGateBody">
            <h1>Firebase setup required</h1>
            <p>The Google sign-in keys must be configured before TCX Journal can open.</p>
            <p className="setupNotice">Add the Firebase variables in Netlify, then redeploy the journal.</p>
          </div>
        ) : !authState.user ? (
          <div className="authGateBody">
            <h1>Sign in with Google</h1>
            <p>Google comes first. The TCX Security verification opens after this account is confirmed.</p>
            {authState.error && <p className="accountError">{authState.error}</p>}
            <button className="googleButton" disabled={authState.loading} onClick={onGoogleSignIn}>
              <span className="googleGlyph">G</span>{authState.loading ? 'Connecting...' : 'Continue with Google'}
            </button>
          </div>
        ) : (
          <TcxSecurityStep
            authState={authState}
            securityConfig={securityConfig}
            portalUrl={portalUrl}
            onSubmit={onTcxSecuritySubmit}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </section>
  );
}

function TcxSecurityStep({ authState, securityConfig, portalUrl, onSubmit, onSignOut }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const turnstileRef = useRef(null);
  const widgetRef = useRef(null);
  const trialMode = isTrialCode(password);
  const siteKey = String(securityConfig.turnstileSiteKey || '').trim();

  useEffect(() => {
    if (!trialMode) {
      setTurnstileToken('');
      widgetRef.current = null;
      return undefined;
    }
    if (!siteKey || !turnstileRef.current) return undefined;

    let disposed = false;
    loadTcxTurnstileScript().then((turnstile) => {
      if (disposed || !turnstile || widgetRef.current !== null || !turnstileRef.current) return;
      widgetRef.current = turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        theme: 'dark',
        callback: (token) => setTurnstileToken(String(token || '')),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
    }).catch(() => {
      if (!disposed) setLocalError('Human verification could not load.');
    });

    return () => { disposed = true; };
  }, [trialMode, siteKey]);

  const submit = async (event) => {
    event.preventDefault();
    setLocalError('');
    if (!loginId.trim()) {
      setLocalError('Enter your Quotex account ID or unlimited username.');
      return;
    }
    if (!password.trim()) {
      setLocalError('Enter your TCX Security password.');
      return;
    }
    if (trialMode && siteKey && !turnstileToken) {
      setLocalError('Complete the human verification.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        loginId: loginId.trim(),
        password: password.trim(),
        turnstileToken,
        fingerprintHash: await getClientFingerprintHash(),
      });
      if (window.turnstile && widgetRef.current !== null) {
        try { window.turnstile.reset(widgetRef.current); } catch {}
      }
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || authState.loading;
  const message = localError || authState.error;

  return (
    <div className="authGateBody">
      <div className="authUserRow">
        {authState.user.photoURL && <img src={authState.user.photoURL} alt="" referrerPolicy="no-referrer" />}
        <div>
          <b>{authState.user.displayName || authState.user.email}</b>
          <span>{authState.user.email}</span>
        </div>
        <button className="textButton" onClick={onSignOut} disabled={busy}>Change</button>
      </div>

      <h1>Verify yourself</h1>
      <p>Use the same TCX Security login you use for the current access system.</p>

      <form className="verifyForm" onSubmit={submit}>
        <label>
          <span>Quotex ID or username</span>
          <input value={loginId} onChange={(event) => setLoginId(event.target.value)} autoComplete="username" />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>
        {trialMode && (
          <div className="turnstileSlot">
            {siteKey ? <div ref={turnstileRef} /> : <p className="setupNotice">Turnstile site key is missing from TCX Security public config.</p>}
          </div>
        )}
        {message && <p className="accountError">{message}</p>}
        <button className="googleButton verifyButton" disabled={busy} type="submit">
          <ShieldCheck size={17} />{busy ? 'Verifying...' : 'Verify yourself'}
        </button>
      </form>

      {portalUrl && <a className="securityPortalLink" href={portalUrl}>Open full TCX Security portal</a>}
    </div>
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
  const tagNode = React.isValidElement(tag) ? tag : tag ? <span className="panelTag">{tag}</span> : null;
  return <div className="panelTitle"><h3>{title}</h3><div className="panelActions">{action}{tagNode}</div></div>;
}

function ReviewJumpSelect({ activeIndex, count, onChange, disabled = false }) {
  const value = Math.min(activeIndex, Math.max(0, count - 1));
  return (
    <select
      className="panelSelect"
      value={value}
      disabled={disabled}
      aria-label="Jump to detected trade"
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {Array.from({ length: count }, (_, index) => (
        <option key={index} value={index}>{index + 1} of {count}</option>
      ))}
    </select>
  );
}

function waitForPaint() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(resolve, 0);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function Input({ label, value, onChange, type = 'text' }) {
  return <label className="field"><span>{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function OptionalSelect({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Keep current</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
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

function TradeGroupEditorModal({ group, onClose, onSave }) {
  const [draft, setDraft] = useState({
    strategy: commonTradeValue(group.trades, 'strategy', ''),
    emotion: commonTradeValue(group.trades, 'emotion', ''),
    session: commonTradeValue(group.trades, 'session', ''),
    duration: commonTradeValue(group.trades, 'duration', ''),
    notes: commonTradeValue(group.trades, 'notes', ''),
  });
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => {
    const patch = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== ''));
    onSave(group.trades.map((trade) => trade.id), patch);
  };
  return (
    <Modal onClose={onClose} className="tradeModal groupEditModal">
      <div className="modalHead">
        <div>
          <span className="miniCaps">{group.trades.length} merged entries</span>
          <h2>{group.summary.asset}</h2>
        </div>
        <button className="iconBtn" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="fields">
        <OptionalSelect label="Strategy" value={draft.strategy} onChange={(value) => set('strategy', value)} options={STRATEGIES} />
        <OptionalSelect label="Emotion" value={draft.emotion} onChange={(value) => set('emotion', value)} options={EMOTIONS} />
        <OptionalSelect label="Session" value={draft.session} onChange={(value) => set('session', value)} options={SESSION_OPTIONS} />
        {group.summary.market === 'FTT' && <OptionalSelect label="Timeframe" value={draft.duration} onChange={(value) => set('duration', value)} options={TIMEFRAMES.includes(draft.duration) || !draft.duration ? TIMEFRAMES : [draft.duration, ...TIMEFRAMES]} />}
      </div>
      <label className="area"><span>Notes</span><textarea value={draft.notes || ''} onChange={(event) => set('notes', event.target.value)} /></label>
      <div className="modalActions">
        <button className="soft" onClick={onClose}>Cancel</button>
        <button className="primary" onClick={save}><Check size={17} />Apply to row</button>
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
        <div className="chipLine"><i>{trade.strategy}</i><i>{trade.emotion}</i>{trade.market === 'FTT' && <i>{trade.duration || 'Timed trade'}</i>}</div>
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

function DayTradesModal({ date, trades, onClose, onOpenTrade, onEditGroup }) {
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
              {group.trades.length > 1 && <i className="miniEdit" onClick={(event) => { event.stopPropagation(); onEditGroup?.(group); }}><Edit3 size={13} /></i>}
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
            {isFtt ? 'Up' : 'Buy'}
          </button>
          <button className={['DOWN', 'SELL'].includes(draft.direction) ? 'selected dn' : ''} onClick={() => set('direction', isFtt ? 'DOWN' : 'SELL')}>
            {isFtt ? 'Down' : 'Sell'}
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
        {isFtt && <Select label="Timeframe" value={draft.duration || '1m'} onChange={(v) => set('duration', v)} options={TIMEFRAMES.includes(draft.duration) || !draft.duration ? TIMEFRAMES : [draft.duration, ...TIMEFRAMES]} />}
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
      setStatus('Reading screenshot with cloud OCR...');
      const cloud = await callCloudOcr(file);
      if (cloud) {
        setStatus('Screenshot text extracted. Detecting trades...');
        return cloud;
      }
    } catch {
      setStatus('Cloud OCR unavailable. Running browser OCR...');
    }
  }
  return readBrowserImageText(file, setStatus);
}

async function readBrowserImageText(file, setStatus) {
  setStatus('Running browser OCR...');
  const variants = await prepareImageVariantsForOcr(file);
  const texts = [];
  for (const [index, variant] of variants.entries()) {
    const label = variants.length > 1 ? ` pass ${index + 1}/${variants.length}` : '';
    const result = await recognize(variant, 'eng', {
      logger: (m) => {
        if (m.status && m.progress) setStatus(`${m.status}${label} ${Math.round(m.progress * 100)}%`);
      },
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core.wasm.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      tessedit_pageseg_mode: '6',
    });
    if (result.data.text?.trim()) texts.push(result.data.text);
  }
  return texts.join('\n');
}

async function prepareImageVariantsForOcr(file) {
  if (!file.type?.startsWith('image/') || typeof createImageBitmap !== 'function') return [file];
  try {
    const bitmap = await createImageBitmap(file);
    const shortImage = bitmap.height < 180;
    const wideTable = bitmap.width > 1200;
    const scale = shortImage ? Math.min(8, Math.max(3, Math.ceil(320 / bitmap.height))) : wideTable ? 2 : 3;
    const normalized = await renderOcrVariant(bitmap, scale, 'normalize');
    return [normalized || file];
  } catch {
    return [file];
  }
}

async function renderOcrVariant(bitmap, scale, mode) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let min = 255;
  let max = 0;
  const grayValues = new Uint8Array(image.data.length / 4);
  for (let i = 0, pixel = 0; i < image.data.length; i += 4, pixel += 1) {
    const gray = Math.round(image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114);
    grayValues[pixel] = gray;
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }
  const range = Math.max(1, max - min);
  for (let i = 0, pixel = 0; i < image.data.length; i += 4, pixel += 1) {
    let gray = Math.round((grayValues[pixel] - min) / range * 255);
    if (mode === 'threshold') gray = gray < 145 ? 0 : 255;
    image.data[i] = gray;
    image.data[i + 1] = gray;
    image.data[i + 2] = gray;
  }
  ctx.putImageData(image, 0, 0);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
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
    parseQuotexFttRows(cleanText, uuid).forEach((trade) => trades.push(trade));
    const detailTrade = parseFttDetailText(cleanText, uuid);
    if (detailTrade) trades.push(detailTrade);
    const fttBlocks = buildFttBlocks(lines, uuid);
    fttBlocks.forEach((block) => {
      const trade = parseFttTextBlock(block, uuid);
      if (trade) trades.push(trade);
    });
  }

  if (forced !== 'FTT') {
    buildCfdBlocks(lines, ticket).forEach((block) => {
      const trade = parseCfdTextBlock(block, ticket);
      if (trade) trades.push(trade);
    });
  }

  const seen = new Set();
  const seenFallback = new Set();
  return trades.filter((trade) => {
    const key = uniqueKey(trade);
    const fallbackKey = tradeFallbackKey(trade);
    if (seen.has(key) || seenFallback.has(fallbackKey)) return false;
    seen.add(key);
    seenFallback.add(fallbackKey);
    return true;
  });
}

function tradeFallbackKey(trade) {
  return [
    trade.market,
    normalizeOcrAsset(trade.asset),
    dateKey(trade.openedAt),
    timeOnly(trade.openedAt),
    timeOnly(trade.closedAt),
    round(trade.amount),
    round(trade.income || trade.profit),
    round(trade.open),
    round(trade.close),
  ].join('|').toLowerCase();
}

function parseQuotexFttRows(text, uuid) {
  const source = normalizeTradeOcrText(text);
  const headerPattern = /([A-Z0-9]{3}\s*[/|]?\s*[A-Z0-9]{2,3}(?:\s*\(OTC\))?)\s+([5-9]\d|100)\s*%/gi;
  const headers = [...source.matchAll(headerPattern)]
    .map((match) => ({
      index: match.index,
      asset: normalizeOcrAsset(match[1]),
      payout: toNumber(match[2]),
    }))
    .filter((header) => /^[A-Z0-9]{3}\/[A-Z0-9]{3}/.test(header.asset) || /\(OTC\)/i.test(header.asset));

  return headers.map((header, index) => {
    const block = source.slice(header.index, headers[index + 1]?.index ?? source.length);
    return parseQuotexFttRowBlock(block, header, uuid);
  }).filter(Boolean);
}

function parseQuotexFttRowBlock(block, header, uuid) {
  if (/\b(Buy|Sell)\b|\blot\b|Open price|Close price|P\/L|Commission|Equity|Closed by|Stop\s*out/i.test(block)) return null;
  const idMatch = block.match(uuid);
  const id = idMatch?.[0] || '';
  const beforeId = idMatch ? block.slice(0, idMatch.index) : block.slice(0, 180);
  let moneyValues = extractQuotexMoneyValues(beforeId);
  if (moneyValues.length < 2) moneyValues = extractFttMoneyValues(block, id);
  if (!moneyValues.length) return null;

  const quotes = extractFttQuotes(block);
  const dates = parseVisibleDates(block);
  const amount = round(Math.abs(moneyValues[0]));
  const income = moneyValues.length > 1
    ? round(Math.max(0, moneyValues[1]))
    : inferFttIncomeFromBlock(block, amount);

  return makeTrade({
    market: 'FTT',
    sourceId: id,
    account: 'Quotex',
    asset: header.asset,
    direction: inferFttDirection(block, quotes.open, quotes.close, income - amount),
    amount,
    income,
    payout: header.payout,
    open: quotes.open,
    close: quotes.close,
    openedAt: quotes.openedAt || dates[0] || new Date().toISOString(),
    closedAt: quotes.closedAt || dates[1] || dates[0] || new Date().toISOString(),
    strategy: 'Unclassified',
    notes: 'Imported from Quotex screenshot row.',
  });
}

function normalizeTradeOcrText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[|]/g, '/')
    .replace(/\bUS[DO0P]\s*\/?\s*J[P¥Y]\b/gi, 'USD/JPY')
    .replace(/\bA[UO0]D\s*\/?\s*J[P¥Y]\b/gi, 'AUD/JPY')
    .replace(/\b([A-Z]{3})\s+([A-Z]{3})\b(?=\s+(?:[5-9]\d|100)\s*%)/g, '$1/$2')
    .replace(/([0-9])\s*[$S]\b/gi, '$1$')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuotexMoneyValues(text) {
  const values = [];
  const source = String(text || '').replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, ' ');
  const patterns = [
    /([+-]?\s*\$)\s*(\d{1,6}(?:[.,]\d{1,2})?)/g,
    /([+-]?\s*\d{1,6}(?:[.,]\d{1,2})?)\s*(?:[$S]|USD)(?![A-Za-z])/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = toNumber(match[2] || match[1]);
      if (Number.isFinite(value) && value >= 0 && value < 100000) values.push(value);
    }
  }
  return values.slice(-2);
}

function buildFttBlocks(lines, uuid) {
  const uuidLines = lines.reduce((acc, line, index) => (uuid.test(line) ? [...acc, index] : acc), []);
  if (uuidLines.length) {
    const starts = uuidLines.map((lineIndex, index) => findFttBlockStart(lines, lineIndex, index ? uuidLines[index - 1] + 1 : 0));
    return uuidLines.map((lineIndex, index) => {
      const end = starts[index + 1] ?? Math.min(lines.length, lineIndex + 10);
      return lines.slice(starts[index], end).join(' ');
    });
  }
  const assetLine = /[A-Z0-9]{3}\s*\/\s*[A-Z0-9]{2,3}(?:\s*\(OTC\))?/i;
  const starts = lines.reduce((acc, line, index) => (assetLine.test(line) ? [...acc, index] : acc), []);
  return starts.map((start, index) => lines.slice(start, starts[index + 1] ?? Math.min(lines.length, start + 10)).join(' '));
}

function findFttBlockStart(lines, idLine, lowerBound) {
  const asset = /[A-Z0-9]{3}\s*\/\s*[A-Z0-9]{2,3}(?:\s*\(OTC\))?/i;
  const validPayout = /(^|[^\d.])(?:[5-9]\d|100)\s*%/;
  let assetCandidate = -1;
  for (let i = idLine; i >= lowerBound; i -= 1) {
    if (asset.test(lines[i]) && assetCandidate === -1) assetCandidate = i;
    if (validPayout.test(lines[i])) return asset.test(lines[i]) ? i : Math.max(lowerBound, i - 3);
  }
  if (assetCandidate !== -1) return assetCandidate;
  return Math.max(lowerBound, idLine - 2);
}

function parseFttTextBlock(block, uuid) {
  if (/\b(Buy|Sell)\b|\blot\b|Open price|Close price|P\/L|Commission|Equity|Closed by|Stop\s*out/i.test(block)) return null;
  const asset = block.match(/[A-Z0-9]{3}\s*\/\s*[A-Z0-9]{2,3}(?:\s*\(OTC\))?|XAU\s*\/?\s*USD(?:\s*\(OTC\))?|XAG\s*\/?\s*USD(?:\s*\(OTC\))?/i);
  const id = block.match(uuid);
  const pct = extractFttPayout(block);
  const values = extractFttMoneyValues(block, id?.[0]);
  if ((!asset && !id) || !values.length) return null;
  const quotes = extractFttQuotes(block);
  const dates = parseVisibleDates(block);
  const amount = values[0];
  const income = values.length > 1 ? values[values.length - 1] : inferFttIncomeFromBlock(block, values[0]);
  return makeTrade({
    market: 'FTT',
    sourceId: id?.[0],
    account: 'Quotex',
    asset: asset ? normalizeOcrAsset(asset[0]) : 'FTT trade',
    direction: inferFttDirection(block, quotes.open, quotes.close, income - amount),
    amount,
    income,
    payout: pct,
    open: quotes.open,
    close: quotes.close,
    openedAt: quotes.openedAt || dates[0] || new Date().toISOString(),
    closedAt: quotes.closedAt || dates[1] || dates[0] || new Date().toISOString(),
    strategy: 'Unclassified',
    notes: 'Imported from screenshot.',
  });
}

function parseFttDetailText(text, uuid) {
  const compact = String(text || '').replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();
  if (!/Trade\s+Pair|Open\s+Price|Close\s+Price|Difference/i.test(compact)) return null;
  if (/\b(Buy|Sell)\b|\blot\b|P\/L|Commission|Equity|Closed by|Stop\s*out/i.test(compact)) return null;
  const asset = labeledFttText(compact, 'Trade Pair') || compact.match(/\b[A-Z][A-Za-z]+(?:\s+Coin)?\s*\(OTC\)|[A-Z]{3}\s*\/?\s*[A-Z]{3}(?:\s*\(OTC\))?/i)?.[0] || 'FTT trade';
  const values = extractMoneyValues(compact);
  const open = labeledFttNumber(compact, 'Open Price');
  const close = labeledFttNumber(compact, 'Close Price');
  const dates = parseVisibleDates(compact);
  const resultAmount = values.length ? values.at(-1) : 0;
  const amount = values.length > 1 ? values[0] : Math.abs(resultAmount);
  const id = compact.match(uuid)?.[0] || compact.match(/\bID:?\s*([0-9a-f-]{8,})/i)?.[1] || '';
  const duration = compact.match(/Duration:?\s*(\d{1,2}:\d{2}:\d{2}|\d+\s*[smh])/i)?.[1] || '';
  const pct = compact.match(/([+-]?\d{1,3})\s*%/)?.[1];
  return makeTrade({
    market: 'FTT',
    sourceId: id,
    account: 'Quotex',
    asset: normalizeFttDetailAsset(asset),
    direction: inferFttDirection(compact, open, close, resultAmount - amount),
    amount,
    income: resultAmount,
    payout: pct ? Math.abs(toNumber(pct)) : '',
    open,
    close,
    openedAt: labeledFttDate(compact, 'Open time') || dates[0] || new Date().toISOString(),
    closedAt: labeledFttDate(compact, 'Close Time') || labeledFttDate(compact, 'Close time') || dates[1] || dates[0] || new Date().toISOString(),
    duration,
    strategy: 'Unclassified',
    notes: 'Imported from Quotex detail screenshot.',
  });
}

function labeledFttText(text, label) {
  const match = text.match(new RegExp(`${escapeRegExp(label)}:?\\s*([A-Za-z0-9/() .-]+?)(?=\\s+(?:[-+]?\\d{1,3}\\s*%|Open\\s+Price|Close\\s+Price|Open\\s+time|Close\\s+Time|Duration|Difference|ID:)|$)`, 'i'));
  return match ? clean(match[1]) : '';
}

function labeledFttNumber(text, label) {
  const match = text.match(new RegExp(`${escapeRegExp(label)}:?\\s*([+-]?\\d+(?:\\.\\d+)?)`, 'i'));
  return match ? match[1] : '';
}

function labeledFttDate(text, label) {
  const match = text.match(new RegExp(`${escapeRegExp(label)}:?\\s*(\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)`, 'i'));
  return match ? parseVisibleDate(match[1]) : '';
}

function normalizeFttDetailAsset(value) {
  const text = clean(value).replace(/\s+-?\s*\d{1,3}\s*%.*$/i, '');
  return normalizeAsset(text);
}

function extractMoneyValues(block) {
  const withSymbols = [...block.matchAll(/([+-]?\s*\d{1,6}(?:[.,]\d{1,2})?)\s*(?:[$S]|USD)(?![A-Za-z])/gi)].map((match) => toNumber(match[1]));
  if (withSymbols.length) return withSymbols;
  return extractDecimalNumbers(block, 2, 2).filter((value) => Math.abs(value) < 100000);
}

function extractFttMoneyValues(block, sourceId = '') {
  let zone = String(block || '');
  if (sourceId && zone.includes(sourceId)) {
    const sourceIndex = zone.indexOf(sourceId);
    zone = `${zone.slice(0, sourceIndex)} ${zone.slice(sourceIndex + sourceId.length)}`;
  }
  zone = zone
    .replace(/\d{1,6}(?:\.\d{1,6})?\s+\d{1,2}\/\d{1,2}\/20\d{2},?\s+\d{1,2}:\d{2}(?::\d{2})?/g, ' ')
    .replace(/\b20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/g, ' ')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, ' ')
    .replace(/Opening\s+quote|Closing\s+quote/gi, ' ');
  const values = [];
  for (const match of zone.matchAll(/([+-]?\s*\d{1,6}(?:[.,]\d{1,3})?)\s*([$S8%])?/gi)) {
    const token = match[1];
    const symbol = match[2] || '';
    const value = parseOcrMoneyToken(token, symbol);
    if (!Number.isFinite(value)) continue;
    const hasDecimal = /[.,]\d/.test(token);
    if (symbol === '%' && !hasDecimal && value >= 50 && value <= 100) continue;
    if (!symbol && value >= 50 && value <= 100 && /%\s*$/.test(zone.slice(match.index, match.index + match[0].length + 2))) continue;
    if (value > 100000) continue;
    values.push(value);
  }
  return values.slice(-2);
}

function extractFttPayout(block) {
  for (const match of String(block || '').matchAll(/(^|[^\d.])(\d{2,3})\s*%/g)) {
    const value = toNumber(match[2]);
    if (value >= 50 && value <= 100) return value;
  }
  return '';
}

function parseOcrMoneyToken(token, symbol = '') {
  let text = String(token || '').replace(/\s+/g, '').replace(',', '.');
  if (!text) return NaN;
  const decimal = text.match(/^([+-]?\d+)\.(\d{3})$/);
  if (decimal) text = `${decimal[1]}.${decimal[2].slice(0, 2)}`;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function inferFttIncomeFromBlock(block, amount) {
  if (/\b0[.,]0{1,2}[8S$%]?\b/.test(block)) return 0;
  return amount;
}

function extractFttQuotes(block) {
  const open = block.match(/Opening\s+quote:?\s*(\d{1,6}(?:\.\d{1,6})?)\s+(\d{2}\/\d{2}\/\d{4},?\s*\d{2}:\d{2}(?::\d{2})?)/i);
  const close = block.match(/Closing\s+quote:?\s*(\d{1,6}(?:\.\d{1,6})?)\s+(\d{2}\/\d{2}\/\d{4},?\s*\d{2}:\d{2}(?::\d{2})?)/i);
  const datedQuotes = [...String(block || '').matchAll(/(\d{1,6}\.\d{1,6})\s+(\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{1,2}:\d{2}(?::\d{2})?)/g)];
  const prices = extractDecimalNumbers(block, 3, 6);
  const pricePair = selectFttQuotePair(prices);
  const dates = parseVisibleDates(block);
  const fallbackDates = selectFttDatePair(dates);
  const useDatedQuotes = datedQuotes.length >= 2;
  return {
    open: open?.[1] || (useDatedQuotes ? datedQuotes[0]?.[1] : pricePair.open) || datedQuotes[0]?.[1] || '',
    close: close?.[1] || (useDatedQuotes ? datedQuotes[1]?.[1] : pricePair.close) || datedQuotes[1]?.[1] || '',
    openedAt: open?.[2] ? parseVisibleDate(open[2]) : useDatedQuotes ? parseVisibleDate(datedQuotes[0][2]) : fallbackDates.open || '',
    closedAt: close?.[2] ? parseVisibleDate(close[2]) : useDatedQuotes ? parseVisibleDate(datedQuotes[1][2]) : fallbackDates.close || '',
  };
}

function selectFttQuotePair(prices) {
  if (!prices.length) return { open: '', close: '' };
  if (prices.length === 1) return { open: prices[0], close: '' };
  let best = null;
  for (let index = 0; index < prices.length - 1; index += 1) {
    const open = prices[index];
    const close = prices[index + 1];
    const diff = Math.abs(close - open);
    if (diff > 20) continue;
    const score = diff + index * 0.01;
    if (!best || score < best.score) best = { open, close, score };
  }
  return best || { open: prices[0], close: prices[1] || '' };
}

function selectFttDatePair(dates) {
  const parsed = dates.map((value, index) => ({ value, index, date: new Date(value) })).filter((item) => !Number.isNaN(item.date.getTime()));
  let best = null;
  for (const opened of parsed) {
    for (const closed of parsed) {
      if (opened.value === closed.value) continue;
      const duration = closed.date - opened.date;
      if (duration <= 0 || duration > 15 * 60 * 1000) continue;
      if (opened.date.toISOString().slice(0, 10) !== closed.date.toISOString().slice(0, 10)) continue;
      const score = Math.abs(duration - 60 * 1000) + Math.abs(closed.index - opened.index) * 500 + (closed.index < opened.index ? 250 : 0);
      if (!best || score < best.score) best = { open: opened.value, close: closed.value, score };
    }
  }
  return best || { open: dates[0] || '', close: dates[1] || dates[0] || '' };
}

function extractDecimalNumbers(text, minDecimals, maxDecimals) {
  const pattern = new RegExp(`(^|[^\\d.])(\\d{1,6}\\.\\d{${minDecimals},${maxDecimals}})(?![\\d.])`, 'g');
  return [...String(text || '').matchAll(pattern)].map((match) => toNumber(match[2]));
}

function parseVisibleDates(text) {
  const iso = [...String(text || '').matchAll(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/g)].map((match) => toIso(match[0]));
  const eu = [...String(text || '').matchAll(/(\d{1,2})[/.](\d{1,2})[/.](\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?/gi)]
    .map((match) => formatVisibleDateParts(match));
  const named = [...String(text || '').matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)\b/gi)]
    .map((match) => formatNamedDateParts(match));
  const dayNamed = [...String(text || '').matchAll(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?\b/gi)]
    .map((match) => formatDayNamedDateParts(match));
  return [...iso, ...eu, ...named, ...dayNamed];
}

function inferFttDirection(block, open, close, profit) {
  if (/down|sell|put|↓|⬇|↘/i.test(block)) return 'DOWN';
  if (/up|buy|call|↑|⬆|↗/i.test(block)) return 'UP';
  const openValue = toNumber(open);
  const closeValue = toNumber(close);
  if (openValue && closeValue && profit < 0) return closeValue >= openValue ? 'DOWN' : 'UP';
  if (openValue && closeValue) return closeValue >= openValue ? 'UP' : 'DOWN';
  return 'UP';
}

function normalizeOcrAsset(value) {
  let text = clean(value).replace(/\s*\/\s*/, '/').toUpperCase();
  text = text
    .replace(/\bUS[BO0P]\//, 'USD/')
    .replace(/\bUSD\/PY\b/, 'USD/JPY')
    .replace(/\/[I1L]PY\b/, '/JPY')
    .replace(/\/PY\b/, '/JPY')
    .replace(/\bA[UO0]D\//, 'AUD/');
  return normalizeAsset(text);
}

function buildCfdBlocks(lines, ticket) {
  const ticketLines = lines.reduce((acc, line, index) => (ticket.test(line) ? [...acc, index] : acc), []);
  if (ticketLines.length) {
    return ticketLines.map((start, index) => lines.slice(Math.max(0, start - 2), ticketLines[index + 1] ?? Math.min(lines.length, start + 18)).join(' '));
  }
  const assetLine = /XAU\s*\/?\s*USD|XAG\s*\/?\s*USD|[A-Z]{3}\s*\/?\s*[A-Z]{3}|BTC\s*\/?\s*USD|ETH\s*\/?\s*USD|NAS100|US30/i;
  const starts = lines.reduce((acc, line, index) => (assetLine.test(line) ? [...acc, index] : acc), []);
  return starts.map((start, index) => lines.slice(start, starts[index + 1] ?? Math.min(lines.length, start + 18)).join(' '));
}

function parseCfdTextBlock(block, ticket) {
  const compact = String(block || '').replace(/\s+/g, ' ').trim();
  const tableRow = parseCfdTableRow(compact, ticket);
  if (tableRow) return tableRow;
  const asset = compact.match(/XAU\s*\/?\s*USD|XAG\s*\/?\s*USD|[A-Z]{3}\s*\/?\s*[A-Z]{3}|BTC\s*\/?\s*USD|ETH\s*\/?\s*USD|NAS100|US30/i);
  const side = compact.match(/\b(Buy|Sell)\b/i);
  const id = compact.match(ticket);
  const lot = compact.match(/\b(?:Buy|Sell)\s+([+-]?\d+(?:[.,]\d+)?)\s*lot\b/i)
    || compact.match(/\bLot(?:\s+size)?\s*:?\s*([+-]?\d+(?:[.,]\d+)?)/i);
  const headerOpen = compact.match(/\b(?:Buy|Sell)\s+[+-]?\d+(?:[.,]\d+)?\s*lot\s+at\s+([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i);
  const openPrice = labeledCfdNumber(compact, ['Open price', 'Entry price']) || headerOpen?.[1] || '';
  const closePrice = labeledCfdNumber(compact, ['Close price', 'Exit price']) || '';
  const profit = labeledCfdMoney(compact, ['P/L', 'Profit']) || compact.match(/([+-]\s*\d+(?:[.,]\d+)?)\s*(?:USD|\$)/i)?.[1] || '';
  if (!asset || (!side && !id) || profit === '') return null;
  const dates = parseVisibleDates(compact);
  return makeTrade({
    market: 'CFD',
    sourceId: id?.[0],
    account: 'CFD',
    asset: slashSymbol(asset[0].replace(/\s*\/\s*/, '/')),
    direction: side?.[1] || 'SELL',
    amount: lot?.[1] || '',
    open: openPrice,
    close: closePrice,
    openedAt: labeledCfdDate(compact, 'Open time') || dates[0] || new Date().toISOString(),
    closedAt: labeledCfdDate(compact, 'Close time') || dates[1] || dates[0] || new Date().toISOString(),
    profit,
    closeReason: /stop\s*out/i.test(compact) ? 'Stop out' : /stop\s*loss/i.test(compact) ? 'Stop loss' : '',
    commission: labeledCfdMoney(compact, ['Commission']),
    swap: labeledCfdMoney(compact, ['Swap']),
    equity: labeledCfdMoney(compact, ['Equity']),
    strategy: 'Unclassified',
    notes: 'Imported from screenshot.',
  });
}

function parseCfdTableRow(block, ticket) {
  if (/Open price|Close price|P\/L|Commission|Equity/i.test(block)) return null;
  const asset = block.match(/XAU\s*\/?\s*USD|XAG\s*\/?\s*USD|[A-Z]{3}\s*\/?\s*[A-Z]{3}|BTC\s*\/?\s*USD|ETH\s*\/?\s*USD|NAS100|US30/i);
  const side = block.match(/\b(Buy|Sell)\b/i);
  const id = block.match(ticket);
  if (!asset || !side) return null;
  const valueText = id
    ? block.slice(side.index + side[0].length, id.index)
    : stripVisibleDates(block.slice(side.index + side[0].length));
  const rowNumbers = extractRowNumbers(stripVisibleDates(valueText));
  if (rowNumbers.length < 3) return null;
  const signed = [...block.matchAll(/[+-]\s*\d+(?:[.,]\d+)?/g)].map((match) => match[0]);
  const closeReasonProfit = block.match(/(?:stop\s*out|stop\s*loss|take\s*profit)\s+([+-]\s*\d+(?:[.,]\d+)?)/i)?.[1];
  const dates = parseVisibleDates(block);
  return makeTrade({
    market: 'CFD',
    sourceId: id?.[0] || '',
    account: 'CFD',
    asset: slashSymbol(asset[0].replace(/\s*\/\s*/, '/')),
    direction: side[1],
    amount: rowNumbers[0],
    open: rowNumbers[1],
    close: rowNumbers[2],
    openedAt: dates[0] || new Date().toISOString(),
    closedAt: dates[1] || dates[0] || new Date().toISOString(),
    profit: closeReasonProfit || signed.at(-1) || rowNumbers[3] || '',
    closeReason: /stop\s*out/i.test(block) ? 'Stop out' : /stop\s*loss/i.test(block) ? 'Stop loss' : '',
    commission: id && signed.length > 1 ? signed.at(-2) : '',
    strategy: 'Unclassified',
    notes: 'Imported from CFD row screenshot.',
  });
}

function stripVisibleDates(text) {
  return String(text || '')
    .replace(/\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?\b/g, ' ')
    .replace(/\b\d{1,2}[/.]\d{1,2}[/.]\d{4},?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?\b/gi, ' ')
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M\b/gi, ' ')
    .replace(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*,?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?\b/gi, ' ');
}

function extractRowNumbers(text) {
  return [...String(text || '').matchAll(/[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|[+-]?\d+(?:\.\d+)?/g)]
    .map((match) => match[0])
    .filter((value) => value !== '-' && value !== '');
}

function labeledCfdNumber(text, labels) {
  for (const label of labels) {
    const escaped = escapeRegExp(label).replace('\\/', '\\s*\\/\\s*');
    const match = text.match(new RegExp(`${escaped}\\s*:?[\\s\\S]*?([+-]?\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?)`, 'i'));
    if (match) return match[1];
  }
  return '';
}

function labeledCfdMoney(text, labels) {
  for (const label of labels) {
    const escaped = escapeRegExp(label).replace('\\/', '\\s*\\/\\s*');
    const match = text.match(new RegExp(`${escaped}\\s*:?[\\s\\S]*?([+-]?\\s*\\d+(?:[.,]\\d+)?)\\s*(?:USD|\\$)?`, 'i'));
    if (match) return match[1];
  }
  return '';
}

function labeledCfdDate(text, label) {
  const match = text.match(new RegExp(`${escapeRegExp(label)}\\s*:?[\\s\\S]*?((?:\\d{1,2}[/.-]){2}\\d{4}\\s+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s*[AP]M)?)`, 'i'));
  return match ? parseVisibleDate(match[1]) : '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function fileUploadKind(file) {
  if (file?.type?.startsWith('image/')) return 'image';
  if (/\.csv$/i.test(file?.name || '')) return 'csv';
  if (/\.xlsx?$/i.test(file?.name || '')) return 'excel';
  return '';
}

function validateUploadFiles(files, allowedKinds) {
  for (const file of files) {
    const kind = fileUploadKind(file);
    if (!allowedKinds.includes(kind)) continue;
    const limit = MAX_UPLOAD_BYTES[kind];
    if (limit && file.size > limit) {
      return {
        ok: false,
        message: `${file.name} is ${formatBytes(file.size)}. ${title(kind)} uploads are limited to ${formatBytes(limit)} per file.`,
      };
    }
  }
  return { ok: true, message: '' };
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
  const eu = text.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?/i);
  if (eu) return formatVisibleDateParts(eu);
  const named = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)\b/i);
  if (named) return formatNamedDateParts(named);
  const dayNamed = text.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?\b/i);
  if (dayNamed) return formatDayNamedDateParts(dayNamed);
  return '';
}

function formatVisibleDateParts(match) {
  let hour = Number(match[4]);
  const meridiem = (match[7] || '').toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${match[5]}:${match[6] || '00'}`;
}

function formatNamedDateParts(match) {
  const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  let hour = Number(match[3]);
  const meridiem = (match[6] || '').toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  const year = new Date().getFullYear();
  const month = months[String(match[1]).slice(0, 4).toLowerCase()] || months[String(match[1]).slice(0, 3).toLowerCase()] || 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${match[4]}:${match[5] || '00'}`;
}

function formatDayNamedDateParts(match) {
  const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  let hour = Number(match[3]);
  const meridiem = (match[6] || '').toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  const year = new Date().getFullYear();
  const month = months[String(match[2]).slice(0, 4).toLowerCase()] || months[String(match[2]).slice(0, 3).toLowerCase()] || 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${match[4]}:${match[5] || '00'}`;
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
  const tableRows = parseTransactionTableRows(source, fingerprint, provider);
  if (tableRows.length) return mergeTransactions(tableRows);
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
      status: block.match(/S+uccess(?:ed|ful)|Succeeded|Done|Sent|Rejected|Cancelled/i)?.[0] || 'Succeeded',
      fingerprint,
    }));
  });
  return mergeTransactions(results);
}

function parseTransactionTableRows(source, fingerprint, fallbackProvider) {
  const rows = [];
  const rowPattern = /\b(\d{7,15})\s+(\d{1,2}[/.\-]\d{1,2}[/.\-]20\d{2},?\s+\d{1,2}:\d{2}:\d{2})\s+(?:[@®●✓\[\]0-9\s]+)?(S+uccess(?:ed|ful)|Succeeded|Done|Sent|Rejected|Cancelled)\s+(Deposit|Payout|Withdrawal)\s+([A-Za-z][A-Za-z0-9 ._-]*?)\s+([+-]\s*(?:[$S])?\s*\d{1,3}(?:[,.]\d{3})*(?:\.\d{2})|(?:[$S])\s*[+-]?\s*\d{1,3}(?:[,.]\d{3})*(?:\.\d{2}))/gi;
  for (const match of source.matchAll(rowPattern)) {
    const [, sourceId, dateText, status, type, paymentSystem, amountText] = match;
    const date = parseTransactionDate(dateText, new Date().getFullYear());
    if (!date) continue;
    rows.push(makeTransaction({
      id: `${fingerprint.slice(0, 18)}-row-${rows.length}-${sourceId}`,
      sourceId,
      provider: clean(paymentSystem) || fallbackProvider,
      type,
      amount: parseTransactionAmountText(amountText),
      occurredAt: date,
      status: normalizeTransactionStatus(status),
      fingerprint,
    }));
  }
  return dedupeTransactionRows(rows);
}

function parseTransactionAmountText(value) {
  return String(value || '')
    .replace(/[S]/gi, '$')
    .replace(/(?<=\d)\.(?=\d{3}\.)/g, ',')
    .replace(/(?<=\d),(?=\d{2}$)/g, '.');
}

function normalizeTransactionStatus(value) {
  return /reject|cancel/i.test(value) ? value : 'Succeeded';
}

function dedupeTransactionRows(rows) {
  const byExact = new Map();
  rows.forEach((row) => {
    const key = [row.type, row.amount, secondKey(row.occurredAt)].join('|');
    const current = byExact.get(key);
    if (!current || transactionIdScore(row.sourceId) > transactionIdScore(current.sourceId)) byExact.set(key, row);
  });
  return [...byExact.values()];
}

function transactionIdScore(value) {
  const text = clean(value);
  return text.length + (/^0/.test(text) ? -4 : 0);
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
  const locale = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?$/i);
  if (locale) {
    let hour = Number(locale[4]);
    const meridiem = (locale[7] || '').toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    const iso = `${locale[3]}-${locale[2].padStart(2, '0')}-${locale[1].padStart(2, '0')}T${String(hour).padStart(2, '0')}:${locale[5]}:${locale[6] || '00'}`;
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
  if (!authState.user) return 'Google sign-in required';
  if (authState.security !== 'verified') return 'TCX Security verification required';
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

function friendlySecurityError(error) {
  const code = String(error?.code || '');
  if (code === 'TURNSTILE_REQUIRED' || code === 'TURNSTILE_FAILED') return error.message || 'Human verification failed.';
  if (code === 'DEVICE_FINGERPRINT_REQUIRED') return 'This device could not be verified. Refresh and try again.';
  if (code === 'LOGIN_ID_REQUIRED') return 'Enter your Quotex account ID or unlimited username.';
  if (code === 'PASSWORD_REQUIRED') return 'Enter your TCX Security password.';
  if (error?.message?.includes('Failed to fetch')) return 'TCX Security is unreachable from this domain. Check the security origin and allowed origins.';
  return error?.message || 'TCX Security verification failed.';
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

function isTrialCode(value) {
  return String(value || '').trim().toLowerCase() === 'trydemo';
}

let tcxTurnstilePromise;
function loadTcxTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (tcxTurnstilePromise) return tcxTurnstilePromise;
  tcxTurnstilePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile || null);
    script.onerror = () => reject(new Error('Turnstile failed to load.'));
    document.head.appendChild(script);
  });
  return tcxTurnstilePromise;
}

let fingerprintHashPromise;
async function getClientFingerprintHash() {
  if (fingerprintHashPromise) return fingerprintHashPromise;
  fingerprintHashPromise = (async () => {
    const parts = [
      navigator.userAgent || '',
      navigator.language || '',
      navigator.platform || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      String(window.devicePixelRatio || 1),
    ];
    const raw = parts.join('|');
    if (!window.crypto?.subtle) return raw;
    const bytes = new TextEncoder().encode(raw);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  })();
  return fingerprintHashPromise;
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
  background: 'var(--tooltip-bg)',
  border: '1px solid var(--tooltip-border)',
  borderRadius: 8,
  color: 'var(--text)',
  boxShadow: '0 18px 44px rgba(15, 23, 42, .16)',
};

createRoot(document.getElementById('root')).render(<App />);
