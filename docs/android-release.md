# 안드로이드 출시 빌드 · 서명 키 (D-635)

안드로이드 먼저, Steam(PC · Electron)은 나중 (사용자 결정 10). 이 문서는 사용자가 손으로 할 일과 CI가 하는 일을 적는다.

## CI가 만드는 것 (`.github/workflows/build.yml` → `android`)

손으로 실행(Actions › Build › Run workflow, `make_key` = none)하거나 `v*` 태그를 올리면 한 번에 둘 다 만든다. push만으로는 돌지 않는다(D-080).

| 파일 | 빌드 | 서명 키 | 어디로 |
|---|---|---|---|
| `pawnisher-checkmate.apk` | `assembleRelease` | sideload (`SIDELOAD_PASSPHRASE`) | `apk-latest` 프리릴리스 (+ `-test.` 검수 릴리스) |
| `pawnisher-checkmate.aab` | `bundleRelease` | upload (`ANDROID_UPLOAD_PASSPHRASE`) | Actions 아티팩트 `pawnisher-aab-upload-<실행 번호>` (7일) → Play Console에 올린다 |

- 둘 다 **release**: `debuggable false` · 웹뷰 원격 디버깅 꺼짐(Capacitor는 앱이 debuggable일 때만 켠다) · R8 코드 줄이기(`minifyEnabled true`, Capacitor 플러그인 규칙은 capacitor-android가 같이 싣는다 · 리소스 줄이기는 끔).
- 권한: `VIBRATE`만. `INTERNET`은 없다(D-531) — 게임은 fetch를 앱 안 파일(소리)에만 쓰고, 웹뷰는 앱 안 주소(`https://localhost`)로 파일을 읽어 인터넷 권한이 필요 없다. 디버그 빌드만 라이브 리로드용으로 `src/debug/AndroidManifest.xml`에서 더한다.
- CI가 APK를 aapt2로 열어 **debuggable이거나 INTERNET이 있으면 실패**시킨다(「Check release flags」 단계).
- **키가 없으면 멈추지 않는다**: 시험용 디버그 키(`android/app/beta-debug.keystore`, 비밀 아님 — D-477)로 서명하고 이름에 표시를 붙인다 — `pawnisher-checkmate-TESTKEY.apk`, `pawnisher-checkmate-TESTKEY-not-for-play.aab`. 실행 요약 · 릴리스 설명에도 어떤 키였는지 적힌다. TESTKEY AAB는 Play에 올릴 수 없다.
- 로컬: `npm run android:apk`(출시 APK) · `npm run android:aab` · `npm run android:debug`(디버그 — 라이브 리로드 · chrome://inspect 원격 디버깅은 이것만).

## 서명 키 — 이미 있는 것 (D-479)

저장소에는 **GitHub Secrets 암호로 잠근 키 파일만** 있다: `android/keystore/sideload.jks.gpg` · `android/keystore/upload.jks.gpg` (2026-11-14 CI가 만듦). 잠그지 않은 `.jks`는 저장소 · 채팅 · 로그 어디에도 없다. `.jks`를 커밋하지 않는다.

GitHub 저장소 › Settings › Secrets and variables › Actions 에 있어야 하는 비밀 두 개:

| 이름 | 쓰는 곳 | 규칙 |
|---|---|---|
| `SIDELOAD_PASSPHRASE` | 직접 설치 APK 키를 풀고, 키 저장소 · 키 암호로도 쓴다 | 16자 이상 |
| `ANDROID_UPLOAD_PASSPHRASE` | Play 업로드 키(AAB)를 풀고, 키 저장소 · 키 암호로도 쓴다 | 16자 이상 · 위와 달라야 함 |

키 이름(alias)은 `sideload` · `upload`로 고정이라 따로 비밀이 필요 없다. 두 암호는 비밀번호 관리 앱에 적어 둔다 — 잃으면 키를 다시 만들어야 한다.

### 업로드 키를 처음 만들거나 다시 만들 때

**방법 A — GitHub 안에서 (권장, 키가 내 컴퓨터를 거치지 않는다)**
1. Secrets에 `ANDROID_UPLOAD_PASSPHRASE`(16자 이상, `SIDELOAD_PASSPHRASE`와 다르게)를 넣는다.
2. Actions › Build › Run workflow › `make_key` = **upload** (이미 있으면 `replace_key`도 켠다).
3. CI가 RSA 4096 · 10000일 키를 만들어 `android/keystore/upload.jks.gpg`만 커밋한다. 로그에 찍힌 SHA-256 지문을 적어 둔다.

**방법 B — 내 컴퓨터에서 직접 만들 때** (JDK의 `keytool` · `gpg` 필요. 결과는 방법 A와 같은 파일)
```sh
# 1) 업로드 키 만들기 — 암호는 ANDROID_UPLOAD_PASSPHRASE 와 같은 값 (저장소 암호 = 키 암호)
keytool -genkeypair -v -keystore upload.jks -storetype PKCS12 \
  -alias upload -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Pawnisher Checkmate upload, O=graviton94"
# 2) 지문 확인 (Play Console › 앱 무결성에 보이는 업로드 인증서와 맞춰 볼 때)
keytool -list -v -keystore upload.jks -alias upload | grep SHA256
# 3) 같은 암호로 잠가 저장소에 넣는다 (잠근 파일만 커밋)
gpg --symmetric --cipher-algo AES256 -o android/keystore/upload.jks.gpg upload.jks
# 4) 원본 upload.jks 는 저장소 밖 안전한 곳(비밀번호 관리 앱 첨부 등)에 두거나 지운다 — 절대 커밋하지 않는다
```

## Google Play 첫 출시 순서 (사용자)

1. Play Console 개발자 계정(등록비 25달러 · 신원 확인). 개인 계정이면 프로덕션 전에 **비공개 테스트 12명 이상 · 14일**이 필요하다.
2. 앱 만들기: 이름 `Pawnisher : Checkmate` · 게임 · 무료 · 패키지 `io.github.graviton94.pawnisher`.
3. Actions에서 Build를 손으로 실행 → 아티팩트의 `pawnisher-checkmate.aab`(TESTKEY가 아닌 것)를 내부 테스트 트랙에 올린다. **Play 앱 서명**은 기본값(Google이 앱 서명 키를 보관)으로 두고, 우리 `upload` 키는 업로드 키가 된다.
4. 스토어 등록정보: `docs/store/listing.md` 문안 · 그림은 `build-res/store/`(`play-feature.png` 1024×500) + 게임 화면 캡처.
5. 앱 콘텐츠: 개인정보처리방침 주소 `https://graviton94.github.io/pawnisher/privacy/` · 광고 없음 · 데이터 보안 · 콘텐츠 등급 → 답은 `docs/store/play-console.md`.
6. versionCode는 CI 실행 번호(`GITHUB_RUN_NUMBER`)라 실행마다 오른다. versionName은 `release_tag` 입력(없으면 `1.2.0`).

## 직접 설치 테스터에게

APK는 이번부터 release다. 서명 키(sideload)는 그대로라 **덮어 설치하면 저장이 남는다**. 단, `TESTKEY` APK는 sideload 키로 깐 앱 위에 깔리지 않는다(서명이 다르다).
