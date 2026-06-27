import { compactSignalAsset, payoutLookupKeys, signalAssetLabel, SIGNAL_ASSETS } from './signalAssets';

export const SIGNAL_TIMEFRAMES = ['M1', 'M5', 'M15'];
export const MTF_LADDER = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
export const MIN_PAYOUT = 80;
const DECISION_TIMEFRAMES = ['M1', ...MTF_LADDER];

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
  M1: 1.1,
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
  if (['CALL', 'BUY', 'UP', 'GREEN', 'BULLISH', 'COMPRA'].includes(direction)) return 'CALL';
  if (['PUT', 'SELL', 'DOWN', 'RED', 'BEARISH', 'VENDA'].includes(direction)) return 'PUT';
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

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
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

export async function fetchMtf(asset, { advanced = false, timeframe = 'M1' } = {}) {
  const params = new URLSearchParams({
    broker: 'quotex',
    asset: compactSignalAsset(asset),
    timeframe,
  });
  if (advanced) params.set('advanced', '1');
  const response = await fetch(`/.netlify/functions/signal-mtf?${params}`, {
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
  const order = Array.isArray(payload?.timeframe_order) ? payload.timeframe_order : MTF_LADDER;
  const keys = [...new Set([...order, ...Object.keys(map)])];
  return keys
    .map((tf) => normalizeMtfRow(tf, map[tf]))
    .filter(Boolean);
}

function normalizeMtfRow(tf, raw) {
  if (!raw || typeof raw !== 'object') return null;
  const aggregateScore = countTrendScore(raw);
  const indicators = [
    indicator('Last Candle', 'last', scoreField(pick(raw, 'last_candle', 'lastCandle', 'last_candle_signal', 'last_candle_direction')), INDICATOR_WEIGHTS.last),
    indicator('Last 5', 'recent', candleSequenceScore(pick(raw, 'recent_candles', 'last_5', 'last5', 'last_five')) || scoreField(pick(raw, 'last_5_signal', 'last5_signal')), INDICATOR_WEIGHTS.recent),
    indicator('EMA Cross', 'emaCross', scoreField(pick(raw, 'ema_cross', 'emaCross', 'ema_cross_sma_9_12', 'ema_sma_cross_9_12', 'ema_cross_signal', 'cross_signal')), INDICATOR_WEIGHTS.emaCross),
    indicator('EMA 21', 'ema21', scoreField(pick(raw, 'ema_21_signal', 'ema21_signal', 'ema_21_bias')) || compareNumbers(raw.ema_21 ?? raw.ema21, raw.sma_21 ?? raw.sma21 ?? raw.price), INDICATOR_WEIGHTS.ema21),
    indicator('EMA 9/21', 'ema921', scoreField(pick(raw, 'ema_9_21', 'ema9_21', 'ema_9_21_signal')) || compareNumbers(raw.ema_9 ?? raw.ema9, raw.ema_21 ?? raw.ema21), INDICATOR_WEIGHTS.ema921),
    indicator('EMA 21/50', 'ema2150', scoreField(pick(raw, 'ema_21_50', 'ema21_50', 'ema_21_50_signal')) || compareNumbers(raw.ema_21 ?? raw.ema21, raw.ema_50 ?? raw.ema50), INDICATOR_WEIGHTS.ema2150),
    indicator('EMA 50/100', 'ema50100', scoreField(pick(raw, 'ema_50_100', 'ema50_100', 'ema_50_100_signal')) || compareNumbers(raw.ema_50 ?? raw.ema50, raw.ema_100 ?? raw.ema100), INDICATOR_WEIGHTS.ema50100),
    indicator('EMA P/50', 'emaPrice50', scoreField(pick(raw, 'ema_p_50', 'emaP50', 'ema_price_50', 'price_ema_50_signal')) || compareNumbers(raw.price ?? raw.close ?? raw.last_price, raw.ema_50 ?? raw.ema50), INDICATOR_WEIGHTS.emaPrice50),
    indicator('MACD', 'macd', scoreField(pick(raw, 'macd_direction', 'macd_signal_text', 'macd_bias')) || compareNumbers(raw.macd_histogram, 0) || compareNumbers(raw.macd ?? raw.macd_line, raw.macd_signal ?? raw.signal), INDICATOR_WEIGHTS.macd),
    indicator('RSI', 'rsi', rsiScore(raw.rsi_14 ?? raw.rsi14 ?? raw.rsi, raw.rsi_signal ?? raw.rsiSignal), INDICATOR_WEIGHTS.rsi),
    indicator('Exhaustion', 'exhaustion', exhaustionScore(pick(raw, 'exhaustion', 'exhaustion_signal', 'exhaustionSignal')), INDICATOR_WEIGHTS.exhaustion),
  ];
  const signalIndicators = indicators.filter((item) => Number.isFinite(item.score) && Math.abs(item.score) > 0.01);
  const usable = signalIndicators.length ? signalIndicators : indicators.filter((item) => Number.isFinite(item.score));
  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0);
  const indicatorScore = totalWeight ? usable.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight : 0;
  const score = signalIndicators.length ? indicatorScore : (Number.isFinite(aggregateScore) ? aggregateScore : indicatorScore);
  const confidence = Math.round(Math.abs(score) * 100);
  return {
    tf,
    direction: score > 0.12 ? 'CALL' : score < -0.12 ? 'PUT' : 'NEUTRAL',
    score,
    confidence,
    indicators,
  };
}

export function buildSignalXFallback({ asset, time, timeframe, mtfRows }) {
  const matrix = inferSignalXMatrix(mtfRows, timeframe);
  if (!matrix || matrix.direction === 'NEUTRAL') return null;

  const accuracy = clamp(Math.round(matrix.probability - 8), 62, 82);
  return {
    asset,
    entrada: time,
    time,
    direcao_principal: matrix.direction,
    accuracy,
    matrixProbability: matrix.probability,
    matrixAlignment: matrix.alignment,
    generated: true,
    source: 'signalx-mtf-fallback',
    resultado_backtest: {
      precisao_geral: accuracy,
      direcao_geral: matrix.direction,
    },
  };
}

function inferSignalXMatrix(rows, selectedTimeframe) {
  const usableRows = (rows || []).filter((row) => Number.isFinite(row?.score));
  if (!usableRows.length) return null;

  const selectedTf = DECISION_TIMEFRAMES.includes(selectedTimeframe) ? selectedTimeframe : 'M5';
  const selected = usableRows.find((row) => row.tf === selectedTf) || usableRows[0];
  const selectedScore = selected?.score ?? 0;
  let direction = selectedScore > 0 ? 'CALL' : selectedScore < 0 ? 'PUT' : 'NEUTRAL';

  if (Math.abs(selectedScore) < 0.06) {
    const dominant = dominantMtfDirection(usableRows);
    if (!dominant || Math.abs(dominant.bias) < 0.12) return null;
    direction = dominant.direction;
  }

  const dirSign = direction === 'CALL' ? 1 : -1;
  let alignedWeight = 0;
  let opposingWeight = 0;
  let neutralWeight = 0;
  let signedTotal = 0;
  let totalWeight = 0;

  for (const row of usableRows) {
    const score = row.score ?? 0;
    const weight = signalXDecisionWeight(row.tf, selectedTf);
    totalWeight += weight;
    signedTotal += score * dirSign * weight;

    if (Math.abs(score) < 0.12) neutralWeight += weight;
    else if ((score * dirSign) > 0) alignedWeight += weight;
    else opposingWeight += weight;
  }

  const activeWeight = alignedWeight + opposingWeight + (neutralWeight * 0.25);
  const alignment = activeWeight ? alignedWeight / activeWeight : 0;
  const directionalBias = totalWeight ? signedTotal / totalWeight : 0;
  const avgStrength = usableRows.reduce((sum, row) => sum + Math.abs(row.score ?? 0), 0) / usableRows.length;
  const higherOpposition = usableRows.some((row) => {
    const rowIndex = DECISION_TIMEFRAMES.indexOf(row.tf);
    const selectedIndex = DECISION_TIMEFRAMES.indexOf(selectedTf);
    return rowIndex > selectedIndex && Math.abs(row.score ?? 0) >= 0.72 && ((row.score ?? 0) * dirSign) < 0;
  });

  let probability = 54 + (Math.abs(selectedScore) * 28) + (Math.max(0, directionalBias) * 16) + (alignment * 14) - ((opposingWeight / Math.max(totalWeight, 1)) * 12);
  if (higherOpposition) probability -= 10;
  probability = clamp(Math.round(probability), 0, 96);

  if (
    probability < 58 ||
    alignment < 0.34 ||
    directionalBias < -0.12 ||
    avgStrength < 0.08 ||
    (higherOpposition && probability < 72)
  ) {
    return null;
  }

  return { direction, probability, alignment, directionalBias };
}

function dominantMtfDirection(rows) {
  let weighted = 0;
  let total = 0;
  for (const row of rows) {
    const weight = TF_WEIGHTS[row.tf] || 1;
    weighted += (row.score ?? 0) * weight;
    total += weight;
  }
  const bias = total ? weighted / total : 0;
  if (bias > 0.12) return { direction: 'CALL', bias };
  if (bias < -0.12) return { direction: 'PUT', bias };
  return null;
}

function signalXDecisionWeight(tf, selectedTf) {
  const rowIndex = DECISION_TIMEFRAMES.indexOf(tf);
  const selectedIndex = DECISION_TIMEFRAMES.indexOf(selectedTf);
  const base = TF_WEIGHTS[tf] || 1;
  if (rowIndex < 0 || selectedIndex < 0) return base;
  if (rowIndex < selectedIndex) return base * 0.35;
  if (rowIndex === selectedIndex) return base * 1.45;
  return base * (1 + ((rowIndex - selectedIndex) * 0.08));
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

function countTrendScore(raw) {
  const tendencyScore = directionScore(raw.tendency ?? raw.majority ?? raw.trend ?? raw.direction);
  const calls = firstNumber(raw.call_count ?? raw.callCount ?? raw.calls ?? raw.green_count ?? raw.greenCount);
  const puts = firstNumber(raw.put_count ?? raw.putCount ?? raw.puts ?? raw.red_count ?? raw.redCount);

  if (calls == null || puts == null) return tendencyScore || NaN;

  const active = calls + puts;
  if (!active) return tendencyScore || NaN;

  const countScore = (calls - puts) / active;
  if (!tendencyScore) return countScore;
  if (Math.sign(countScore) === tendencyScore) {
    return tendencyScore * clamp(0.28 + (Math.abs(countScore) * 1.25), 0.28, 0.78);
  }
  if (Math.abs(countScore) >= 0.12) return countScore;

  return tendencyScore * (0.18 + Math.min(0.32, Math.abs(countScore) * 2));
}

function pick(raw, ...keys) {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw[key] !== null && raw[key] !== '') return raw[key];
  }
  return undefined;
}

