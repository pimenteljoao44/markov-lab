// Feedback não-bloqueante: toasts empilhados + explosão de confete.
import { escapeHtml } from '../util.js';

export function toast(title, { type = 'info', sub = '', timeout = 4200 } = {}) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<b>${escapeHtml(title)}</b>${sub ? `<small>${escapeHtml(sub)}</small>` : ''}`;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  }, timeout);
}

const COLORS = ['#2F6BFF', '#F29E1F', '#13A87B', '#E8467C', '#7A5AF8', '#FFE45C'];

export function burst(x, y, count = 34) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const b = document.createElement('div');
  b.className = 'burst';
  b.style.left = `${x}px`;
  b.style.top = `${y}px`;
  for (let i = 0; i < Math.min(count, 22); i++) {
    const s = document.createElement('span');
    const a = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 120;
    s.style.background = COLORS[i % COLORS.length];
    s.style.setProperty('--dx', `${Math.cos(a) * r}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * r - 40}px`);
    s.style.animationDelay = `${Math.random() * 80}ms`;
    b.appendChild(s);
  }
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1300);
}
