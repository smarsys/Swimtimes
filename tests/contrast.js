// Audit de contraste WCAG : chaque texte visible, couleur réelle composée (opacités + fonds + dégradé du body)
(() => {
  const parse = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const mix = (x, y, o) => ({ r: x.r * o + y.r * (1 - o), g: x.g * o + y.g * (1 - o), b: x.b * o + y.b * (1 - o), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const A = { r: 0xE3, g: 0x1E, b: 0x24, a: 1 }, B = { r: 0xB0, g: 0x15, b: 0x19, a: 1 };
  const W = document.documentElement.scrollWidth, H = Math.max(document.documentElement.scrollHeight, innerHeight);
  const gradient = (x, y) => mix(B, A, Math.min(1, Math.max(0, (x + y) / (W + H))));
  const chainOf = el => { const c = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) c.unshift(e); return c; };
  function render(chain, x, y, textColor) {
    const step = (k, beneath) => {
      const cs = getComputedStyle(chain[k]);
      const bg = chain[k] === document.body ? gradient(x, y) : parse(cs.backgroundColor);
      const local = bg && bg.a > 0 ? over(bg, beneath) : beneath;
      const inner = k === chain.length - 1 ? (textColor ? over(textColor, local) : local) : step(k + 1, local);
      return mix(inner, beneath, parseFloat(cs.opacity));
    };
    return step(0, { r: 255, g: 255, b: 255, a: 1 });
  }
  const results = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const text = n.textContent.replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim();
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    const el = n.parentElement;
    if (!el.checkVisibility({ opacityProperty: false, visibilityProperty: true })) continue;
    if (el.closest('[aria-disabled="true"], :disabled, .header-logo, script, style')) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rect = range.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const x = rect.left + scrollX, y = rect.top + scrollY;
    const cs = getComputedStyle(el);
    const chain = chainOf(el);
    const fg = render(chain, x, y, parse(cs.color));
    const bg = render(chain, x, y, null);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const r = ratio(fg, bg);
    if (r < (large ? 3 : 4.5)) results.push({ text: text.slice(0, 40), ratio: +r.toFixed(2), need: large ? 3 : 4.5, cls: (el.className || el.tagName).toString().slice(0, 40), size });
  }
  // Placeholders
  document.querySelectorAll('input[placeholder]').forEach(input => {
    if (!input.checkVisibility() || input.value) return;
    const ph = parse(getComputedStyle(input, '::placeholder').color);
    const rect = input.getBoundingClientRect(); const chain = chainOf(input);
    const r = ratio(render(chain, rect.left + scrollX, rect.top + scrollY, ph), render(chain, rect.left + scrollX, rect.top + scrollY, null));
    if (r < 4.5) results.push({ text: 'placeholder ' + input.placeholder, ratio: +r.toFixed(2), need: 4.5, cls: input.id, size: 18 });
  });
  return results;
})()
