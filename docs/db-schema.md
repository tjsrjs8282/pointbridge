# PointBridge DB Schema

이 문서는 Supabase `information_schema.columns` 기준으로 추출한 현재 public 스키마를
사람과 AI 도구(Cursor)가 이해하기 쉽게 정리한 문서다.

실제 구현 판단 기준:
1. 최신 migration SQL
2. 이 문서
3. ERD/스크린샷은 참고용

---

## 개요

PointBridge는 포인트 기반 서비스 거래 플랫폼이다.

핵심 흐름:
- 사용자가 프로필을 가진다
- 사용자가 판매자로 등록하면 seller_profiles가 생성된다
- 판매자는 services를 등록한다
- 구매자는 services에 대해 orders를 생성한다
- 판매자는 주문을 수락/거절한다
- 완료된 주문에 대해 reviews를 남긴다
- 상태 변화는 notifications로 사용자에게 전달된다
- 포인트 이력은 point_transactions에 기록된다

---

## 테이블 목록

- notifications
- orders
- point_transactions
- profiles
- reviews
- seller_profiles
- seller_search_view
- services

---

## 1. profiles

사용자 기본 정보 및 전역 상태를 관리하는 핵심 테이블.

### 역할
- 사용자 기본 프로필
- 포인트 보유량 관리
- 판매자 여부 관리
- 판매자 상태 관리
- 평균 리뷰/리뷰 수 캐시값 보관

### 컬럼
- `id` (uuid)
- `email` (text)
- `name` (text)
- `role` (text)
- `avatar_url` (text)
- `theme` (text)
- `point_balance` (integer)
- `created_at` (timestamp with time zone)
- `region` (text)
- `theme_mode` (text)
- `theme_preset` (text)
- `accent_preset` (text)
- `nickname` (text)
- `phone` (text)
- `address` (text)
- `address_detail` (text)
- `email_verified` (boolean)
- `bio` (text)
- `interests` (text)
- `is_seller` (boolean)
- `seller_status` (text)
- `review_avg` (numeric)
- `review_count` (integer)
- `updated_at` (timestamp with time zone)

### 도메인 메모
`seller_status`는 현재 도메인상 아래 상태를 사용한다.
- `none`
- `pending`
- `active`
- `inactive`
- `deleted`

### 관련 관계
- `profiles.id` ← `seller_profiles.user_id`
- `profiles.id` ← `services.seller_user_id`
- `profiles.id` ← `orders.buyer_user_id`
- `profiles.id` ← `orders.seller_user_id`
- `profiles.id` ← `reviews.seller_user_id`
- `profiles.id` ← `reviews.buyer_user_id`
- `profiles.id` ← `notifications.user_id`
- `profiles.id` ← `notifications.actor_user_id`
- `profiles.id` ← `point_transactions.user_id`
- `profiles.id` ← `point_transactions.related_user_id`

---

## 2. seller_profiles

판매자 전용 확장 프로필 정보.

### 역할
- 판매자 표시 이름
- 소개 문구
- 활동 지역
- 카테고리
- 판매자 활성 상태
- soft delete 상태

### 컬럼
- `id` (bigint)
- `user_id` (uuid)
- `display_name` (text)
- `intro` (text)
- `region` (text)
- `categories` (ARRAY)
- `is_active` (boolean)
- `response_time_avg` (integer)
- `total_completed_orders` (integer)
- `created_at` (timestamp with time zone)
- `is_deleted` (boolean)
- `deleted_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### 도메인 메모
판매자 삭제는 hard delete보다 soft delete 중심으로 운영한다.

삭제 시 기대 상태:
- `is_active = false`
- `is_deleted = true`
- `deleted_at` 기록
- 동시에 `profiles.is_seller = false`
- 동시에 `profiles.seller_status = 'none'` 또는 `'deleted'`

### 관련 관계
- `seller_profiles.user_id` → `profiles.id`

---

## 3. services

판매자가 등록한 개별 서비스.

### 역할
- 서비스 제목/설명
- 카테고리
- 가격(포인트)
- 활성 여부

### 컬럼
- `id` (bigint)
- `seller_user_id` (uuid)
- `title` (text)
- `description` (text)
- `category` (text)
- `price_point` (integer)
- `is_active` (boolean)
- `created_at` (timestamp with time zone)

### 도메인 메모
판매자 삭제 또는 서비스 비활성화 시 hard delete보다 `is_active = false` 방식 우선 고려.

### 관련 관계
- `services.seller_user_id` → `profiles.id`
- `orders.service_id` → `services.id`
- `reviews.service_id` → `services.id`

---

## 4. orders

구매자가 판매자 서비스에 대해 신청한 주문/요청 데이터.

### 역할
- 구매 요청 생성
- 판매자 수락/거절 상태 관리
- 완료 여부 관리
- 채팅 연결 기준
- 거절 사유 기록

### 컬럼
- `id` (bigint)
- `buyer_user_id` (uuid)
- `seller_user_id` (uuid)
- `service_id` (bigint)
- `category` (text)
- `title_snapshot` (text)
- `price_point` (integer)
- `request_message` (text)
- `status` (text)
- `created_at` (timestamp with time zone)
- `accepted_at` (timestamp with time zone)
- `rejected_at` (timestamp with time zone)
- `completed_at` (timestamp with time zone)
- `cancelled_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)
- `rejection_reason_code` (text)
- `rejection_reason_text` (text)
- `chat_room_id` (text)
- `notification_sent` (boolean)

