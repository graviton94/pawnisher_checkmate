/**
 * 배경 음악 (D-123, 제안서 P1 2.9): 파일 없이 WebAudio 칩튠 루프. 곡 = 코드 진행 4마디 × 반복.
 * 사용자 에셋이 오면 같은 이름표(트랙 id)로 바꿔 끼운다. 볼륨은 효과음보다 작게.
 */
export type TrackId = 'menu' | 'act1' | 'act2' | 'act3' | 'boss' | 'final';

export interface TrackDef {
  bpm: number;
  /** 근음 (Hz) */
  root: number;
  /** 마디마다 코드: [근음 반음, 단조면 3 · 장조면 4] */
  prog: [number, 3 | 4][];
  /** 8분음표 8칸 아르페지오 (코드음 순번: 0 근음 · 1 3도 · 2 5도 · 3 옥타브, -1 쉼) */
  arp: number[];
  lead: OscillatorType;
  /** 북 (킥 · 하이햇) */
  drums: 'none' | 'soft' | 'march' | 'drive';
}

export const TRACKS: Record<TrackId, TrackDef> = {
  // 메인 메뉴: 느리고 비어 있는 공장 — i · VI · III · VII
  menu: { bpm: 78, root: 110, prog: [[0, 3], [-4, 4], [3, 4], [-2, 4]], arp: [0, -1, 2, -1, 3, -1, 2, -1], lead: 'triangle', drums: 'none' },
  // 주조 공정: 일정한 컨베이어 박자
  act1: { bpm: 100, root: 110, prog: [[0, 3], [0, 3], [-4, 4], [-2, 4]], arp: [0, 2, 3, 2, 1, 2, 3, 2], lead: 'square', drums: 'soft' },
  // 조립 공정: 조금 빠르게, 5도 위로
  act2: { bpm: 112, root: 123.47, prog: [[0, 3], [5, 3], [-2, 4], [3, 4]], arp: [0, 1, 2, 3, 2, 1, 2, 3], lead: 'square', drums: 'march' },
  // 검수 공정: 반음 내림이 들어간 긴장
  act3: { bpm: 124, root: 103.83, prog: [[0, 3], [1, 4], [0, 3], [-2, 4]], arp: [0, 2, 3, 1, 0, 2, 3, 2], lead: 'sawtooth', drums: 'march' },
  // 반장전: 빠르고 북이 앞에
  boss: { bpm: 140, root: 110, prog: [[0, 3], [1, 4], [-4, 4], [-5, 4]], arp: [0, 0, 2, 0, 3, 0, 2, 1], lead: 'square', drums: 'drive' },
  // 공장장: 가장 빠르게
  final: { bpm: 152, root: 98, prog: [[0, 3], [3, 4], [1, 4], [-2, 4]], arp: [0, 3, 2, 3, 1, 3, 2, 3], lead: 'sawtooth', drums: 'drive' },
};

/** 음량 (효과음 기준 0.5보다 작게) */
export const MUSIC_VOLUME = 0.11;
