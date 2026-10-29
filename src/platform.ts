/** 플랫폼별 기능 (PC 스팀 빌드에서만 존재). 웹·안드로이드에서는 아무 일도 하지 않는다. */
interface NativeApi {
  achievement(id: string): Promise<boolean>;
}

const native = (globalThis as { pawnisherNative?: NativeApi }).pawnisherNative;

/** 스팀 업적 해제 (ID는 스팀웍스에 등록한 이름과 같아야 한다) */
export const unlockAchievement = (id: string): void => {
  void native?.achievement(id).catch(() => false);
};
