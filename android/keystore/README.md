# 안드로이드 서명 키 (D-479 — CARPEDIEM과 같은 방식)

| 키 | 쓰는 곳 | 저장소에 있는 것 | 잠금 암호 (GitHub Secrets에만) |
|---|---|---|---|
| sideload | 직접 설치 APK (`build.yml` 손으로 실행 → `apk-latest` · 검수 릴리스) | `sideload.jks.gpg` | `SIDELOAD_PASSPHRASE` |
| upload | Google Play AAB (`build.yml` 손으로 실행 — APK와 함께 늘 만든다, D-635) | `upload.jks.gpg` | `ANDROID_UPLOAD_PASSPHRASE` |

- 키는 `Build` 워크플로를 손으로 실행하며 `make_key`를 sideload / upload로 고르면 GitHub 안에서 만들어 암호로 잠근 파일만 여기에 올린다. 잠그지 않은 키 · 암호는 저장소 · 채팅 · 로그 어디에도 남지 않는다.
- 두 암호는 16자 이상, 서로 달라야 한다. 잃어버리면 키를 다시 만들어야 하고(`replace`), 그때 테스터는 한 번 지우고 다시 깔아야 한다 — 비밀번호 관리 앱에 따로 적어 둔다.
- 키가 없으면 APK · AAB 모두 고정 시험용 디버그 키(`../app/beta-debug.keystore`, 비밀 아님)로 서명되고 이름에 `TESTKEY`가 붙는다(D-635 — TESTKEY AAB는 Play에 올릴 수 없다).
- 키를 내 컴퓨터에서 직접 만드는 법 · Play 첫 출시 순서: `docs/android-release.md`.
