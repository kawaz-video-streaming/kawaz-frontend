import { authHeaders } from '../api/client';

export const prefetchFirstSegments = async (manifestUrl: string, special: boolean) => {
  try {
    const res = await fetch(manifestUrl, { credentials: 'include', headers: authHeaders() });
    if (!res.ok) return;
    const text = await res.text();
    const manifestPath = manifestUrl.includes('?')
      ? manifestUrl.slice(0, manifestUrl.indexOf('?'))
      : manifestUrl;
    const base = manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1);
    const sp = special ? '?special=true' : '';

    const repIds: string[] = [];
    let initTemplate: string | undefined;
    let mediaTemplate: string | undefined;
    for (const block of text.split('</AdaptationSet>')) {
      const init = block.match(/initialization="([^"]+)"/)?.[1];
      const media = block.match(/\bmedia="([^"]+)"/)?.[1];
      if (!init || !media) continue;
      if (!initTemplate) { initTemplate = init; mediaTemplate = media; }
      for (const m of block.matchAll(/<Representation\b[^>]*\s+id="(\d+)"/g)) repIds.push(m[1]);
    }
    const startNum = parseInt(text.match(/startNumber="(\d+)"/)?.[1] ?? '1');

    if (!initTemplate || !mediaTemplate || repIds.length === 0) return;

    const urls: string[] = [];
    for (const id of repIds) {
      urls.push(base + initTemplate.replace(/\$RepresentationID\$/g, id) + sp);
      const firstSeg = mediaTemplate
        .replace(/\$RepresentationID\$/g, id)
        .replace(/\$Number%0(\d+)d\$/, (_, w) => String(startNum).padStart(Number(w), '0'));
      urls.push(base + firstSeg + sp);
    }

    await Promise.all(urls.map(u => fetch(u, { credentials: 'include', headers: authHeaders() })));
  } catch {
    // best-effort
  }
};

export function formatVideoError(video: HTMLVideoElement | null): string {
  const error = video?.error;
  if (!error) return 'Playback failed during buffering.';
  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED: return 'Playback was aborted.';
    case MediaError.MEDIA_ERR_NETWORK: return 'A network error interrupted playback.';
    case MediaError.MEDIA_ERR_DECODE: return 'This video could not be decoded by the browser.';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: return 'This video format or manifest is not supported by the browser.';
    default: return 'Playback failed during buffering.';
  }
}
