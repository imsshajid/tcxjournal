import { compactSignalAsset, payoutLookupKeys, signalAssetLabel, SIGNAL_ASSETS } from './signalAssets';

export const SIGNAL_TIMEFRAMES = ['M1', 'M5', 'M15'];
export const MTF_LADDER = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
export const MIN_PAYOUT = 80;

const INDICATOR_WEIGHTS = {
  last: 8,
  recent: 10,
  emaCross: 10,
  ema21: 8,
  ema921: 10,
  ema2150: 10,
  ema50100: 8,
  emaPrice50: 8,
  macd: 10,
  rsi: 8,
  exhaustion: 10,
};

const TF_WEIGHTS = {
  M5: 1.4,
  M15: 1.8,
  M30: 2.1,
  H1: 2.6,
  H4: 2.2,
  D1: 1.4,
};

export function localHHMM(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function normalizeHHMM(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return '';
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function directionToCallPut(value) {
  const direction = String(value || '').trim().toUpperCase();
  if (['CALL', 'BUY', 'UP', 'GREEN', 'BULLISH'].includes(direction)) return 'CALL';
  if (['PUT', 'SELL', 'DOWN', 'RED', 'BEARISH'].includes(direction)) return 'PUT';
  return 'NEUTRAL';
}

export function directionScore(value) {
  const direction = directionToCallPut(value);
  if (direction === 'CALL') return 1;
  if (direction === 'PUT') return -1;
  return 0;
}

export function parsePercent(value) {
  if (typeof value === 'number') return value;
  const match = String(value || '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

export function extractPayoutMap(data) {
  const map = new Map();
  const seen = new Set();
  const genericKeys = new Set(['ok', 'success', 'status', 'code', 'message', 'error', 'broker', 'type', 'market', 'timestamp']);

  const remember = (asset, value) => {
    const payout = parsePercent(value);
    if (!asset || !Number.isFinite(payout)) return;
    for (const key of payoutLookupKeys(asset)) map.set(key, payout);
  };

  const walk = (node, fallbackAsset = '') => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);

    const asset = node.asset || node.symbol || node.name || node.pair || fallbackAsset;
    remember(asset, node.payout ?? node.percent ?? node.percentage ?? node.return ?? node.value);

    for (const [key, value] of Object.entries(node)) {
      if (!key || genericKeys.has(key.toLowerCase())) continue;
      if (typeof value === 'number' || typeof value === 'string') remember(key, value);
      if (value && typeof value === 'object') walk(value, key);
    }
  };

  walk(data);
  return map;
}

export function payoutForAsset(map, asset) {
  for (const key of payoutLookupKeys(asset)) {
    const payout = map.get(key);
    if (Number.isFinite(payout)) return payout;
  }
  return null;
}

export function tradableAssetsFromPayout(payoutData) {
  const payoutMap = extractPayoutMap(payoutData);
  return SIGNAL_ASSETS
    .map((asset) => ({
      asset,
      label: signalAssetLabel(asset),
      payout: payoutForAsset(payoutMap, asset),
    }))
    .filter((item) => Number.isFinite(item.payout) && item.payout >= MIN_PAYOUT)
    .sort((a, b) => b.payout - a.payout || a.label.localeCompare(b.label));
}

export async function readJsonOrThrow(response, label) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned invalid JSON (${response.status})`);
  }
  if (!response.ok) throw new Error(data?.error || data?.message || `${label} request failed (${response.status})`);
  return data;
}

export async function fetchPayouts() {
  const response = await fetch('/.netlify/functions/signal-payout?broker=quotex', {
    headers: { accept: 'application/json' },
  });
  return readJsonOrThrow(response, 'Payout');
}

export async function fetchMtf(asset) {
  const response = await fetch(`/.netlify/functions/signal-mtf?broker=quotex&asset=${encodeURIComponent(signalAssetLabel(asset))}`, {
    headers: { accept: 'application/json' },
  });
  return readJsonOrThrow(response, 'MTF analysis');
}

export async function fetchApexSignals({ asset, time, timeframe }) {
  const normalizedTime = normalizeHHMM(time);
  const params = new URLSearchParams({
    currency_pairs: compactSignalAsset(asset),
    start: normalizedTime,
    end: normalizedTime,
    timeframe,
    percentage_min: String(MIN_PAYOUT),
    direction: 'BOTH',
    martingale: '0',
    duration: '1',
  });
  const response = await fetch(`/.netlify/functions/apex-otc?${params}`, {
    headers: { accept: 'application/json' },
  });
  return readJsonOrThrow(response, 'Apex OTC');
}

export function findApexMatch(payload, asset, time) {
  const compactAsset = compactSignalAsset(asset);
  const normalizedTime = normalizeHHMM(time);
  const signals = Array.isArray(payload?.signals) ? payload.signals : [];
  return signals.find((signal) => (
    compactSignalAsset(signal.ativos || signal.asset) === compactAsset &&
    normalizeHHMM(signal.entrada || signal.time) === normalizedTime
  )) || null;
}

export function normalizeMtfRows(payload) {
  const map = payload?.timeframes || payload?.data?.timeframes || {};
  return MTF_LADDER
    .map((tf) => normalizeMtfRow(tf, map[tf]))
    .filter(Boolean);
}

function normalizeMtfRow(tf, raw) {
  if (!raw || typeof raw !== 'object') return null;
  const indicators = [
    indicator('Last Candle', 'last', directionScore(raw.last_candle?.direction ?? raw.lastCandle ?? raw.last_candle), INDICATOR_WEIGHTS.last),
    indicator('Last 5', 'recent', candleSequenceScore(raw.recent_candles || raw.last_5 || raw.last5), INDICATOR_WEIGHTS.recent),
    indicator('EMA Cross', 'emaCross', scoreCross(raw.ema_cross_sma_9_12 ?? raw.ema_sma_cross_9_12 ?? raw.ema_cross_signal ?? raw.cross_signal), INDICATOR_WEIGHTS.emaCross),
    indicator('EMA 21', 'ema21', compareNumbers(raw.ema_21 ?? raw.ema21, raw.sma_21 ?? raw.sma21 ?? raw.price), INDICATOR_WEIGHTS.ema21),
    indicator('EMA 9/21', 'ema921', compareNumbers(raw.ema_9 ?? raw.ema9, raw.ema_21 ?? raw.ema21), INDICATOR_WEIGHTS.ema921),
    indicator('EMA 21/50', 'ema2150', compareNumbers(raw.ema_21 ?? raw.ema21, raw.ema_50 ?? raw.ema50), INDICATOR_WEIGHTS.ema2150),
    indicator('EMA 50/100', 'ema50100', compareNumbers(raw.ema_50 ?? raw.ema50, raw.ema_100 ?? raw.ema100), INDICATOR_WEIGHTS.ema50100),
    indicator('EMA P/50', 'emaPrice50', compareNumbers(raw.price ?? raw.close ?? raw.last_price, raw.ema_50 ?? raw.ema50), INDICATOR_WEIGHTS.emaPrice50),
    indicator('MACD', 'macd', compareNumbers(raw.macd ?? raw.macd_line, raw.macd_signal ?? raw.signal), INDICATOR_WEIGHTS.macd),
    indicator('RSI', 'rsi', rsiScore(raw.rsi_14 ?? raw.rsi14 ?? raw.rsi, raw.rsi_signal ?? raw.rsiSignal), INDICATOR_WEIGHTS.rsi),
    indicator('Exhaustion', 'exhaustion', exhaustionScore(raw.exhaustion ?? raw.exhaustion_signal ?? raw.exhaustionSignal), INDICATOR_WEIGHTS.exhaustion),
  ];
  const usable = indicators.filter((item) => Number.isFinite(item.score));
  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0);
  const score = totalWeight ? usable.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight : 0;
  const confidence = Math.round(Math.abs(score) * 100);
  return {
    tf,
    direction: score > 0.12 ? 'CALL' : score < -0.12 ? 'PUT' : 'NEUTRAL',
    score,
    confidence,
    indicators,
  };
}

function indicator(label, key, score, weight) {
  return {
    label,
    key,
    score: Number.isFinite(score) ? Math.max(-1, Math.min(1, score)) : 0,
    weight,
  };
}

function firstNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compareNumbers(a, b) {
  const left = firstNumber(a);
  const right = firstNumber(b);
  if (left == null || right == null) return 0;
  if (left > right) return 1;
  if (left < right) return -1;
  return 0;
}

function scoreCross(value) {
  if (typeof value === 'object' && value) return directionScore(value.direction ?? value.signal ?? value.trend ?? value.value);
  if (typeof value === 'number') return Math.sign(value);
  return directionScore(value);
}

function candleSequenceScore(candles) {
  const list = Array.isArray(candles) ? candles : [];
  if (!list.length) return 0;
  let weighted = 0;
  let total = 0;
  list.slice(-5).forEach((candle, index, arr) => {
    const weight = 1 + index / Math.max(1, arr.length - 1);
    weighted += directionScore(candle?.direction ?? candle) * weight;
    total += weight;
  });
  return total ? weighted / total : 0;
}

function rsiScore(value, signal) {
  const text = String(signal || '').toLowerCase();
  if (text.includes('oversold')) return 0.8;
  if (text.includes('overbought')) return -0.8;
  const rsi = firstNumber(value);
  if (rsi == null) return 0;
  if (rsi <= 30) return 0.8;
  if (rsi >= 70) return -0.8;
  if (rsi <= 42) return -0.25;
  if (rsi >= 58) return 0.25;
  return 0;
}

function exhaustionScore(value) {
  const score = directionScore(value);
  return score ? score * -0.75 : 0;
}

export function decideSignal({ asset, time, timeframe, payout, apexMatch, mtfRows }) {
  if (!apexMatch) {
    return {
      status: 'NO_SIGNAL',
      direction: 'WAIT',
      confidence: 0,
      headline: 'No scheduled match',
      summary: `Apex has no ${timeframe} setup for ${signalAssetLabel(asset)} at ${time}.`,
      checks: [],
    };
  }

  const apexDirection = directionToCallPut(apexMatch.direcao_principal || apexMatch.resultado_backtest?.direcao_geral);
  const apexAccuracy = parsePercent(apexMatch.resultado_backtest?.precisao_geral ?? apexMatch.accuracy);
  const mtf = scoreMtfRows(mtfRows, apexDirection);
  const payoutScore = Math.max(0, Math.min(10, (Number(payout) - MIN_PAYOUT) / 2));
  const apexScore = 30 + Math.max(0, Math.min(15, Number.isFinite(apexAccuracy) ? (apexAccuracy - 80) : 8));
  const conflictPenalty = mtf.opposition >= 0.42 ? 24 : mtf.opposition >= 0.28 ? 14 : 0;
  const rawScore = apexScore + mtf.score + payoutScore - conflictPenalty;
  const confidence = Math.max(0, Math.min(96, Math.round(rawScore)));
  const hasHardConflict = mtf.direction !== 'NEUTRAL' && mtf.direction !== apexDirection && mtf.confidence >= 60;
  const status = hasHardConflict || confidence < 72 ? 'SKIP' : confidence >= 86 ? 'STRONG' : 'VALID';
  const direction = status === 'SKIP' ? 'WAIT' : apexDirection;

  return {
    status,
    direction,
    confidence,
    headline: status === 'STRONG' ? `Strong ${apexDirection}` : status === 'VALID' ? `${apexDirection} setup` : 'Skip this entry',
    summary: buildSummary({ status, apexDirection, apexAccuracy, mtf, payout, conflictPenalty }),
    apexAccuracy: Number.isFinite(apexAccuracy) ? apexAccuracy : null,
    checks: [
      { label: 'Apex exact time', value: 30, state: 'good' },
      { label: 'Apex accuracy', value: Math.round(apexScore - 30), state: (apexAccuracy || 0) >= 90 ? 'good' : 'neutral' },
      { label: 'MTF alignment', value: Math.round(mtf.score), state: mtf.direction === apexDirection ? 'good' : 'warn' },
      { label: 'Payout quality', value: Math.round(payoutScore), state: payout >= 85 ? 'good' : 'neutral' },
      { label: 'Conflict control', value: -conflictPenalty, state: conflictPenalty ? 'bad' : 'good' },
    ],
  };
}

function scoreMtfRows(rows, targetDirection) {
  const targetSign = targetDirection === 'CALL' ? 1 : -1;
  let aligned = 0;
  let opposed = 0;
  let weightedScore = 0;
  let totalWeight = 0;

  for (const row of rows || []) {
    const weight = TF_WEIGHTS[row.tf] || 1;
    const signed = row.score * targetSign;
    totalWeight += weight;
    weightedScore += signed * weight;
    if (signed > 0.12) aligned += weight;
    if (signed < -0.12) opposed += weight;
  }

  const bias = totalWeight ? weightedScore / totalWeight : 0;
  const alignment = totalWeight ? aligned / totalWeight : 0;
  const opposition = totalWeight ? opposed / totalWeight : 0;
  const score = Math.max(0, bias * 24) + alignment * 11;
  return {
    direction: bias > 0.12 ? targetDirection : bias < -0.12 ? (targetDirection === 'CALL' ? 'PUT' : 'CALL') : 'NEUTRAL',
    confidence: Math.round(Math.abs(bias) * 100),
    score,
    alignment,
    opposition,
  };
}

function buildSummary({ status, apexDirection, apexAccuracy, mtf, payout, conflictPenalty }) {
  if (status === 'SKIP') {
    return conflictPenalty
      ? `Apex points ${apexDirection}, but the MTF matrix has too much opposition. Wait for cleaner alignment.`
      : `Apex matched, but the combined score is not strong enough for a clean entry.`;
  }
  const accuracyText = Number.isFinite(apexAccuracy) ? `${apexAccuracy}% apex accuracy` : 'apex schedule match';
  return `${accuracyText}, ${Math.round(mtf.alignment * 100)}% MTF alignment, and ${payout}% payout support this ${apexDirection} setup.`;
}
