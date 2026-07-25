import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});

// Test with domcontentloaded (head script has run)
console.log('=== Test: first visit dark, domcontentloaded ===');
const p1 = await context.newPage();
await p1.emulateMedia({ colorScheme: 'dark' });
await p1.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
const r1 = await p1.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  htmlClass: document.documentElement.className,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  localStorage: localStorage.getItem('pcnerd-theme')
}));
console.log('  dark:', r1.dark, '| class:', r1.htmlClass.slice(0,80), '| bg:', r1.bodyBg, '| ls:', r1.localStorage);
await p1.close();

console.log('\n=== Test: first visit light, domcontentloaded ===');
const p2 = await context.newPage();
await p2.emulateMedia({ colorScheme: 'light' });
await p2.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
const r2 = await p2.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  htmlClass: document.documentElement.className,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  localStorage: localStorage.getItem('pcnerd-theme')
}));
console.log('  dark:', r2.dark, '| class:', r2.htmlClass.slice(0,80), '| bg:', r2.bodyBg, '| ls:', r2.localStorage);
await p2.close();

console.log('\n=== Test: saved dark, domcontentloaded ===');
const p3 = await context.newPage();
await p3.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await p3.evaluate(() => localStorage.setItem('pcnerd-theme', 'dark'));
await p3.reload({ waitUntil: 'domcontentloaded' });
const r3 = await p3.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  bodyBg: getComputedStyle(document.body).backgroundColor,
}));
console.log('  dark:', r3.dark, '| bg:', r3.bodyBg);
await p3.close();

console.log('\n=== Test: saved light, domcontentloaded ===');
const p4 = await context.newPage();
await p4.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await p4.evaluate(() => localStorage.setItem('pcnerd-theme', 'light'));
await p4.reload({ waitUntil: 'domcontentloaded' });
const r4 = await p4.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  bodyBg: getComputedStyle(document.body).backgroundColor,
}));
console.log('  dark:', r4.dark, '| bg:', r4.bodyBg);
await p4.close();

// Test: Check the HTML and script content directly
console.log('\n=== Test: check inline script exists ===');
const p5 = await context.newPage();
await p5.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
const scriptContent = await p5.evaluate(() => {
  const scripts = document.querySelectorAll('script');
  for (const s of scripts) {
    if (s.innerHTML.includes('pcnerd-theme')) return s.innerHTML.slice(0, 200);
  }
  return null;
});
console.log('  inline script found:', scriptContent ? '✓' : '✗');
if (scriptContent) console.log('  content:', scriptContent);
await p5.close();

await browser.close();
console.log('\n✓ Done');
