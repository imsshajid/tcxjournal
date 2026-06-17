import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileUp,
  Home,
  ImageUp,
  Layers3,
  Menu,
  Plus,
  Search,
  Settings,
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
const DEFAULT_SETTINGS = {
  enabled: { FTT: true, CFD: true },
  defaultMarket: 'ALL',
  ocrMode: 'AUTO',
};
const IMPORT_LATER_KEY = 'tcxjournal.importLater.v1';
const STRATEGIES = ['Support & Resistance', 'Trend Following', 'Breakout', 'Reversal', 'Scalping', 'News Trading', 'Fibonacci', 'Moving Average', 'Bollinger Bands', 'RSI Divergence', 'OTC Strategy', 'Imported', 'Screenshot', 'Unclassified'];
const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'Revenge', 'Bored', 'Focused', 'Patient', 'Neutral'];
const TIMEFRAMES = ['10s', '15s', '30s', '1m', '2m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];

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
  const hasFttResult = input.income !== undefined || input.resultAmount !== undefined;
  const income = input.income === undefined ? input.resultAmount : input.income;
  const netProfit =
    market === 'FTT'
      ? hasFttResult ? calculateFttNet(amount, income) : toNumber(input.profit)
      : toNumber(input.profit);
  return {
    id: input.id || crypto.randomUUID(),
    sourceId: clean(input.sourceId || input.ticket || input.positionId || input.ID || ''),
    market,
    account: input.account || (market === 'FTT' ? 'Quotex' : 'CFD'),
    asset: normalizeAsset(input.asset || input.symbol || input.info || ''),
    direction: normalizeDirection(input.direction || input.type || ''),
    amount,
    income: market === 'FTT' ? toNumber(income) : '',
    payout: market === 'FTT' ? normalizePayout(input.payout, amount, income) : '',
    profit: netProfit,
    result: tradeResult(netProfit),
    open: cleanNumber(input.open ?? input.openingPrice ?? input.opening_price),
    close: cleanNumber(input.close ?? input.closingPrice ?? input.closing_price),
    openedAt: toIso(input.openedAt || input.openingTime || input.opening_time_utc || input.open_time),
    closedAt: toIso(input.closedAt || input.closingTime || input.closing_time_utc || input.close_time),
    duration: input.duration || input.timeframe || durationBetween(input.openedAt || input.openingTime, input.closedAt || input.closingTime),
    strategy: input.strategy || 'Unclassified',
    session: input.session || inferForexSession(input.openedAt || input.openingTime || input.opening_time_utc || input.open_time),
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
    if (!parsed) return { trades: seedTrades, settings: DEFAULT_SETTINGS };
    return {
      trades: (parsed.trades || seedTrades).map((t) => makeTrade(t)),
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}), enabled: { ...DEFAULT_SETTINGS.enabled, ...(parsed.settings?.enabled || {}) } },
    };
  } catch {
    return { trades: seedTrades, settings: DEFAULT_SETTINGS };
  }
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

  useEffect(() => localStorage.setItem(LS, JSON.stringify(data)), [data]);

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
    if (fresh.length) {
      setData((current) => ({ ...current, trades: [...fresh, ...current.trades] }));
    }
    return { added: fresh.length, skipped: normalized.length - fresh.length, detected: normalized.length };
  };

  const saveTrade = (trade) => importTrades([trade]);
  const deleteTrade = (id) => setData((current) => ({ ...current, trades: current.trades.filter((t) => t.id !== id) }));
  const updateTrade = (trade) => {
    const normalized = makeTrade(trade);
    setData((current) => ({
      ...current,
      trades: current.trades.map((item) => item.id === normalized.id ? normalized : item),
    }));
    setEditingTrade(null);
    setActiveTrade(normalized);
  };
  const removeTrade = (id) => {
    deleteTrade(id);
    setActiveTrade(null);
    setEditingTrade(null);
  };
  const updateSettings = (settings) => {
    setData((current) => ({ ...current, settings: { ...current.settings, ...settings } }));
    if (settings.defaultMarket) setMarket(settings.defaultMarket);
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
        {page === 'Analytics' && <Analytics trades={trades} />}
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
        {page === 'Settings' && <SettingsPage settings={data.settings} updateSettings={updateSettings} />}
      </main>
      <BottomNav page={page} setPage={setPage} />
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
        <Sparkles size={18} />
        <span>Free OCR fallback active</span>
      </div>
    </aside>
  );
}

