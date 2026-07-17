// Read version from Capacitor config injected at build time
// Fallback: fetch version from the app's own manifest
const FALLBACK_VERSION = '0.1.5';

export async function getAppVersion(): Promise<string> {
  try {
    // Try reading from capacitor.config.json (available at runtime on web)
    const resp = await fetch('/capacitor.config.json');
    if (resp.ok) {
      const config = await resp.json();
      return config.version || FALLBACK_VERSION;
    }
  } catch {} // silent fallback
  
  // Try from meta tag or hardcoded
  try {
    const meta = document.querySelector('meta[name="app-version"]');
    if (meta) return meta.getAttribute('content') || FALLBACK_VERSION;
  } catch {}
  
  return FALLBACK_VERSION;
}

const GITHUB_REPO = 'Elesarh/nura';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  hasUpdate: boolean;
  version: string;
  url: string;
  apkUrl?: string;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const currentVersion = await getAppVersion();
    
    const response = await fetch(GITHUB_API);
    if (!response.ok) return null;
    const release = await response.json();
    const latestVersion = (release.tag_name || release.name).replace(/^v/, '');

    if (latestVersion) {
      // Proper semver comparison
      const parseVer = (v: string) => v.split('.').map(Number);
      const latestParts = parseVer(latestVersion);
      const currentParts = parseVer(currentVersion);
      let isNewer = false;
      for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
        const l = latestParts[i] || 0;
        const c = currentParts[i] || 0;
        if (l > c) { isNewer = true; break; }
        if (l < c) { isNewer = false; break; }
      }
      if (isNewer) {
        const apkAsset = release.assets?.find((a: any) =>
          a.name?.endsWith('.apk') || a.content_type === 'application/vnd.android.package-archive'
        );

      return {
        hasUpdate: true,
        version: latestVersion,
        url: apkAsset?.browser_download_url || release.html_url,
        apkUrl: apkAsset?.browser_download_url || undefined,
      };
    }

    return {
      hasUpdate: false,
      version: currentVersion,
      url: '',
    };
  } catch (e) {
    console.warn('[Update Check] Failed:', e);
    return null;
  }
}

export async function downloadApk(url: string, onProgress: (progress: number, speed: string) => void): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = response.body?.getReader();
    if (!reader) return await response.blob();

    const chunks: Uint8Array[] = [];
    let received = 0;
    let startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;

      if (total > 0) {
        const progress = Math.round((received / total) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const speedKbps = Math.round((received / 1024) / elapsed);
        const speed = speedKbps > 1024
          ? `${(speedKbps / 1024).toFixed(1)} MB/s`
          : `${speedKbps} KB/s`;
        onProgress(progress, speed);
      }
    }

    return new Blob(chunks, { type: 'application/vnd.android.package-archive' });
  } catch (e) {
    console.warn('[Download] Failed:', e);
    return null;
  }
}

export async function installApk(blob: Blob): Promise<boolean> {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const version = await getAppVersion();
    a.href = url;
    a.download = `NURA-${version}.apk`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch (e) {
    console.warn('[Install] Failed:', e);
    return false;
  }
}