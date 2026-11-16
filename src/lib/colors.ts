import type { IconColor } from '@/lib/ipc/types'

export const COLOR_OPTIONS: { name: IconColor; cssVar: string; hex: string }[] = [
  { name: 'red', cssVar: 'var(--icon-red)', hex: '#bf616a' },
  { name: 'orange', cssVar: 'var(--icon-orange)', hex: '#d08770' },
  { name: 'yellow', cssVar: 'var(--icon-yellow)', hex: '#ebcb8b' },
  { name: 'green', cssVar: 'var(--icon-green)', hex: '#a3be8c' },
  { name: 'teal', cssVar: 'var(--icon-teal)', hex: '#88c0d0' },
  { name: 'blue', cssVar: 'var(--icon-blue)', hex: '#81a1c1' },
  { name: 'purple', cssVar: 'var(--icon-purple)', hex: '#b48ead' },
  { name: 'pink', cssVar: 'var(--icon-pink)', hex: '#d946ef' },
  { name: 'gray', cssVar: 'var(--icon-gray)', hex: '#9aa2b2' },
]

export const COLOR_MAP: Record<IconColor, string> = {
  red: 'var(--icon-red)',
  orange: 'var(--icon-orange)',
  yellow: 'var(--icon-yellow)',
  green: 'var(--icon-green)',
  teal: 'var(--icon-teal)',
  blue: 'var(--icon-blue)',
  purple: 'var(--icon-purple)',
  pink: 'var(--icon-pink)',
  gray: 'var(--icon-gray)',
}