function Topbar({ page, market, setMarket, settings, setPage, openNav }) {
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
  const singleDay = trades.length > 0 && new Set(trades.map((t) => dateKey(t.openedAt))).size === 1;
  const data = [...trades]
    .sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt))
    .map((t) => ({ date: singleDay ? timeOnly(t.openedAt) : shortDate(t.openedAt), pnl: running += toNumber(t.profit) }));
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
          <XAxis dataKey="date" stroke="#7f8da1" />
          <YAxis stroke="#7f8da1" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
          <Area type="monotone" dataKey="pnl" stroke="#35d49a" strokeWidth={2.5} fill="url(#equityFill)" />
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
    { name: 'Win', value: trades.filter((t) => t.result === 'WIN').length, color: '#35d49a' },
    { name: 'Loss', value: trades.filter((t) => t.result === 'LOSS').length, color: '#f65f6f' },
    { name: 'Draw', value: trades.filter((t) => t.result === 'DRAW').length, color: '#d7b56d' },
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
        <Info label="Win rate" value={`${winRate(trades).toFixed(1)}%`} />
        <Info label="Avg win" value={money(average(wins))} />
        <Info label="Avg loss" value={money(-average(losses))} />
        <Info label="Best asset" value={bestAsset ? `${bestAsset[0]} ${money(bestAsset[1].pnl)}` : '-'} />
        <Info label="Most traded" value={busiestAsset ? `${busiestAsset[0]} (${busiestAsset[1].count})` : '-'} />
      </div>
    </div>
  );
}

function CalendarPage({ trades, selectedDate, selectedTrades, onDatePick, clearDate, onOpenTrade, onEditTrade }) {
  const [showAll, setShowAll] = useState(false);
  const listTrades = selectedDate ? selectedTrades : (showAll ? trades : trades.slice(0, 8));
  const sideTrades = selectedDate ? selectedTrades : trades;
  return (
    <section className="page calendarPage">
      <CalendarPanel trades={trades} selectedDate={selectedDate} onDatePick={onDatePick} full />
      <div className="calendarSide">
        <CalendarInsightPanel trades={sideTrades} selectedDate={selectedDate} />
        <TradeList
          title={selectedDate ? `Trades on ${formatDate(selectedDate)}` : showAll ? 'All Trades' : 'Recent Trades'}
          trades={listTrades}
          empty="No trades on this day."
          deleteTrade={undefined}
          onOpenTrade={onOpenTrade}
          onEditTrade={onEditTrade}
          actionSlot={
            <button className="soft tiny" onClick={() => setShowAll((current) => !current)}>
              {showAll ? 'Recent' : 'All trades'}
            </button>
          }
        />
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

function TradeList({ title = 'Trade History', trades, compact = false, deleteTrade, empty = 'No trades yet.', onOpenTrade, onEditTrade, actionSlot }) {
  return (
    <div className={`card tableCard ${compact ? '' : 'wideCard'}`}>
      <PanelTitle title={title} tag={`${trades.length} trades`} action={actionSlot} />
      <div className="table">
        <div className="trow head">
          <span>Trade</span><span>Setup</span><span>Session</span><span>Result</span>{!compact && <span />}
        </div>
        {trades.map((trade) => (
          <div className="trow tradeButton" key={trade.id} role="button" tabIndex={0} onClick={() => onOpenTrade?.(trade)} onKeyDown={(e) => e.key === 'Enter' && onOpenTrade?.(trade)}>
            <div className="tradeIdentity">
              <b>{trade.asset}</b>
              <small>{shortDate(trade.openedAt)} - {timeOnly(trade.openedAt)} - {trade.market} {trade.direction}</small>
            </div>
            <span className="chipLine"><i>{trade.strategy}</i><i>{trade.emotion}</i></span>
            <span>{trade.session}<small>{trade.duration || 'Timed trade'}</small></span>
            <span className={trade.profit >= 0 ? 'green' : 'red'}>
              {money(trade.profit)}
              {trade.market === 'FTT' && <small>{trade.payout || 90}% payout</small>}
            </span>
            {!compact && (
              <span className="rowActions" onClick={(e) => e.stopPropagation()}>
                <button className="iconBtn" onClick={() => onOpenTrade?.(trade)}><Eye size={15} /></button>
                <button className="iconBtn" onClick={() => onEditTrade?.(trade)}><Edit3 size={15} /></button>
                <button className="iconBtn danger" onClick={() => deleteTrade?.(trade.id)}><Trash2 size={15} /></button>
              </span>
            )}
          </div>
        ))}
        {!trades.length && <div className="empty">{empty}</div>}
      </div>
    </div>
  );
}

function NewTrade({ onSave, onImport, settings, onOpenTrade }) {
  const [market, setMarket] = useState(settings.defaultMarket === 'CFD' ? 'CFD' : 'FTT');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    account: 'Quotex',
    asset: 'USD/JPY',
    direction: 'UP',
    amount: 10,
    income: 19,
    payout: 90,
    profit: 9,
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
    if (key === 'income' || key === 'amount') next.payout = normalizePayout('', key === 'amount' ? value : next.amount, key === 'income' ? value : next.income);
    return next;
  });
  const switchMarket = (next) => {
    setMarket(next);
    setForm((current) => ({
      ...current,
      account: next === 'FTT' ? 'Quotex' : 'MT5',
      direction: next === 'FTT' ? 'UP' : 'BUY',
      payout: next === 'FTT' ? current.payout || 90 : '',
      income: next === 'FTT' ? current.income || 0 : '',
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
        <Importer onImport={onImport} settings={settings} />
        <div className="orDivider"><span>or fill manually</span></div>
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
      </div>
    </section>
  );
}

function Importer({ onImport, settings }) {
  const [mode, setMode] = useState(settings.ocrMode || 'AUTO');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(IMPORT_LATER_KEY)) || []; } catch { return []; }
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const fileRef = useRef();

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

  const updateDraft = (id, key, value) => setDrafts((current) => current.map((trade) => trade.id === id ? makeTrade({ ...trade, [key]: value }) : trade));
  const saveDrafts = () => {
    const result = onImport(drafts);
    setStatus(`${result.added} new saved. ${result.skipped} duplicate skipped.`);
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
            <button className="soft dangerText" onClick={skipAll}><X size={16} />Skip all</button>
            <button className="soft" onClick={logLater}><StickyNote size={16} />Log later</button>
            <button className="primary" onClick={saveDrafts}><Check size={18} />Save all reviewed trades</button>
          </div>
        </div>
      )}
    </div>
  );
}

