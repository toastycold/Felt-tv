// Point your phone's camera at the TV's QR code to fill in the room code.
// Uses the browser's built-in barcode reader when there is one, otherwise a small QR library.

/** Pulls the 4-letter room code out of whatever the QR holds (a join link or just the code). */
export function codeFrom(text) {
  try { const c = new URL(text).searchParams.get('code'); if (c) return c.toUpperCase().slice(0, 4); } catch { /* not a link */ }
  const m = String(text || '').toUpperCase().match(/\b[A-Z]{4}\b/);
  return m ? m[0] : '';
}

/** Opens a full-screen camera view; resolves with the room code, or '' if cancelled. */
export function scanForCode() {
  return new Promise(async (resolve) => {
    const box = document.createElement('div');
    box.className = 'qr-scan';
    box.innerHTML = `<video playsinline muted></video><div class="qr-frame"></div>
      <p class="qr-tip">Point at the QR code on the TV</p><button class="btn btn-primary" type="button">Cancel</button>`;
    document.body.appendChild(box);
    const video = box.querySelector('video');
    let stream = null, done = false, raf = 0;
    const finish = (code) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      box.remove();
      resolve(code);
    };
    box.querySelector('button').onclick = () => finish('');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch {
      box.querySelector('.qr-tip').textContent = "Couldn't open the camera. Allow camera access for this site, or type the code instead.";
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => {});
    let detect;
    if ('BarcodeDetector' in window) {
      const d = new window.BarcodeDetector({ formats: ['qr_code'] });
      detect = async () => (await d.detect(video))[0]?.rawValue || '';
    } else {
      const { default: jsQR } = await import('https://esm.sh/jsqr@1.4.0');
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d', { willReadFrequently: true });
      detect = async () => {
        const w = video.videoWidth, h = video.videoHeight;
        if (!w) return '';
        const s = Math.min(1, 640 / w);
        c.width = w * s; c.height = h * s;
        ctx.drawImage(video, 0, 0, c.width, c.height);
        return jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data || '';
      };
    }
    const tick = async () => {
      if (done) return;
      try {
        const text = await detect();
        const code = text && codeFrom(text);
        if (code) { navigator.vibrate?.(40); finish(code); return; }
      } catch { /* keep looking */ }
      raf = requestAnimationFrame(() => setTimeout(tick, 120));
    };
    tick();
  });
}
