/**
 * Utility module for creating and managing loading overlays
 */

/**
 * Creates a loading overlay element with spinner and text
 * @param text Optional custom loading text (defaults to "Loading...")
 * @returns HTMLElement The created loading overlay element
 */
export function createLoadingOverlay(text: string = 'Loading...'): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';

  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';

  const textElement = document.createElement('div');
  textElement.className = 'loading-text';
  textElement.textContent = text;

  overlay.appendChild(spinner);
  overlay.appendChild(textElement);

  return overlay;
}

/**
 * Shows a loading overlay on the page
 * @param text Optional custom loading text
 * @returns The created overlay element
 */
export function showLoadingOverlay(text?: string): HTMLElement {
  const overlay = createLoadingOverlay(text);
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Removes a loading overlay from the page
 * @param overlay The overlay element to remove
 */
export function hideLoadingOverlay(overlay: HTMLElement): void {
  if (overlay && overlay.parentNode) {
    document.body.removeChild(overlay);
  }
}