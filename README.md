# 디지털 안심 체크

자동차를 팔거나 이사 가기 전, 차량·스마트홈에 남은 내 정보와 접근 권한을 단계별로 점검하는 자가 체크리스트 앱입니다.

- 웹: https://sxx-xx.github.io/digital-check/
- 안드로이드: Google Play 출시 준비 중

계정, 서버, 분석·광고 도구 없이 동작합니다. 점검 기록은 사용자의 기기에만 저장됩니다. ([개인정보처리방침](https://sxx-xx.github.io/digital-check/privacy.html))

> 이 앱은 삭제를 대신 실행하거나 검증하지 않습니다. 완료 표시는 사용자의 자가 신고이며, 실제 절차는 각 제조사·서비스의 공식 안내를 따르세요.

## 구조

| 경로 | 내용 |
|---|---|
| `www/` | 앱 본체 (정적 PWA: HTML/CSS/JS, 빌드 과정 없음) |
| `tools/` | 로컬 서버 `serve.cjs`, 테스트 `verify.cjs` |
| `assets/` | 안드로이드 아이콘·스플래시 원본 |
| `store/` | Google Play 등록용 이미지와 설명문 |
| `capacitor.config.json` | 안드로이드 앱 래핑 설정 (Capacitor) |
| `.github/workflows/` | 웹 자동 배포(Pages), 안드로이드 자동 빌드 |

## 로컬에서 실행

```bash
node tools/serve.cjs      # http://localhost:4173
node tools/verify.cjs     # 테스트
```
`www/index.html`을 직접 열어도 됩니다(오프라인 설치 기능 제외).

## 배포

**웹**: `main` 브랜치에 `www/` 변경을 push하면 GitHub Actions가 테스트 후 GitHub Pages에 자동 배포합니다.
수정 후에는 `www/sw.js`의 `CACHE` 이름 숫자를 올려야 기존 사용자에게 새 버전이 반영됩니다.

**안드로이드**: 같은 push로 `Build Android app` 워크플로가 실행됩니다.
- `digital-check-debug-apk`: 휴대폰에 바로 설치해 볼 수 있는 테스트용 APK
- `digital-check-release-aab`: Google Play 업로드용 서명된 AAB (저장소 Secrets에 업로드 키가 있을 때)

버전을 올릴 때는 `package.json`의 `version`을 바꾸세요. `versionCode`는 워크플로 실행 번호로 자동 증가합니다.

필요한 Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
