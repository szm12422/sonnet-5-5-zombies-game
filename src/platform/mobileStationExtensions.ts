/** Extend the existing mobile station keypad to the nine entries used by the expanded weapon shop. */
export function installMobileStationExtensions(root: HTMLElement): void {
  const digits = root.querySelector<HTMLElement>('.mobile-station-digits');
  if (!digits || digits.dataset.extended === 'true') return;
  digits.dataset.extended = 'true';
  digits.style.gap = '5px';

  for (let i = 7; i <= 9; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-control mobile-digit';
    button.textContent = String(i);
    button.setAttribute('aria-label', `Station option ${i}`);
    button.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const code = `Digit${i}`;
      document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    });
    digits.appendChild(button);
  }
}
