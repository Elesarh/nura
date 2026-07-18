const FALLBACK_VERSION = '0.1.20';

export async function getAppVersion(): Promise<string> {
  try {
    const resp = await fetch('/capacitor.config.json');
    if (resp.ok) {
      const config = await resp.json();
      return config.version || FALLBACK_VERSION;
    }
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

function semverCompare(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const currentVersion = await getAppVersion();
    const response = await fetch(GITHUB_API);
    if (!response.ok) return null;
    const release = await response.json();
    const latestVersion = (release.tag_name || release.name).replace(/^v/, '');

    if (latestVersion && semverCompare(latestVersion, currentVersion) > 0) {
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

// Open the APK download URL in a new tab — works around CORS issues
export function downloadApkViaRedirect(url: string): void {
  // Open in new tab to trigger browser download
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.download = 'NURA.apk';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Legacy download with progress (may not work due to CORS)
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
    console.warn('[Download] Failed, falling back to redirect:', e);
    // Fallback to redirect
    downloadApkViaRedirect(url);
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