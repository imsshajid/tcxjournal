export const SIGNAL_ASSETS = [
  'USDBDT-OTC',
  'USDINR-OTC',
  'USDPKR-OTC',
  'USDBRL-OTC',
  'USDDZD-OTC',
  'USDARS-OTC',
  'USDCOP-OTC',
  'USDCAD-OTC',
  'USDEGP-OTC',
  'USDIDR-OTC',
  'USDMXN-OTC',
  'USDPHP-OTC',
  'USDCHF-OTC',
  'USDZAR-OTC',
  'USDTRY-OTC',
  'NZDJPY-OTC',
  'NZDCHF-OTC',
  'NZDCAD-OTC',
  'NZDUSD-OTC',
  'BTCUSD-OTC',
  'CADCHF-OTC',
  'EURJPY-OTC',
  'EURUSD-OTC',
  'CADJPY-OTC',
  'ETHUSD-OTC',
  'GBPJPY-OTC',
  'TRUUSD-OTC',
  'GBPAUD-OTC',
  'AUDJPY-OTC',
  'AUDUSD-OTC',
  'EURCHF-OTC',
  'AVAUSD-OTC',
  'AUDNZD-OTC',
  'GBPNZD-OTC',
  'EURNZD-OTC',
  'CHFJPY-OTC',
  'BNBUSD-OTC',
  'XRPUSD-OTC',
  'LTCUSD-OTC',
  'USDJPY-OTC',
  'AXSUSD-OTC',
  'AUDCAD-OTC',
  'USDNGN-OTC',
  'DASUSD-OTC',
  'AUDCHF-OTC',
  'GBPUSD-OTC',
  'GBPCAD-OTC',
  'GBPCHF-OTC',
  'EURGBP-OTC',
  'EURAUD-OTC',
  'EURCAD-OTC',
  'XAGUSD-OTC',
  'XAUUSD-OTC',
  'UKBRENT-OTC',
  'USCRUDE-OTC',
  'TONUSD-OTC',
  'SOLUSD-OTC',
  'ZECUSD-OTC',
  'ETCUSD-OTC',
  'ATOUSD-OTC',
  'LINUSD-OTC',
  'DOTUSD-OTC',
  'BCHUSD-OTC',
];

const ASSET_LABEL_OVERRIDES = {
  UKBRENT: 'UKBrent',
  USCRUDE: 'USCrude',
};

export function compactSignalAsset(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .replace(/\s*\(OTC\)\s*$/i, '-OTC')
    .replace(/[_\s/]+/g, '')
    .replace(/-+/g, '-')
    .toUpperCase();
}

export function signalAssetLabel(asset) {
  const compact = compactSignalAsset(asset);
  const base = compact.replace(/-OTC$/i, '');
  const otc = /-OTC$/i.test(compact) ? ' (OTC)' : '';
  if (ASSET_LABEL_OVERRIDES[base]) return `${ASSET_LABEL_OVERRIDES[base]}${otc}`;
  if (base.length === 6) return `${base.slice(0, 3)}/${base.slice(3)}${otc}`;
  if (base.length === 7 && base.startsWith('USD')) return `${base.slice(0, 3)}/${base.slice(3)}${otc}`;
  if (base.length === 6 && /USD$/.test(base)) return `${base.slice(0, -3)}/USD${otc}`;
  return `${base}${otc}`;
}

export function payoutLookupKeys(asset) {
  const compact = compactSignalAsset(asset);
  const base = compact.replace(/-OTC$/i, '');
  const label = signalAssetLabel(compact);
  return Array.from(new Set([
    compact,
    base,
    label,
    label.toUpperCase(),
    label.replace(/\s+/g, ''),
    label.replace(/\s*\(OTC\)\s*$/i, '-OTC').replace(/[^\w-]+/g, '').toUpperCase(),
  ].filter(Boolean)));
}
