import i18n from './i18n';

let activeOverlay: HTMLElement | null = null;

export function showLoadingOverlay(textKey: string = 'loading'): HTMLElement {
  // If there's already an active overlay, update its text and return it
  if (activeOverlay) {
    updateLoadingText(textKey);
    return activeOverlay;
  }
  
  // Create new overlay
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  
  const textElement = document.createElement('div');
  textElement.className = 'loading-text';
  textElement.id = 'loading-text';
  textElement.textContent = i18n.t(textKey, { defaultValue: textKey });
  
  overlay.appendChild(spinner);
  overlay.appendChild(textElement);
  document.body.appendChild(overlay);
  
  activeOverlay = overlay;
  return overlay;
}

export function updateLoadingText(textKey: string): void {
  if (activeOverlay) {
    const textElement = activeOverlay.querySelector('#loading-text');
    if (textElement) {
      textElement.textContent = i18n.t(textKey, { defaultValue: textKey });
    }
  }
}

export function hideLoadingOverlay(overlay: HTMLElement): void {
  if (overlay && overlay.parentNode) {
    document.body.removeChild(overlay);
    if (activeOverlay === overlay) {
      activeOverlay = null;
    }
  }
}