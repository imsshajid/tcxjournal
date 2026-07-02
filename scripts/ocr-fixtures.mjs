import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const { parseTradeText, validateTradeForSave, toNumber } = await server.ssrLoadModule('/src/App.jsx');

  assert.equal(toNumber('4,636.155'), 4636.155);
  assert.equal(toNumber('4.636.155'), 4636.155);
  assert.equal(toNumber('-0.41 USD'), -0.41);

  const fttWide = parseTradeText(`
    USD/JPY 91%
    c942fa43-1702-4adf-bdf8-74cfd350c5c4
    159.221 29/05/2026, 23:11:59
    159.226 29/05/2026, 23:13:00
    165.101.132.30
    165.75$ 316.58$
  `, 'AUTO');
  assert.equal(fttWide.length, 1);
  assert.equal(fttWide[0].market, 'FTT');
  assert.equal(fttWide[0].asset, 'USD/JPY');
  assert.equal(fttWide[0].amount, 165.75);
  assert.equal(fttWide[0].income, 316.58);
  assert.equal(fttWide[0].payout, 91);
  assert.deepEqual(validateTradeForSave(fttWide[0]).blocking, []);

  const cfdDetail = parseTradeText(`
    #2115811377
    XAU/USD
    Sell 0.01 lot at 4,635.749
    4,636.155 SO
    -0.41 USD
    Open price 4,635.749
    Close price 4,636.155
    P/L -0.41 USD
    Open time 06.05.2026 8:50:55 AM
    Close time 06.05.2026 8:51:36 AM
    Closed by Stop out
    Commission -0.11 USD
  `, 'AUTO');
  assert.equal(cfdDetail.length, 1);
  assert.equal(cfdDetail[0].market, 'CFD');
  assert.equal(cfdDetail[0].asset, 'XAU/USD');
  assert.equal(cfdDetail[0].amount, 0.01);
  assert.equal(cfdDetail[0].open, 4635.749);
  assert.equal(cfdDetail[0].close, 4636.155);
  assert.equal(cfdDetail[0].profit, -0.41);
  assert.deepEqual(validateTradeForSave(cfdDetail[0]).blocking, []);

  const cfdTable = parseTradeText(`
    XAU/USD Sell 06 May 02:50:55 06 May 02:51:36 0.01 4,635.749 4,636.155 SO -0.41
  `, 'CFD');
  assert.equal(cfdTable.length, 1);
  assert.equal(cfdTable[0].market, 'CFD');
  assert.equal(cfdTable[0].profit, -0.41);
  assert.equal(cfdTable[0].open, 4635.749);
  assert.equal(cfdTable[0].close, 4636.155);

  const cfdMobileMissingTimes = parseTradeText(`
    5/6/26 -58.25 USD
    XAU/USD SL
    Sell 0.02 lot at 4,632.048
    +0.37 USD
    4,631.867
  `, 'AUTO');
  assert.equal(cfdMobileMissingTimes.length, 1);
  assert.equal(cfdMobileMissingTimes[0].market, 'CFD');
  assert.notEqual(cfdMobileMissingTimes[0].market, 'FTT');
  assert.ok(validateTradeForSave(cfdMobileMissingTimes[0]).blocking.some((message) => /Open time/i.test(message)));

  const garbage = parseTradeText('No valid trade history found. Upload a proper screenshot.', 'AUTO');
  assert.equal(garbage.length, 0);

  console.log('OCR parser fixtures passed.');
} finally {
  await server.close();
}
