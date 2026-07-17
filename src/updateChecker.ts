const APP_VERSION = 'v0.1.0';

// Check for updates from GitHub releases
const GITHUB_REPO = 'Elesarh/nura';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export async function checkForUpdates(): Promise<{ hasUpdate: boolean; version: string; url: string } | null> {
  try {
    const response = await fetch(GITHUB_API);
    if (!response.ok) return null;
    const release = await response.json();
    const latestVersion = release.tag_name || release.name;
    
    if (latestVersion && latestVersion > APP_VERSION) {
      // Find the APK asset
      const apkAsset = release.assets?.find((a: any) => 
        a.name?.endsWith('.apk') || a.content_type === 'application/vnd.android.package-archive'
      );
      
      return {
        hasUpdate: true,
        version: latestVersion,
        url: apkAsset?.browser_download_url || release.html_url,
      };
    }
    return { hasUpdate: false, version: APP_VERSION, url: '' };
  } catch (e) {
    console.warn('[Update Check] Failed:', e);
    return null;
  }
}

export { APP_VERSION };