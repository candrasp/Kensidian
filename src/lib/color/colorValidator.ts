// Validasi format kode warna CSS yang ketat sesuai DOKUMEN-UJI §05

export function isValidCssColor(str: string): boolean {
  const trimmed = str.trim()
  if (!trimmed) return false

  // 1. Format HEX: 3, 4, 6, 8 digit tepat
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return true
  }

  // 2. Format RGB/RGBA koma: rgb(r, g, b) atau rgba(r, g, b, a)
  const rgbComma = /^rgba?\(\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)(?:\s*,\s*(0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.exec(trimmed)
  if (rgbComma) {
    const check = (v: string) => (v.endsWith('%') ? parseInt(v, 10) <= 100 : parseInt(v, 10) <= 255)
    return check(rgbComma[1]) && check(rgbComma[2]) && check(rgbComma[3])
  }

  // 3. Format RGB modern spasi: rgb(r g b) atau rgb(r g b / a)
  const rgbSpace = /^rgba?\(\s*(\d{1,3}%?)\s+(\d{1,3}%?)\s+(\d{1,3}%?)(?:\s*\/\s*(0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.exec(trimmed)
  if (rgbSpace) {
    const check = (v: string) => (v.endsWith('%') ? parseInt(v, 10) <= 100 : parseInt(v, 10) <= 255)
    return check(rgbSpace[1]) && check(rgbSpace[2]) && check(rgbSpace[3])
  }

  // 4. Format HSL/HSLA: S & L WAJIB tanda % dan <= 100%
  const hslComma = /^hsla?\(\s*(\d+(?:deg)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*(0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.exec(trimmed)
  if (hslComma) {
    return parseInt(hslComma[2], 10) <= 100 && parseInt(hslComma[3], 10) <= 100
  }

  const hslSpace = /^hsla?\(\s*(\d+(?:deg)?)\s+(\d{1,3})%\s+(\d{1,3})%(?:\s*\/\s*(0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.exec(trimmed)
  if (hslSpace) {
    return parseInt(hslSpace[2], 10) <= 100 && parseInt(hslSpace[3], 10) <= 100
  }

  // 5. Format HWB: hwb(hue w% b%)
  const hwb = /^hwb\(\s*\d+(?:deg)?\s+(\d{1,3})%\s+(\d{1,3})%\s*\)$/i.exec(trimmed)
  if (hwb) {
    return parseInt(hwb[1], 10) <= 100 && parseInt(hwb[2], 10) <= 100
  }

  return false
}