function History({ trades, deleteTrade, onOpenTrade, onEditTrade }) {
  const exportCsv = () => {
    const headers = ['market', 'sourceId', 'asset', 'direction', 'amount', 'income', 'payout', 'profit', 'open', 'close', 'openedAt', 'closedAt', 'closeReason'];
    const rows = trades.map((trade) => headers.map((key) => csvCell(trade[key])).join(','));
    downloadText([headers.join(','), ...rows].join('\n'), 'tcxjournal-trades.csv', 'text/csv');
  };
  return (
    <section className="page">
      <div className="toolbar">
        <button className="soft" onClick={exportCsv}><Download size={17} />Export CSV</button>
      </div>
      <TradeList trades={trades} deleteTrade={deleteTrade} onOpenTrade={onOpenTrade} onEditTrade={onEditTrade} />
    </section>
  );
}

function Analytics({ trades }) {
  const byAsset = Object.entries(trades.reduce((acc, trade) => {
    acc[trade.asset] = (acc[trade.asset] || 0) + toNumber(trade.profit);
    return acc;
  }, {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const byEmotion = Object.entries(trades.reduce((acc, trade) => {
    acc[trade.emotion] = (acc[trade.emotion] || 0) + toNumber(trade.profit);
    return acc;
  }, {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const bySession = Object.entries(trades.reduce((acc, trade) => {
    acc[trade.session] = (acc[trade.session] || 0) + toNumber(trade.profit);
    return acc;
  }, {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const biggestWin = [...trades].sort((a, b) => b.profit - a.profit)[0];
  const biggestLoss = [...trades].sort((a, b) => a.profit - b.profit)[0];
  return (
    <section className="page analyticsPage">
      <Stats trades={trades} />
      <div className="analyticsGrid">
        <EquityPanel trades={trades} />
        <OutcomePanel trades={trades} />
        <div className="card insightCard">
          <PanelTitle title="Edge Map" tag="Ranked" />
          <MiniRank title="Assets" rows={byAsset.slice(0, 6)} />
          <MiniRank title="Emotions" rows={byEmotion.slice(0, 6)} />
        </div>
        <div className="card insightCard">
          <PanelTitle title="Session Quality" tag="P&L" />
          <MiniRank title="Sessions" rows={bySession.slice(0, 4)} />
          <div className="detailGrid">
            <Info label="Biggest win" value={biggestWin ? `${biggestWin.asset} ${money(biggestWin.profit)}` : '-'} />
            <Info label="Biggest loss" value={biggestLoss ? `${biggestLoss.asset} ${money(biggestLoss.profit)}` : '-'} />
          </div>
        </div>
        <StrategyPanel trades={trades} />
      </div>
    </section>
  );
}

function SettingsPage({ settings, updateSettings }) {
  const toggle = (market) => updateSettings({ enabled: { ...settings.enabled, [market]: !settings.enabled[market] } });
  return (
    <section className="page narrow">
      <div className="card settings">
        <PanelTitle title="Settings" tag="Local" />
        <div className="settingsRows">
          <label><span>Default view</span><select value={settings.defaultMarket} onChange={(e) => updateSettings({ defaultMarket: e.target.value })}><option>ALL</option><option>FTT</option><option>CFD</option></select></label>
          <label><span>OCR preference</span><select value={settings.ocrMode} onChange={(e) => updateSettings({ ocrMode: e.target.value })}><option>AUTO</option><option>FTT</option><option>CFD</option></select></label>
          <div className="toggleRow"><span>FTT journal</span><button className={settings.enabled.FTT ? 'toggle on' : 'toggle'} onClick={() => toggle('FTT')} /></div>
          <div className="toggleRow"><span>CFD journal</span><button className={settings.enabled.CFD ? 'toggle on' : 'toggle'} onClick={() => toggle('CFD')} /></div>
        </div>
        <div className="storageNote">
          <b>Storage</b>
          <span>Browser local storage is active. No paid database is required.</span>
        </div>
      </div>
    </section>
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

function TradeEditorModal({ trade, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => ({ ...makeTrade(trade), openedAt: inputDateTime(trade.openedAt), closedAt: inputDateTime(trade.closedAt) }));
  const set = (key, value) => setDraft((current) => {
    const next = { ...current, [key]: value };
    if (key === 'openedAt') next.session = inferForexSession(value);
    if (key === 'income' || key === 'amount') next.payout = normalizePayout('', key === 'amount' ? value : next.amount, key === 'income' ? value : next.income);
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
        {trades.map((trade) => (
          <button key={trade.id} className="miniTrade" onClick={() => onOpenTrade(trade)}>
            <b>{trade.asset}</b>
            <span>{trade.strategy} - {trade.emotion}</span>
            <strong className={trade.profit >= 0 ? 'green' : 'red'}>{money(trade.profit)}</strong>
          </button>
        ))}
        {!trades.length && <p className="empty">No trades on this day.</p>}
      </div>
    </Modal>
  );
}

function TradeFormFields({ draft, set }) {
  const isFtt = draft.market === 'FTT';
  return (
    <div className="form">
      <div className="twoBtns">
        <button className={['UP', 'BUY'].includes(draft.direction) ? 'selected up' : ''} onClick={() => set('direction', isFtt ? 'UP' : 'BUY')}>
          {isFtt ? 'CALL (Up)' : 'BUY'}
        </button>
        <button className={['DOWN', 'SELL'].includes(draft.direction) ? 'selected dn' : ''} onClick={() => set('direction', isFtt ? 'DOWN' : 'SELL')}>
          {isFtt ? 'PUT (Down)' : 'SELL'}
        </button>
      </div>
      <div className="fields">
        <Input label="Asset" value={draft.asset} onChange={(v) => set('asset', v)} />
        <Input label="Trade date" type="datetime-local" value={inputDateTime(draft.openedAt)} onChange={(v) => set('openedAt', v)} />
        <Input label={isFtt ? 'Amount ($)' : 'Lot'} type="number" value={draft.amount} onChange={(v) => set('amount', v)} />
        {isFtt ? (
          <>
            <Input label="Payout %" type="number" value={draft.payout} onChange={(v) => set('payout', v)} />
            <Input label="Result" type="number" value={draft.income} onChange={(v) => set('income', v)} />
          </>
        ) : (
          <Input label="P/L" type="number" value={draft.profit} onChange={(v) => set('profit', v)} />
        )}
        <Input label="Entry price" value={draft.open} onChange={(v) => set('open', v)} />
        <Input label="Exit price" value={draft.close} onChange={(v) => set('close', v)} />
        <Select label="Strategy" value={draft.strategy} onChange={(v) => set('strategy', v)} options={STRATEGIES} />
        <Select label="Timeframe" value={draft.duration || '1m'} onChange={(v) => set('duration', v)} options={TIMEFRAMES} />
        <Select label="Session" value={draft.session || inferForexSession(draft.openedAt)} onChange={(v) => set('session', v)} options={['Sydney', 'Tokyo', 'London', 'New York', 'Unassigned']} />
        <Select label="Emotion" value={draft.emotion || 'Neutral'} onChange={(v) => set('emotion', v)} options={EMOTIONS} />
      </div>
      <label className="area"><span>Notes</span><textarea value={draft.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>
      <div className="pnlPreview">
        <span>Calculated P&L</span>
        <b className={makeTrade(draft).profit >= 0 ? 'green' : 'red'}>{money(makeTrade(draft).profit)}</b>
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
  const rows = file.name.toLowerCase().endsWith('.csv')
    ? rowsFromMatrix(parseCsv(await file.text()))
    : rowsFromMatrix(await readXlsxFile(file));
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]).map(normalizeHeader);
  const isFtt = keys.includes('info') && keys.includes('income') && keys.includes('open_time');
  const isCfd = keys.includes('ticket') && keys.includes('opening_time_utc') && keys.includes('profit');
  if (!isFtt && !isCfd) throw new Error('no-trades');
  return rows.map((row) => isFtt ? mapFttRow(row) : mapCfdRow(row)).filter(Boolean);
}

function mapFttRow(row) {
  const get = getter(row);
  const amount = toNumber(get('Amount'));
  const income = toNumber(get('Income'));
  return makeTrade({
    market: 'FTT',
    sourceId: get('ID'),
    account: 'Quotex',
    asset: get('Info'),
    direction: get('Type'),
    amount,
    income,
    payout: get('Profit'),
    open: get('Open Price'),
    close: get('Close Price'),
    openedAt: get('Open time'),
    closedAt: get('Close Time'),
    strategy: 'Imported',
  });
}

function mapCfdRow(row) {
  const get = getter(row);
  return makeTrade({
    market: 'CFD',
    sourceId: get('ticket'),
    account: 'CFD',
    asset: slashSymbol(get('symbol')),
    direction: get('type'),
    amount: get('lots') || get('original_position_size'),
    open: get('opening_price'),
    close: get('closing_price'),
    openedAt: get('opening_time_utc'),
    closedAt: get('closing_time_utc'),
    profit: get('profit'),
    closeReason: get('close_reason'),
    commission: get('commission'),
    swap: get('swap'),
    equity: get('equity'),
    strategy: 'Imported',
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
          strategy: 'Screenshot',
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
          strategy: 'Screenshot',
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

function inferForexSession(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Unassigned';
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
  return sessions.find(([, range]) => inUtcWindow(hour, range[0], range[1]))?.[0] || 'Unassigned';
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
  if (!stake || !resultAmount) return 90;
  const calculated = resultAmount > stake ? ((resultAmount - stake) / stake) * 100 : (resultAmount / stake) * 100;
  return Number.isFinite(calculated) && calculated > 0 ? Math.round(calculated) : 90;
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

function getter(row) {
  const entries = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});
  return (name) => entries[normalizeHeader(name)] ?? '';
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

function toIso(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim().replace(' ', 'T');
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  return new Date().toISOString();
}

function inputDateTime(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function dateKey(value) {
  if (value instanceof Date) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function timeOnly(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function durationBetween(start, end) {
  if (!start || !end) return '';
  const ms = new Date(end) - new Date(start);
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const seconds = Math.round(ms / 1000);
  return `00:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
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

function average(values) {
  return values.length ? values.reduce((total, value) => total + toNumber(value), 0) / values.length : 0;
}

function winRate(trades) {
  return trades.length ? trades.filter((trade) => trade.result === 'WIN').length / trades.length * 100 : 0;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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
