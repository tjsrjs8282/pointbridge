# PointBridge

**포인트 기반 작업 중개 플랫폼**입니다. 구매자는 포인트로 서비스를 맡기고, 판매자는 작업을 수행하며 포인트를 적립하는 흐름을 중심으로 한 웹 애플리케이션입니다.

---

## 주요 기능

| 영역 | 내용 |
|------|------|
| **계정** | 회원가입, 로그인, 이메일 인증 |
| **프로필** | 프로필 편집, 프로필 이미지 업로드 |
| **탐색** | 카테고리 및 판매자 탐색 |
| **경제** | 포인트 적립·사용 등 포인트 시스템 |
| **소통** | 채팅 UI |
| **설정** | 테마(라이트/다크 등) 설정 |

---

## 기술 스택

- **프론트엔드**: [React](https://react.dev/) · [Vite](https://vite.dev/)
- **백엔드 / 인프라**: [Supabase](https://supabase.com/) — Auth, Database, Storage
- **배포**: [Vercel](https://vercel.com/)

---

## 배포

> Vercel에 배포한 뒤 아래 링크를 실제 프로덕션 URL로 바꿔 주세요.

- **프로덕션**: [PointBridge 배포 링크](https://your-app.vercel.app)

---

## 화면 미리보기

> 아래는 스크린샷 자리입니다. `docs/screenshots/` 등에 이미지를 두고 링크를 연결하면 됩니다.

| 홈 | 판매자 / 카테고리 |
|:---:|:---:|
| ![홈 화면](docs/screenshots/home.png) | ![탐색](docs/screenshots/explore.png) |

| 포인트 / 주문 | 채팅 · 설정 |
|:---:|:---:|
| ![포인트](docs/screenshots/points.png) | ![채팅](docs/screenshots/chat.png) |

*(이미지 파일이 없으면 위 경로에 PNG를 추가하거나, 마크다운에서 `![설명](URL)` 형태로 교체하세요.)*

---

## 로컬 실행

**요구 사항**: Node.js 20 이상 권장, npm(또는 호환 패키지 매니저)

```bash
git clone <저장소 URL>
cd pointerb
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 주소(기본 `http://localhost:5173`)로 접속합니다.

빌드·미리보기:

```bash
npm run build
npm run preview
```

---

## 환경 변수

프로젝트 루트에 `.env`를 만들고 Supabase 프로젝트 값을 넣습니다. 예시는 `.env.example`과 동일합니다.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- **URL / Anon Key**: Supabase 대시보드 → Project Settings → API에서 확인합니다.
- `.env`는 Git에 올리지 마세요(이미 `.gitignore`에 포함하는 것을 권장합니다).

---

## 앞으로 할 일 (TODO)

- [ ] 실제 배포 URL을 README의 **배포** 섹션에 반영
- [ ] `docs/screenshots/`에 화면 캡처 추가 및 미리보기 표 갱신
- [ ] Supabase 스키마·RLS 정책 문서화(필요 시 `docs/`에 정리)
- [ ] E2E 또는 주요 플로우에 대한 테스트 보강
- [ ] 접근성·반응형 UI 점검 및 개선
