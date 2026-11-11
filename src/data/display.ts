/** 대표 화면 네 가지. 별도 기기별 레이아웃을 계속 추가하지 않는다. */
export const DISPLAY_PRESETS = [
  { id: 'small-mobile', width: 667, height: 375, tile: 50 },
  { id: 'mobile', width: 915, height: 412, tile: 60 },
  { id: 'tablet', width: 1024, height: 768, tile: 80 },
  { id: 'pc', width: 1280, height: 720, tile: 80 },
] as const;

/** 창 크기에 가장 가까운 기본 배치. 중간 크기는 같은 배치 안에서 맞춘다. */
export const displayPreset = (width: number, height: number) =>
  DISPLAY_PRESETS[width >= 1100 ? 3 : height >= 600 ? 2 : width >= 800 ? 1 : 0];
