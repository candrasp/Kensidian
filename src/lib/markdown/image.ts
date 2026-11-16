import { convertFileSrc } from '@tauri-apps/api/core'
import { isTauri } from '@/lib/ipc'

const IMAGE_EXT = /\.(png|jpe?g|webp|svg|gif|bmp|ico)$/i

export function isImageFile(path: string): boolean {
  const clean = path.split('?')[0].split('#')[0]
  return IMAGE_EXT.test(clean)
}

export function parseImageAttributes(raw: string): {
  fileName: string
  alt: string
  width?: string
  height?: string
} {
  const parts = raw.split('|').map((s) => s.trim())
  const fileName = parts[0]
  let alt = fileName
  let width: string | undefined
  let height: string | undefined

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const dimMatch = part.match(/^(\d+)(?:x(\d+))?$/)
    if (dimMatch) {
      width = `${dimMatch[1]}px`
      if (dimMatch[2]) height = `${dimMatch[2]}px`
    } else if (part) {
      alt = part
    }
  }

  return { fileName, alt, width, height }
}

export function resolveImageUrl(fileName: string, vaultPath?: string): string {
  if (/^(https?:|data:|blob:)/i.test(fileName)) {
    return fileName
  }

  if (!vaultPath || !isTauri) {
    return fileName
  }

  const cleanName = fileName.replace(/^\.?\/+/, '').replace(/^assets\/+/, '')
  const normalizedVault = vaultPath.replace(/\\/g, '/').replace(/\/+$/, '')
  const fullPath = `${normalizedVault}/.kensidian/assets/${cleanName}`

  try {
    return convertFileSrc(fullPath)
  } catch {
    return fileName
  }
}
