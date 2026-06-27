import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  decideSignal,
  fetchApexSignals,
  fetchMtf,
  fetchPayouts,
  findApexMatch,
  localHHMM,
  MIN_PAYOUT,
  MTF_LADDER,
  normalizeHHMM,
  normalizeMtfRows,
  SIGNAL_TIMEFRAMES,
  tradableAssetsFromPayout,
} from './signalEngine';
import { signalAssetLabel } from './signalAssets';

export default function SignalGenerator() {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [query, setQuery] = useState('');
  const [time, setTime] = useState(localHHMM());
  const [timeframe, setTimeframe] = useState('M1');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [mtfRows, setMtfRows] = useState([]);

  const selected = useMemo(
    () => assets.find((item) => item.asset === selectedAsset) || assets[0],
    [assets, selectedAsset],
  );

  const visibleAssets = useMemo(() => {
    const search = query.trim().toLowerCase();
    return assets.filter((item) => !search || `${item.label} ${item.asset}`.toLowerCase().includes(search));
  }, [assets, query]);

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (!selectedAsset && assets.length) setSelectedAsset(assets[0].asset);
  }, [assets, selectedAsset]);

  async function loadAssets() {
    setLoadingAssets(true);
    setError('');
    try {
      const payoutData = await fetchPayouts();
      const nextAssets = tradableAssetsFromPayout(payoutData);
      setAssets(nextAssets);
      if (nextAssets.length && !nextAssets.some((item) => item.asset === selectedAsset)) {
        setSelectedAsset(nextAssets[0].asset);
      }
    } catch (loadError) {
      setError(loadError.message || 'Could not load payout data.');
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }

  async function generateSignal() {
    const asset = selected?.asset;
    const entryTime = normalizeHHMM(time);
    if (!asset || !entryTime) return;

    setGenerating(true);
    setError('');
    setResult(null);
    setMtfRows([]);

    try {
      const apexPayload = await fetchApexSignals({ asset, time: entryTime, timeframe });
      const apexMatch = findApexMatch(apexPayload, asset, entryTime);

      if (!apexMatch) {
        setResult(decideSignal({
          asset,
          time: entryTime,
          timeframe,
          payout: selected.payout,
          apexMatch: null,
          mtfRows: [],
        }));
        return;
      }

      const mtfPayload = await fetchMtf(asset);
      const rows = normalizeMtfRows(mtfPayload);
      const decision = decideSignal({
        asset,
        time: entryTime,
        timeframe,
        payout: selected.payout,
        apexMatch,
        mtfRows: rows,
      });
      setMtfRows(rows);
      setResult(decision);
    } catch (generateError) {
      setError(generateError.message || 'Signal generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="page signalPage">
      <div className="signalHero">
        <div>
          <span className="miniCaps">TCX signal generator</span>
          <h2>OTC confluence desk</h2>
          <p>Only apex-supported assets with at least {MIN_PAYOUT}% payout are eligible. The selected minute must match the apex schedule before MTF confirmation is used.</p>
        </div>
        <div className="signalHeroStats">
          <SignalStat icon={<ShieldCheck size={18} />} label="Payout floor" value={`${MIN_PAYOUT}%`} />
          <SignalStat icon={<Activity size={18} />} label="Tradable now" value={loadingAssets ? '...' : assets.length} />
          <SignalStat icon={<Clock3 size={18} />} label="Entry mode" value={timeframe} />
        </div>
      </div>

      <div className="signalGrid">
        <div className="card signalControls">
          <div className="panelTitle">
            <h3>Setup</h3>
            <button className="soft signalRefresh" onClick={loadAssets} disabled={loadingAssets} title="Refresh payout list">
              <RefreshCw size={16} />
              <span>{loadingAssets ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>

          <label className="signalSearch">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search eligible assets" />
          </label>

          <div className="signalAssetList">
            {visibleAssets.map((item) => (
              <button
                key={item.asset}
                className={item.asset === selected?.asset ? 'selected' : ''}
                onClick={() => setSelectedAsset(item.asset)}
              >
                <span>{item.label}</span>
                <b>{item.payout}%</b>
              </button>
            ))}
            {!visibleAssets.length && (
              <div className="signalEmpty">
                <AlertTriangle size={18} />
                <span>{loadingAssets ? 'Loading payout-qualified assets...' : 'No assets match this search or payout filter.'}</span>
              </div>
            )}
          </div>

          <div className="signalForm">
            <label>
              <span>Entry time</span>
              <input type="time" step="60" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
            <label>
              <span>Timeframe</span>
              <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
                {SIGNAL_TIMEFRAMES.map((tf) => <option key={tf}>{tf}</option>)}
              </select>
            </label>
          </div>

          <button className="primary signalGenerate" disabled={!selected || generating || loadingAssets} onClick={generateSignal}>
            <Zap size={18} />
            <span>{generating ? 'Checking confluence...' : 'Generate signal'}</span>
          </button>

          {error && <div className="signalError"><AlertTriangle size={17} />{error}</div>}
        </div>

        <div className="signalOutput">
          <SignalResult result={result} selected={selected} time={time} timeframe={timeframe} generating={generating} />
          <MtfMatrix rows={mtfRows} />
        </div>
      </div>
    </section>
  );
}

function SignalStat({ icon, label, value }) {
  return (
    <div>
      {icon}
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function SignalResult({ result, selected, time, timeframe, generating }) {
  const waiting = !result;
  const directionClass = result?.direction === 'CALL' ? 'call' : result?.direction === 'PUT' ? 'put' : 'wait';
  const DirectionIcon = result?.direction === 'PUT' ? TrendingDown : result?.direction === 'CALL' ? TrendingUp : Sparkles;

  return (
    <div className={`card signalResult ${directionClass}`}>
      <div className="signalResultTop">
        <div>
          <span className="miniCaps">Signal direction</span>
          <h2><DirectionIcon size={28} />{generating ? 'Scanning' : waiting ? 'Ready' : result.headline}</h2>
        </div>
        <div className="signalAssetBadge">
          <b>{selected ? signalAssetLabel(selected.asset) : 'No asset'}</b>
          <span>{normalizeHHMM(time) || '--:--'} / {timeframe}</span>
        </div>
      </div>

      <div className="signalConfidence">
        <div>
          <span>Assertiveness</span>
          <b>{generating ? '--' : result?.confidence ?? 0}%</b>
        </div>
        <div className="confidenceRail">
          <i style={{ width: `${generating ? 18 : result?.confidence ?? 0}%` }} />
        </div>
      </div>

      <p>{generating ? 'Checking apex schedule, payout eligibility, and MTF confirmation.' : result?.summary || 'Select an eligible asset and entry minute to generate a TCX signal.'}</p>

      <div className="signalBadges">
        <span>{selected?.payout ? `${selected.payout}% payout` : 'Payout unavailable'}</span>
        <span>{result?.status || 'Awaiting scan'}</span>
        <span>{result?.apexAccuracy ? `${result.apexAccuracy}% apex` : 'Apex exact-time gate'}</span>
      </div>

      {!!result?.checks?.length && (
        <div className="signalChecks">
          {result.checks.map((check) => (
            <div key={check.label} className={check.state}>
              <span>{check.label}</span>
              <b>{check.value > 0 ? `+${check.value}` : check.value}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MtfMatrix({ rows }) {
  const indicatorLabels = ['Last Candle', 'Last 5', 'EMA Cross', 'EMA 21', 'EMA 9/21', 'EMA 21/50', 'EMA 50/100', 'EMA P/50', 'MACD', 'RSI', 'Exhaustion'];
  const rowMap = new Map(rows.map((row) => [row.tf, row]));

  return (
    <div className="card signalMatrix">
      <div className="panelTitle">
        <h3>MTF matrix</h3>
        <span className="panelTag">{rows.length ? `${rows.length} frames` : 'No scan yet'}</span>
      </div>
      <div className="matrixScroller">
        <table>
          <thead>
            <tr>
              <th>TF</th>
              {indicatorLabels.map((label) => <th key={label}>{label}</th>)}
              <th>Bias</th>
            </tr>
          </thead>
          <tbody>
            {MTF_LADDER.map((tf) => {
              const row = rowMap.get(tf);
              return (
                <tr key={tf}>
                  <th>{tf}</th>
                  {indicatorLabels.map((label) => {
                    const item = row?.indicators.find((indicator) => indicator.label === label);
                    return <SignalCell key={label} score={item?.score ?? 0} />;
                  })}
                  <td><span className={`bias ${row?.direction?.toLowerCase() || 'neutral'}`}>{row?.direction || '-'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SignalCell({ score }) {
  const direction = score > 0.12 ? 'CALL' : score < -0.12 ? 'PUT' : 'NEUTRAL';
  return <td><span className={`cellSignal ${direction.toLowerCase()}`}>{direction === 'NEUTRAL' ? '-' : direction}</span></td>;
}
