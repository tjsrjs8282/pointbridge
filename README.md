# PointBridge

PointBridge는 전문가와 사용자를 연결하는 **포인트 기반 작업 매칭 플랫폼**입니다.  
단순 의뢰 등록을 넘어서, 마이페이지/포인트/판매자 경험을 중심으로 UX를 고도화하고, 활동 기반 등급 체계를 붙여 서비스 몰입도를 높이는 방향으로 발전 중입니다.

---

## Project Overview

- 서비스 의뢰-수행 플로우를 포인트 경제로 연결하는 마켓플레이스형 웹 애플리케이션
- 구매자/판매자/관리자 시나리오를 하나의 제품 경험으로 통합
- Supabase 기반으로 인증, 데이터, 권한(RLS), 향후 확장 가능한 운영 구조를 함께 설계
- 최근에는 화면 추가보다 **사용성 리팩토링과 도메인 정합성 개선**에 집중

---

## Core Features

- **Marketplace Flow**: 판매자 탐색, 서비스 비교, 주문 생성, 수락/거절/완료 플로우
- **MyPage UX**: 계정 허브, 프로필, 활동/포인트 내역을 한 화면 흐름에서 관리
- **Seller System**: 판매자 프로필, 서비스 운영, 완료 건수/평점 반영 구조
- **Point Lifecycle**: 충전/사용/적립/환전 요청까지 포인트 상태를 일관되게 관리
- **Admin-ready Structure**: 운영자 정책, 로그, 검수/조정 가능한 데이터 설계

---

## Rank System

활동 데이터 기반으로 사용자 상태를 표현하는 등급 시스템을 반영 중입니다.

- 🌱 **Newbie**
- ⚡ **Starter**
- 🔥 **Seller**
- 🚀 **Pro**
- 👑 **Elite**
- 💎 **Legend**

핵심 방향:

- 텍스트 뱃지 남발보다 아이콘/툴팁 중심의 가벼운 상태 표현
- 서버 계산 함수와 프론트 표시 규칙을 분리해 운영 변경에 유연하게 대응
- 판매/구매/충전 활동을 균형 있게 반영하는 구조로 정리

---

## Point System

PointBridge의 포인트는 단순 적립 포인트가 아니라 서비스 행동을 연결하는 핵심 도메인입니다.

- **충전**: 빠른 금액 버튼 + 직접 입력 + 초기화 흐름으로 진입 장벽 최소화
- **사용**: 주문 수락 시 차감, 상태 변경과 로그를 함께 관리
- **적립**: 주문 완료 시 판매자 적립 반영
- **환전**: 신청/승인/반려 단계를 분리한 운영형 구조로 확장
- **로그 UX**: 내역 설명은 깔끔하게, 금액은 우측에서 명확하게 표시

---

## Recent Updates

최근 업데이트는 기능 추가보다 서비스 품질을 끌어올리는 리팩토링에 집중되어 있습니다.

- 마이페이지 UI/UX 개선: 정보 밀도와 가독성 균형 재정리
- 좌측 계정 허브 정리: 액션 우선순위 재배치, 불필요 요소 정돈
- 프로필 카드 레이아웃 정렬 개선 및 닉네임/상태 아이콘 구조 개선
- 판매자/등급 텍스트 노출 축소, 툴팁 중심 상태 표현 강화
- 포인트 내역 UI 개선(설명/금액 표시 역할 분리)
- 포인트 충전 화면 UX 개선(버튼, 입력, 초기화 흐름 정비)
- 중복 navigation 요소 제거로 화면 혼잡도 감소
- 이벤트 배너 구조 정리 및 사용자 제어 흐름 개선
- 활동 기반 등급 시스템(Newbie~Legend) 반영 준비 및 로직 정리
- 환전 기능 구조 정리(신청/승인/반려) 및 운영 대응성 보강
- Supabase/PostgreSQL 기준 SQL 구조 검토 및 타입 정합성 보완

---

## Tech Stack

- **Frontend**: [React](https://react.dev/), [Vite](https://vite.dev/)
- **Backend/Infra**: [Supabase](https://supabase.com/) (Auth, Postgres, Storage, RPC, RLS)
- **Deployment**: [Vercel](https://vercel.com/)
- **Data Modeling**: PostgreSQL + migration 기반 스키마 관리

---

## Direction / Roadmap

- [ ] 마이페이지-포인트-판매자 대시보드 간 경험 연결 강화
- [ ] 등급 정책의 운영 실험(기준치/표시 방식/리텐션 지표)
- [ ] 환전/포인트 로그 운영 도구 고도화
- [ ] 핵심 사용자 여정 기준 E2E 테스트 보강
- [ ] UI 접근성/반응형 품질 개선 지속

---

## Local Setup

**Requirements**: Node.js 20+, npm

```bash
git clone <repository-url>
cd pointbridge-main
npm install
npm run dev
```

브라우저에서 Vite 기본 주소(`http://localhost:5173`)로 접속합니다.

```bash
npm run build
npm run preview
```

---

## Environment Variables

프로젝트 루트에 `.env`를 만들고 Supabase 값을 설정합니다.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- 값 위치: Supabase Dashboard -> Project Settings -> API
- `.env`는 커밋하지 않습니다.
