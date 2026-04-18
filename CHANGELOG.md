# Changelog

All notable changes to this project are documented here.

## 2026-04-19

### Product & UX Polish

PointBridge today focused on quality-up iterations: less visual noise, clearer state communication, and tighter flows across MyPage and Point features.

- 마이페이지 UI/UX 개선: 페이지 정보 밀도와 우선순위를 재정렬해 핵심 행동(프로필 관리, 포인트, 활동 확인) 진입이 더 자연스럽도록 정리
- 좌측 계정 허브 정리: 환전/충전/계정 액션 배치를 다시 구성하고, 사용 빈도 낮은 요소를 축소해 허브의 역할을 명확화
- 프로필 카드 레이아웃 정렬 개선: 상하 간격, 텍스트 축, 버튼 정렬을 통일해 카드별 시각 균형 개선
- 닉네임/상태 아이콘 구조 개선: 닉네임과 상태 요소를 분리해 읽기 쉬운 정보 구조로 리팩토링
- 판매자/등급 텍스트 제거 및 툴팁 중심 구조 전환: 고정 문구 노출을 줄이고 아이콘 + 툴팁으로 간결한 상태 전달
- 중복 nav 제거: 컨텍스트가 겹치는 네비게이션 요소를 정리해 화면 복잡도 감소
- 이벤트 배너 구조 정리: 배너 표시/숨김 로직을 사용성 중심으로 정돈하고 관리 가능한 형태로 확장

### Point Experience Upgrade

- 포인트 내역 UI 개선: 설명 영역과 금액 표기 역할을 분리하고, 금액은 우측 정렬 중심으로 가독성 강화
- 포인트 충전 페이지 UI/UX 개선: 화면을 compact하게 정리하고 충전 행동 중심 인터랙션으로 재구성
- 충전 금액 버튼/input/초기화 흐름 개선: 빠른 선택 + 직접 입력 + 리셋이 자연스럽게 이어지는 조작 흐름으로 보완

### Domain Logic & Backend Alignment

- 등급 시스템(Newbie ~ Legend) 반영 준비/로직 정리: 활동 기반 기준을 서버/클라이언트 표현과 연결 가능한 구조로 정리
- 환전 기능 구조 정리/구현 준비: 신청, 승인, 반려 단계를 분리한 운영형 플로우로 정돈
- Supabase/PostgreSQL 기준 SQL 구조 검토 및 보완 방향 정리:
  - 운영 스키마 타입(특히 orders/services/point logs) 정합성 재점검
  - RPC/트리거/정책(RLS) 충돌 가능 구간 점검
  - 통합 SQL 번들 및 재실행 가능한 마이그레이션 정리 방향 확립

### Engineering Notes

- 문서와 마이그레이션을 함께 정리해 “바로 배포 가능한 SQL 정합성”을 우선 확보
- 화면 개선과 데이터 구조 개선을 병렬로 진행해, 단기 UX와 중장기 운영성을 동시에 강화
