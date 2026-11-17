import galmuriOfl from 'galmuri/ofl.md?raw';
import phaserMit from 'phaser/LICENSE.md?raw';

/**
 * 게임에 함께 실어 보내는 라이선스 고지 (D-530 — D-286을 넓힘).
 * OFL · MIT는 「저작권 고지와 허락 문구를 사본과 함께」 배포하라고 요구한다 → 실행 파일(웹 · APK · PC) 안에 전문을 넣고
 * 설정 → 만든 사람 쪽에서 읽을 수 있게 한다. CC BY 3.0은 저작자 · 라이선스 주소 · 고친 점 표시를 요구한다.
 * 원문은 node_modules의 파일을 그대로 묶는다 (손으로 옮겨 적지 않는다 — 판이 올라가도 같이 따라온다).
 */
export interface LicenseNotice {
  /** 쓴 것 */
  name: string;
  /** 저작권자 한 줄 */
  by: string;
  /** 라이선스 이름 */
  license: string;
  /** 어디에 · 어떻게 썼나 (고친 점 포함) */
  use: string;
  /** 전문 (없으면 주소만) */
  text?: string;
  /** 라이선스 주소 */
  url: string;
}

/** MIT 허락 문구 (Tabler Icons 원문 LICENSE와 같은 글 — 저장소에 원본 파일이 없어 저작권 줄과 함께 적는다) */
const mit = (holder: string): string => `MIT License

Copyright (c) ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

/** docs/CREDITS.md와 같은 목록 (출처가 늘면 둘 다 고친다) */
export const LICENSES: LicenseNotice[] = [
  { name: '갈무리 (Galmuri)', by: '© 2019–2025 Lee Minseo', license: 'SIL OFL 1.1', use: '게임의 모든 글씨', text: galmuriOfl, url: 'https://openfontlicense.org' },
  { name: 'Phaser 3', by: '© 2024 Richard Davey, Phaser Studio Inc.', license: 'MIT', use: '판 그리기 엔진', text: phaserMit, url: 'https://github.com/phaserjs/phaser/blob/master/LICENSE.md' },
  { name: 'game-icons.net', by: 'Lorc, Delapouite 외 기여자', license: 'CC BY 3.0', use: '아이콘 (16칸 도트로 줄여 고침)', url: 'https://creativecommons.org/licenses/by/3.0/' },
  { name: 'Tabler Icons', by: '© 2020–2024 Paweł Kuna', license: 'MIT', use: '아이콘 (16칸 도트로 줄여 고침)', text: mit('2020-2024 Paweł Kuna'), url: 'https://github.com/tabler/tabler-icons/blob/main/LICENSE' },
  { name: 'FluidR3_GM 사운드폰트', by: '© 2000–2002, 2008 Frank Wen · © 2008 Toby Smithe', license: 'MIT', use: '배경 음악 음색 (자체 작곡 악보를 이 음색으로 렌더 — 사운드폰트 파일은 싣지 않는다)', text: mit('2000-2002, 2008 Frank Wen; 2008 Toby Smithe'), url: 'https://github.com/FluidSynth/fluidsynth/wiki/SoundFont' },
  { name: '효과음 (주물 공방 소리)', by: '당신의 하루 스튜디오 — 자체 합성 (tools/audio/sfx_synth.py)', license: 'CC0 1.0', use: '모든 효과음', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
];
