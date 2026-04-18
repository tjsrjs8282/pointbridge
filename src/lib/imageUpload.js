export const DEFAULT_IMAGE_UPLOAD_MAX_SIZE = 1 * 1024 * 1024
export const DEFAULT_IMAGE_UPLOAD_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

function getFileExtension(fileName = '') {
  const raw = String(fileName).trim()
  const parts = raw.split('.')
  if (parts.length < 2) return ''
  return String(parts.pop()).toLowerCase()
}

function isAllowedMimeType(mimeType = '', allowedExtensions = DEFAULT_IMAGE_UPLOAD_ALLOWED_EXTENSIONS) {
  const normalized = String(mimeType).toLowerCase()
  const extensionSet = new Set((allowedExtensions ?? []).map((item) => String(item).toLowerCase()))
  const allowedMimeTypes = []
  if (extensionSet.has('jpg') || extensionSet.has('jpeg')) allowedMimeTypes.push('image/jpeg')
  if (extensionSet.has('png')) allowedMimeTypes.push('image/png')
  if (extensionSet.has('webp')) allowedMimeTypes.push('image/webp')
  return allowedMimeTypes.includes(normalized)
}

export function validateImageFile(
  file,
  {
    maxSizeBytes = DEFAULT_IMAGE_UPLOAD_MAX_SIZE,
    allowedExtensions = DEFAULT_IMAGE_UPLOAD_ALLOWED_EXTENSIONS,
  } = {},
) {
  if (!file) {
    return {
      ok: false,
      code: 'FILE_REQUIRED',
      message: '이미지 파일을 선택해 주세요.',
    }
  }

  const extension = getFileExtension(file.name)
  const extensionAllowed = allowedExtensions.includes(extension)
  const mimeAllowed = isAllowedMimeType(file.type, allowedExtensions)
  if (!extensionAllowed || !mimeAllowed) {
    return {
      ok: false,
      code: 'INVALID_IMAGE_TYPE',
      message: `${allowedExtensions.join(', ')} 형식만 지원합니다.`,
    }
  }

  if (Number(file.size ?? 0) > Number(maxSizeBytes)) {
    return {
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: '1MB 이하 이미지만 업로드 가능합니다.',
    }
  }

  return { ok: true, code: null, message: '' }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

export function readFileAsDataUrl(file) {
  return fileToDataUrl(file)
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('이미지 미리보기를 생성하지 못했습니다.'))
    image.src = dataUrl
  })
}

async function resizeImageFile({
  file,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.88,
}) {
  const dataUrl = await fileToDataUrl(file)
  const image = await loadImageElement(dataUrl)

  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const targetWidth = Math.max(1, Math.round(image.width * ratio))
  const targetHeight = Math.max(1, Math.round(image.height * ratio))
  if (targetWidth === image.width && targetHeight === image.height) {
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('이미지 최적화 준비에 실패했습니다.')
  }
  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality))
  if (!blob) {
    throw new Error('이미지 최적화에 실패했습니다.')
  }

  const nextExtension = outputType === 'image/png' ? 'png' : 'jpg'
  const baseName = String(file.name ?? 'image').replace(/\.[^/.]+$/, '')
  return new File([blob], `${baseName}.${nextExtension}`, {
    type: outputType,
    lastModified: Date.now(),
  })
}

export async function prepareImageFileForUpload(
  file,
  {
    maxSizeBytes = DEFAULT_IMAGE_UPLOAD_MAX_SIZE,
    allowedExtensions = DEFAULT_IMAGE_UPLOAD_ALLOWED_EXTENSIONS,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.88,
  } = {},
) {
  const validation = validateImageFile(file, { maxSizeBytes, allowedExtensions })
  if (!validation.ok) return { file: null, error: validation }

  try {
    const optimized = await resizeImageFile({ file, maxWidth, maxHeight, quality })
    const optimizedValidation = validateImageFile(optimized, { maxSizeBytes, allowedExtensions })
    if (!optimizedValidation.ok) {
      return { file: null, error: optimizedValidation }
    }
    return { file: optimized, error: null }
  } catch (error) {
    return {
      file: null,
      error: {
        ok: false,
        code: 'IMAGE_OPTIMIZE_FAILED',
        message: error?.message ?? '이미지 처리 중 오류가 발생했습니다.',
      },
    }
  }
}
