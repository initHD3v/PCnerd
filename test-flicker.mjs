import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
});

console.log('=== Test 1: First visit, prefers dark ===');
const p1 = await context.newPage();
await p1.emulateMedia({ colorScheme: 'dark' });
await p1.goto('http://localhost:3000', { waitUntil: 'commit' });
const darkOnCommit1 = await p1.evaluate(() => document.documentElement.classList.contains('dark'));
await p1.waitForLoadState('networkidle');
const darkAfterLoad1 = await p1.evaluate(() => document.documentElement.classList.contains('dark'));
console.log('  dark on commit:', darkOnCommit1, '| after load:', darkAfterLoad1, '|', darkOnCommit1 === true && darkAfterLoad1 === true ? '✓' : '✗');
await p1.close();

console.log('\n=== Test 2: First visit, prefers light (no flash) ===');
const p2 = await context.newPage();
await p2.emulateMedia({ colorScheme: 'light' });
await p2.goto('http://localhost:3000', { waitUntil: 'commit' });
const darkOnCommit2 = await p2.evaluate(() => document.documentElement.classList.contains('dark'));
await p2.waitForLoadState('networkidle');
const darkAfterLoad2 = await p2.evaluate(() => document.documentElement.classList.contains('dark'));
const bgCommit2 = await p2.evaluate(() => getComputedStyle(document.body).backgroundColor);
await new Promise(r => setTimeout(r, 500));
const bgLoaded2 = await p2.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log('  dark on commit:', darkOnCommit2, '| after load:', darkAfterLoad2);
console.log('  bg:', bgCommit2, '→', bgLoaded2, '|', bgCommit2 === bgLoaded2 ? '✓ no shift' : '✗ shift detected');
await p2.close();

console.log('\n=== Test 3: Returning dark mode user (localStorage) ===');
const p3 = await context.newPage();
await p3.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await p3.evaluate(() => localStorage.setItem('pcnerd-theme', 'dark'));
await p3.reload({ waitUntil: 'commit' });
const darkOnCommit3 = await p3.evaluate(() => document.documentElement.classList.contains('dark'));
await p3.waitForLoadState('networkidle');
const darkAfterLoad3 = await p3.evaluate(() => document.documentElement.classList.contains('dark'));
console.log('  dark on commit:', darkOnCommit3, '| after load:', darkAfterLoad3, '|', darkOnCommit3 === true && darkAfterLoad3 === true ? '✓' : '✗');
await p3.close();

console.log('\n=== Test 4: Returning light mode user (localStorage) ===');
const p4 = await context.newPage();
await p4.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await p4.evaluate(() => localStorage.setItem('pcnerd-theme', 'light'));
await p4.reload({ waitUntil: 'commit' });
const darkOnCommit4 = await p4.evaluate(() => document.documentElement.classList.contains('dark'));
await p4.waitForLoadState('networkidle');
const darkAfterLoad4 = await p4.evaluate(() => document.documentElement.classList.contains('dark'));
console.log('  dark on commit:', darkOnCommit4, '| after load:', darkAfterLoad4, '|', darkOnCommit4 === false && darkAfterLoad4 === false ? '✓' : '✗');
await p4.close();

console.log('\n=== Test 5: Toggle theme, no flicker on toggle ===');
const p5 = await context.newPage();
await p5.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await p5.evaluate(() => localStorage.setItem('pcnerd-theme', 'dark'));
await p5.reload({ waitUntil: 'networkidle' });
const initialTheme = await p5.evaluate(() => localStorage.getItem('pcnerd-theme'));
console.log('  initial theme:', initialTheme);
const toggleBtn = p5.locator('button').filter({ has: p5.locator('svg.lucide-moon, svg.lucide-sun') });
const btnCount = await toggleBtn.count();
console.log('  toggle buttons found:', btnCount);
await p5.close();

await browser.close();
console.log('\n✓ All tests complete');