### 도메인 메모
주문 상태는 현재 아래 흐름을 기준으로 사용한다.
- `pending`
- `accepted`
- `rejected`
- `in_progress`
- `completed`
- `cancelled`

### 거절 사유 코드 예시
- `unavailable_schedule`
- `out_of_scope`
- `insufficient_material`
- `budget_mismatch`
- `internal_issue`
- `other`

### 규칙
- 주문 생성 시 상태는 기본적으로 `pending`
- 수락 시 `accepted_at` 기록
- 거절 시 `rejected_at` 기록
- 완료 시 `completed_at` 기록
- 완료된 주문만 리뷰 작성 가능
- 수락 시 채팅방 생성 또는 기존 채팅방 연결

### 관련 관계
- `orders.buyer_user_id` → `profiles.id`
- `orders.seller_user_id` → `profiles.id`
- `orders.service_id` → `services.id`
- `reviews.order_id` → `orders.id`
- `point_transactions.order_id` → `orders.id`

---

## 5. reviews

완료된 주문 기반 리뷰.

### 역할
- 판매자 평점
- 후기 본문
- 리뷰 수 집계

### 컬럼
- `id` (bigint)
- `order_id` (bigint)
- `service_id` (bigint)
- `seller_user_id` (uuid)
- `buyer_user_id` (uuid)
- `rating` (integer)
- `content` (text)
- `is_hidden` (boolean)
- `created_at` (timestamp with time zone)

### 도메인 메모
- 리뷰는 `orders.status = completed` 인 경우만 작성 가능
- 한 주문당 리뷰 1개만 허용하는 방향 권장
- `rating` 평균으로 판매자 평점 계산
- `profiles.review_avg`, `profiles.review_count`는 캐시값으로 활용 가능

### 관련 관계
- `reviews.order_id` → `orders.id`
- `reviews.service_id` → `services.id`
- `reviews.seller_user_id` → `profiles.id`
- `reviews.buyer_user_id` → `profiles.id`

---

## 6. notifications

사용자 알림.

### 역할
- 주문 신청 알림
- 주문 수락 알림
- 주문 거절 알림
- 시스템 알림
- 액션 중심 알림 데이터 저장

### 컬럼
- `id` (bigint)
- `user_id` (uuid)
- `type` (text)
- `title` (text)
- `body` (text)
- `related_order_id` (bigint)
- `is_read` (boolean)
- `created_at` (timestamp with time zone)
- `actor_user_id` (uuid)
- `service_id` (uuid)
- `order_id` (uuid)
- `action_type` (text)
- `metadata` (jsonb)
- `read_at` (timestamp with time zone)

### 도메인 메모
현재 notifications는 구형 컬럼과 신형 컬럼이 혼재된 상태다.
즉 아래 두 계열이 같이 존재함:
- 구형: `type`, `related_order_id`
- 신형: `action_type`, `order_id`, `metadata`, `actor_user_id`

향후에는 `action_type` 중심으로 정렬하는 방향.

### 권장 action_type 예시
- `order_request`
- `order_accepted`
- `order_rejected`
- `review_received`
- `chat_started`
- `system`

### 규칙
- 주문 신청 시 판매자에게 알림 생성
- 주문 수락 시 구매자에게 알림 생성
- 주문 거절 시 구매자에게 알림 생성
- 거절 사유는 `metadata` 또는 order의 rejection 필드와 연결 가능

