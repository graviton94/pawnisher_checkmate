/** 화면 부품 HTML 조각 (D-085): 아이콘 · 상태 띠 · 눈금. 모양은 style.css의 9-slice 도트 부품이 맡는다. */

/** 흰 도트 아이콘을 currentColor로 (public/ui/icons/{name}.png) */
export const icon = (name: string, size: '' | 's' | 'l' | 'xl' = '', color?: string): string =>
  `<i class="icon${size ? ` ${size}` : ''}" style="${iconMask(name)}${color ? `;color:${color}` : ''}" aria-hidden="true"></i>`;

/** 마스크 그림은 인라인으로 (CSS 변수 안의 상대 url은 스타일시트 기준으로 풀려 APK에서 깨진다) */
export const iconMask = (name: string): string => `-webkit-mask-image:url(ui/icons/${name}.png);mask-image:url(ui/icons/${name}.png)`;

/** 눈금 n칸 중 on칸 켜짐 */
export const pips = (on: number, n: number): string => `<span class="pips">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span>`;

/** 나사 값 */
export const screws = (n: number): string => `<span class="price">${icon('screw', 's')}${n}</span>`;

/** 버튼 */
export const button = (label: string, data: string, opts: { tone?: 'brass' | 'crimson' | 'cyan'; small?: string; icon?: string; disabled?: boolean; cls?: string } = {}): string =>
  `<button class="btn${opts.tone ? ` ${opts.tone}` : ''}${opts.small ? ' col' : ''}${opts.cls ? ` ${opts.cls}` : ''}" type="button" ${data} ${opts.disabled ? 'disabled' : ''}>${opts.icon ? icon(opts.icon) : ''}${
    opts.small ? `<span>${label}<small>${opts.small}</small></span>` : label
  }</button>`;
