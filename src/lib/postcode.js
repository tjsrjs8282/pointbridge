const KAKAO_POSTCODE_SCRIPT =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

let postcodeScriptPromise = null

function loadPostcodeScript() {
  if (window?.daum?.Postcode) return Promise.resolve()
  if (postcodeScriptPromise) return postcodeScriptPromise

  postcodeScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${KAKAO_POSTCODE_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('주소 검색 스크립트 로드 실패')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = KAKAO_POSTCODE_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('주소 검색 스크립트 로드 실패'))
    document.body.appendChild(script)
  })

  return postcodeScriptPromise
}

export async function openKakaoPostcode({ onComplete, onFallback } = {}) {
  try {
    await loadPostcodeScript()
    if (!window?.daum?.Postcode) {
      throw new Error('카카오 주소 검색을 사용할 수 없습니다.')
    }

    const postcode = new window.daum.Postcode({
      oncomplete: (data) => {
        const address = data.roadAddress || data.jibunAddress || ''
        onComplete?.(address, data)
      },
    })
    postcode.open()
  } catch (error) {
    // graceful fallback: manual input prompt when API/script is unavailable.
    const manualAddress = window.prompt('주소 검색을 사용할 수 없습니다. 주소를 직접 입력해 주세요.')
    if (manualAddress) {
      onFallback?.(manualAddress)
      onComplete?.(manualAddress, null)
      return
    }
    throw error
  }
}