### 관련 관계
- `notifications.user_id` → `profiles.id`
- `notifications.actor_user_id` → `profiles.id`
- `notifications.order_id` ↔ `orders.id` (도메인상 연결)
- `notifications.service_id` ↔ `services.id` (도메인상 연결)

### 주의
현재 추출 결과상 `notifications.service_id`, `notifications.order_id` 타입이 `uuid`로 보인다.
다른 테이블의 `services.id`, `orders.id`는 `bigint`이므로
실제 FK 일치 여부는 migration/실 DB에서 재확인 필요.

---

## 7. point_transactions

포인트 변동 이력.

### 역할
- 포인트 충전
- 사용
- 환불
- 보상
- 주문과 연결된 정산/차감 기록

### 컬럼
- `id` (bigint)
- `user_id` (uuid)
- `order_id` (bigint)
- `type` (text)
- `amount` (integer)
- `description` (text)
- `created_at` (timestamp with time zone)
- `related_user_id` (uuid)
- `status` (text)
- `payment_method` (text)
- `metadata` (jsonb)

### 도메인 메모
현재 type은 아래 계열로 정렬하는 방향.
- `charge`
- `use`
- `refund`
- `reward`
- `adjustment`

과거 `debit/credit` 계열이 있었다면 현재 도메인상 다음처럼 매핑 가능:
- `debit` → `use`
- `credit` → `reward` 또는 문맥에 따라 `charge`

### 관련 관계
- `point_transactions.user_id` → `profiles.id`
- `point_transactions.related_user_id` → `profiles.id`
- `point_transactions.order_id` → `orders.id`

---

## 8. seller_search_view

판매자 검색용 뷰.

### 역할
- 판매자 목록/검색 화면에서 빠르게 조회하기 위한 뷰
- seller_profiles + profiles 일부 정보를 합쳐서 제공

### 컬럼
- `seller_profile_id` (bigint)
- `seller_user_id` (uuid)
- `display_name` (text)
- `intro` (text)
- `region` (text)
- `categories` (ARRAY)
- `is_active` (boolean)
- `response_time_avg` (integer)
- `total_completed_orders` (integer)
- `avatar_url` (text)

### 사용처
- 판매자 찾기 페이지
- 추천 판매자 목록
- 검색/필터 기반 seller card 렌더링

---

## 관계 요약

### 사용자 중심
- `profiles.id` = 모든 사용자 기준 키

### 판매자 관련
- `profiles.id` → `seller_profiles.user_id`
- `profiles.id` → `services.seller_user_id`

### 주문 관련
- `orders.buyer_user_id` → `profiles.id`
- `orders.seller_user_id` → `profiles.id`
- `orders.service_id` → `services.id`

### 리뷰 관련
- `reviews.order_id` → `orders.id`
- `reviews.service_id` → `services.id`
- `reviews.seller_user_id` → `profiles.id`
- `reviews.buyer_user_id` → `profiles.id`

### 알림 관련
- `notifications.user_id` → `profiles.id`
- `notifications.actor_user_id` → `profiles.id`

### 포인트 관련
- `point_transactions.user_id` → `profiles.id`
- `point_transactions.related_user_id` → `profiles.id`
- `point_transactions.order_id` → `orders.id`

---

## 핵심 도메인 규칙 요약

### 판매자 등록
- seller_profiles 생성
- profiles.is_seller = true
- profiles.seller_status = active

### 판매자 삭제
- hard delete보다 soft delete 우선
- seller_profiles.is_deleted = true
- seller_profiles.is_active = false
- profiles.is_seller = false
- profiles.seller_status = none 또는 deleted
- services.is_active = false 처리 고려

### 주문
- 생성 시 `pending`
- 판매자가 수락/거절
- 수락 시 채팅 연결
- 완료 시 리뷰 가능

### 리뷰
- completed 주문만 작성 가능
- 판매자 평균 평점 계산에 반영

### 알림
- action 기반 알림 구조로 점진적 정렬
- 주문 신청/수락/거절 흐름과 연결

### 포인트
- charge / use / refund / reward 중심으로 정리
- 주문과 연결된 사용 내역 추적 가능

---

## Cursor용 사용 원칙

이 프로젝트를 AI 도구(Cursor)가 이해할 때 우선순위는 아래와 같다.

1. 최신 migration SQL
2. 이 문서 (`docs/db-schema.md`)
3. 도메인 규칙 문서 (`docs/domain-rules.md`가 있으면 그것)
4. ERD/스크린샷은 참고용

즉, 스크린샷보다 이 문서를 우선 기준으로 사용한다.
