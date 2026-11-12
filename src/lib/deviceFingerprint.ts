let cachedFingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;
  if (typeof window === 'undefined') return '';

  const components: string[] = [];

  // 1. Canvas text rendering data URL
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(12, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '14pt Arial, sans-serif';
      ctx.fillText('ENSCS⚽Tournament', 4, 17);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '16pt "Times New Roman"';
      ctx.fillText('ENSCS⚽Tournament', 20, 45);
      components.push(canvas.toDataURL());
    }
  } catch {
    components.push('no-canvas');
  }

  // 2. WebGL vendor and renderer
  try {
    const glCanvas = document.createElement('canvas');
    const gl =
      (glCanvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (glCanvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || ''));
        components.push(String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''));
      } else {
        components.push(String(gl.getParameter(gl.VENDOR) || ''));
        components.push(String(gl.getParameter(gl.RENDERER) || ''));
      }
    } else {
      components.push('no-webgl');
    }
  } catch {
    components.push('no-webgl');
  }

  // 3. Screen metrics
  try {
    const s = window.screen;
    components.push(
      `${s?.width || 0}x${s?.height || 0}x${s?.colorDepth || 0}x${window.devicePixelRatio || 1}`
    );
  } catch {
    components.push('no-screen');
  }

  // 4. Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  } catch {
    components.push('no-tz');
  }

  // 5. Languages, platform, concurrency, memory, touch points
  try {
    const nav = window.navigator as any;
    const langs = Array.isArray(nav.languages) ? nav.languages.join(',') : nav.language || '';
    components.push(langs);
    components.push(String(nav.platform || ''));
    components.push(String(nav.hardwareConcurrency || ''));
    components.push(String(nav.deviceMemory || ''));
    components.push(String(nav.maxTouchPoints || '0'));
  } catch {
    components.push('no-nav');
  }

  const raw = components.join('|||');

  // SHA-256 via crypto.subtle
  try {
    if (window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(raw);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      cachedFingerprint = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return cachedFingerprint;
    }
  } catch {
    // Fall back to integer hashing if subtle is unavailable (e.g. non-secure origin)
  }

  // Fallback simple 64-char hex string
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  cachedFingerprint = (p1 + p2).repeat(4);
  return cachedFingerprint;
}

