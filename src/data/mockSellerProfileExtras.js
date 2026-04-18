/**
 * 임시 mock 데이터.
 * TODO(DB): seller_profiles 확장 컬럼(JSON/배열)이 반영되면 이 데이터는 단계적으로 제거한다.
 */
export const mockSellerProfileExtrasByUserId = {
  '00000000-0000-0000-0000-000000000001': {
    specialties: ['랜딩페이지 제작', 'React 유지보수'],
    skills: ['React', 'TypeScript', 'Node.js'],
    careers: [
      { title: '프론트엔드 개발자', organization: '에이전시 A', years: '3년' },
      { title: '프리랜서 개발자', organization: '개인', years: '2년' },
    ],
    certificates: ['정보처리기사'],
  },
}

const fallbackByCategory = {
  IT프로그래밍: {
    specialties: ['웹/앱 개발', '유지보수'],
    skills: ['JavaScript', 'React'],
  },
  디자인: {
    specialties: ['상세페이지 디자인', '브랜드 그래픽'],
    skills: ['Figma', 'Photoshop'],
  },
  '영상/음향': {
    specialties: ['쇼츠 편집', '썸네일 제작'],
    skills: ['Premiere Pro', 'After Effects'],
  },
  마케팅: {
    specialties: ['콘텐츠 운영', '광고 셋업'],
    skills: ['GA4', '메타 광고'],
  },
  '언어/번역': {
    specialties: ['한-영 번역', '비즈니스 문서 번역'],
    skills: ['번역 QA', '용어집 관리'],
  },
  '설치/수리': {
    specialties: ['가전 설치', '생활 수리'],
    skills: ['현장 진단', '안전 작업'],
  },
  생활서비스: {
    specialties: ['원룸 청소', '구매 대행'],
    skills: ['현장 대응', '고객 커뮤니케이션'],
  },
}

export function getMockSellerProfileExtras({ sellerUserId, category }) {
  const byUser = sellerUserId ? mockSellerProfileExtrasByUserId[sellerUserId] : null
  if (byUser) return byUser
  return fallbackByCategory[String(category ?? '').trim()] ?? null
}
