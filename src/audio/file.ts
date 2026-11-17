/**
 * 소리 파일 받기 (D-546): 이 브라우저가 OGG Vorbis를 풀면 ogg, 아니면 m4a(iOS Safari 옛판)를 먼저 받고, 없으면 다른 쪽을 한 번 더.
 * 안드로이드 · PC 묶음(크로미엄)은 m4a를 싣지 않는다(`tools/build-native.cjs`) — 거기서 OGG를 못 푸는 일이 생겨도
 * 오류 없이 조용히 빠진다 (OGG를 못 풀면 거절 — 호출한 쪽이 삼킨다, 그 소리만 안 난다).
 */
/** 안드로이드 · PC 묶음 (`npm run build:native`가 VITE_AUDIO_OGG_ONLY=1로 빌드) — m4a를 찾지도 않는다 (404 기록이 남지 않게) */
const OGG_ONLY = import.meta.env.VITE_AUDIO_OGG_ONLY === '1';

const order = (): ('ogg' | 'm4a')[] => {
  if (OGG_ONLY) return ['ogg'];
  try {
    return new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? ['ogg', 'm4a'] : ['m4a', 'ogg'];
  } catch {
    return ['ogg', 'm4a'];
  }
};

/** `audio/<dir>/<name>.<ogg|m4a>`를 받아 풀어 준다. 둘 다 없거나 못 풀면 거절 */
export const loadAudio = async (a: BaseAudioContext, dir: string, name: string): Promise<AudioBuffer> => {
  let err: unknown = null;
  for (const e of order()) {
    try {
      const r = await fetch(`audio/${dir}/${name}.${e}`);
      if (!r.ok) throw new Error(`${name}.${e} ${r.status}`);
      const ab = await r.arrayBuffer();
      return await new Promise<AudioBuffer>((ok, no) => a.decodeAudioData(ab, ok, no));
    } catch (x) {
      err = x;
    }
  }
  throw err;
};