function scoreField(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (Array.isArray(value) && value.length >= 2) return compareNumbers(value[0], value[1]);
  if (typeof value === 'number') return Math.sign(value);
  if (typeof value === 'object') {
    const direct = value.direction ?? value.signal ?? value.trend ?? value.bias ?? value.value ?? value.result;
    const directScore = scoreField(direct);
    if (directScore) return directScore;
    const left = value.left ?? value.fast ?? value.ema ?? value.first ?? value.a ?? value.current;
    const right = value.right ?? value.slow ?? value.sma ?? value.second ?? value.b ?? value.baseline;
    return compareNumbers(left, right);
  }
  const text = String(value);
  const directScore = directionScore(text);
  if (directScore) return directScore;
  const nums = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  if (nums.length >= 2) return compareNumbers(nums[0], nums[1]);
  return 0;
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
    const matrix = inferSignalXMatrix(mtfRows, timeframe);
    const hasMtfData = Array.isArray(mtfRows) && mtfRows.length > 0;
    return {
      status: 'NO_SIGNAL',
      direction: 'WAIT',
      confidence: matrix?.probability || 0,
      headline: 'No clean setup',
      summary: matrix
        ? `Apex has no exact ${timeframe} setup for ${signalAssetLabel(asset)} at ${time}, and the MTF fallback is not clean enough to enter.`
        : hasMtfData
          ? `Apex has no exact ${timeframe} setup for ${signalAssetLabel(asset)} at ${time}, and the MTF matrix is too conflicted for a clean fallback entry.`
          : `Apex has no exact ${timeframe} setup for ${signalAssetLabel(asset)} at ${time}, and MTF did not return data.`,
      sourceLabel: 'No catalogue match',
      checks: hasMtfData ? [
        { label: 'MTF frames', value: mtfRows.length, state: matrix ? 'warn' : 'neutral' },
      ] : [],
    };
  }

  const isFallback = apexMatch.generated || apexMatch.source === 'signalx-mtf-fallback';
  const apexDirection = directionToCallPut(apexMatch.direcao_principal || apexMatch.resultado_backtest?.direcao_geral);
  const apexAccuracy = parsePercent(apexMatch.resultado_backtest?.precisao_geral ?? apexMatch.accuracy);
  const mtf = scoreMtfRows(mtfRows, apexDirection);
  const payoutScore = Math.max(0, Math.min(10, (Number(payout) - MIN_PAYOUT) / 2));
  const apexScore = isFallback
    ? 34 + Math.max(0, Math.min(8, Number.isFinite(apexAccuracy) ? (apexAccuracy - 70) / 2 : 4))
    : 30 + Math.max(0, Math.min(15, Number.isFinite(apexAccuracy) ? (apexAccuracy - 80) : 8));
  const conflictPenalty = mtf.opposition >= 0.42 ? 24 : mtf.opposition >= 0.28 ? 14 : 0;
  const rawScore = apexScore + mtf.score + payoutScore - conflictPenalty;
  const confidence = Math.max(
    0,
    Math.min(96, Math.round(isFallback ? Math.max(rawScore, apexMatch.matrixProbability || 0) : rawScore)),
  );
  const hasHardConflict = mtf.direction !== 'NEUTRAL' && mtf.direction !== apexDirection && mtf.confidence >= 60;
  const validThreshold = isFallback ? 50 : 72;
  const strongThreshold = isFallback ? 78 : 86;
  const status = hasHardConflict || confidence < validThreshold ? 'SKIP' : confidence >= strongThreshold ? 'STRONG' : 'VALID';
  const direction = status === 'SKIP' ? 'WAIT' : apexDirection;

  return {
    status,
    direction,
    confidence,
    headline: status === 'STRONG' ? `Strong ${apexDirection}` : status === 'VALID' ? `${apexDirection} setup` : 'Skip this entry',
    summary: buildSummary({ status, apexDirection, apexAccuracy, mtf, payout, conflictPenalty, isFallback }),
    apexAccuracy: Number.isFinite(apexAccuracy) ? apexAccuracy : null,
    sourceLabel: isFallback
      ? `${Number.isFinite(apexAccuracy) ? apexAccuracy : Math.round(confidence)}% SignalX fallback`
      : `${Number.isFinite(apexAccuracy) ? apexAccuracy : Math.round(confidence)}% apex`,
    checks: [
      { label: isFallback ? 'SignalX fallback' : 'Apex exact time', value: Math.round(apexScore), state: isFallback ? 'warn' : 'good' },
      { label: isFallback ? 'Estimated edge' : 'Apex accuracy', value: Math.round(isFallback ? Math.max(0, apexScore - 34) : apexScore - 30), state: (apexAccuracy || 0) >= (isFallback ? 76 : 90) ? 'good' : 'neutral' },
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

function buildSummary({ status, apexDirection, apexAccuracy, mtf, payout, conflictPenalty, isFallback }) {
  if (status === 'SKIP') {
    if (isFallback) {
      return conflictPenalty
        ? `SignalX-style MTF points ${apexDirection}, but the matrix has too much opposition. Wait for cleaner alignment.`
        : `SignalX-style MTF found a ${apexDirection} edge, but the fallback score is still too low for a clean entry.`;
    }
    return conflictPenalty
      ? `Apex points ${apexDirection}, but the MTF matrix has too much opposition. Wait for cleaner alignment.`
      : `Apex matched, but the combined score is not strong enough for a clean entry.`;
  }
  if (isFallback) {
    const accuracyText = Number.isFinite(apexAccuracy) ? `${apexAccuracy}% estimated edge` : 'SignalX-style MTF fallback';
    return `No exact Apex catalogue match, so TCX used ${accuracyText}, ${Math.round(mtf.alignment * 100)}% MTF alignment, and ${payout}% payout for this ${apexDirection} setup.`;
  }
  const accuracyText = Number.isFinite(apexAccuracy) ? `${apexAccuracy}% apex accuracy` : 'apex schedule match';
  return `${accuracyText}, ${Math.round(mtf.alignment * 100)}% MTF alignment, and ${payout}% payout support this ${apexDirection} setup.`;
}
