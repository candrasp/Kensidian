import {
  WidgetType,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  Decoration,
  type DecorationSet,
} from '@codemirror/view'
import type { Range } from '@codemirror/state'
import { isImageFile, parseImageAttributes, resolveImageUrl } from '@/lib/markdown/image'

class ImageWidget extends WidgetType {
  constructor(
    readonly from: number,
    readonly to: number,
    readonly fileName: string,
    readonly url: string,
    readonly alt: string,
    readonly width?: string,
    readonly height?: string
  ) {
    super()
  }

  eq(other: ImageWidget): boolean {
    return (
      other.from === this.from &&
      other.to === this.to &&
      other.url === this.url &&
      other.alt === this.alt &&
      other.width === this.width &&
      other.height === this.height
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const isReadOnly = view.state.readOnly
    const wrap = document.createElement('div')
    wrap.className = 'cm-image-container relative inline-block group my-2 select-none max-w-full'

    const img = document.createElement('img')
    img.src = this.url
    img.alt = this.alt
    img.className =
      'note-image rounded-md shadow-xs block ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-line transition-all'
    if (this.width) img.style.width = this.width
    if (this.height) {
      img.style.height = this.height
      img.style.objectFit = 'cover'
    } else {
      img.style.height = 'auto'
    }
    img.style.maxWidth = '100%'

    wrap.appendChild(img)

    // Jika mode read-only (view mode), jangan tampilkan toolbar resize/edit dan jangan seleksi markdown
    if (!isReadOnly) {
      const updateDoc = (w: number) => {
        view.dispatch({
          changes: { from: this.from, to: this.to, insert: `![[${this.fileName}|${w}]]` },
        })
      }

      // Mini Toolbar Preset di atas gambar (Badge Ukuran + 25%, 50%, 100%, -, +, ✎)
      const toolbar = document.createElement('div')
      toolbar.className =
        'absolute top-2 left-2 flex items-center gap-1 bg-panel-alt/90 backdrop-blur-xs border border-line text-fg text-[11px] px-1.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md pointer-events-auto'

      const sizeBadge = document.createElement('span')
      sizeBadge.className = 'px-1.5 py-0.5 text-fg-muted font-mono text-[10px] border-r border-line mr-0.5 select-none'
      sizeBadge.textContent = this.width || '100%'
      toolbar.appendChild(sizeBadge)

      const makeBtn = (txt: string, title: string, onClick: () => void) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = txt
        b.title = title
        b.className = 'px-1.5 py-0.5 rounded hover:bg-hover active:bg-panel cursor-pointer font-medium text-fg-muted hover:text-fg'
        b.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onClick()
        })
        toolbar.appendChild(b)
      }

      makeBtn('25%', 'Ukuran kecil (200px)', () => updateDoc(200))
      makeBtn('50%', 'Ukuran sedang (420px)', () => updateDoc(420))
      makeBtn('100%', 'Ukuran penuh (800px)', () => updateDoc(800))
      makeBtn('−', 'Perkecil 50px', () => updateDoc(Math.max(100, (img.offsetWidth || 400) - 50)))
      makeBtn('+', 'Perbesar 50px', () => updateDoc(Math.min(1200, (img.offsetWidth || 400) + 50)))
      makeBtn('✎', 'Edit teks markdown', () => {
        view.dispatch({ selection: { anchor: this.from, head: this.to } })
        view.focus()
      })

      // Grip Handle Resize Samping (Desain standar industri dengan grip bar || elegan)
      const resizer = document.createElement('div')
      resizer.className =
        'cm-image-resizer absolute top-1/2 -right-3 -translate-y-1/2 w-4 h-12 bg-panel-alt hover:bg-hover border border-line hover:border-fg-muted rounded-md shadow-md flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all z-20 select-none'
      resizer.title = 'Tarik ke samping untuk mengubah ukuran gambar'
      resizer.innerHTML =
        '<div class="flex gap-0.5 pointer-events-none opacity-60"><div class="w-0.5 h-3.5 bg-fg-muted rounded-full"></div><div class="w-0.5 h-3.5 bg-fg-muted rounded-full"></div></div>'

      resizer.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const startX = e.clientX
        const startWidth = img.offsetWidth

        const onMouseMove = (moveEvent: MouseEvent) => {
          const delta = moveEvent.clientX - startX
          const newWidth = Math.max(80, Math.min(1200, Math.round(startWidth + delta)))
          img.style.width = `${newWidth}px`
          sizeBadge.textContent = `${newWidth}px`
        }

        const onMouseUp = (upEvent: MouseEvent) => {
          window.removeEventListener('mousemove', onMouseMove)
          window.removeEventListener('mouseup', onMouseUp)
          const delta = upEvent.clientX - startX
          const finalWidth = Math.max(80, Math.min(1200, Math.round(startWidth + delta)))
          updateDoc(finalWidth)
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
      })

      wrap.appendChild(toolbar)
      wrap.appendChild(resizer)

      // Klik gambar → pindah selection ke range markdown gambar di mode edit
      wrap.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return
        e.preventDefault()
        view.dispatch({ selection: { anchor: this.from, head: this.to } })
        view.focus()
      })
    }

    return wrap
  }

  ignoreEvent(event: Event): boolean {
    // Teruskan click agar selection bisa dipindah ke range gambar
    if (event.type === 'click') return false
    return true
  }
}

export function imagePreviewExtension(getVaultPath: () => string | undefined) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view)
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const ranges: Range<Decoration>[] = []
        const vaultPath = getVaultPath()
        const { state } = view
        const sel = state.selection.main

        for (const { from, to } of view.visibleRanges) {
          const text = state.sliceDoc(from, to)
          const regex = /!\[\[([^\]]+)\]\]/g
          let match: RegExpExecArray | null

          while ((match = regex.exec(text)) !== null) {
            const matchFrom = from + match.index
            const matchTo = matchFrom + match[0].length

            // Di mode view (readOnly), jangan pernah bongkar widget gambar menjadi teks mentah
            const isEditingExplicitly =
              !state.readOnly && sel.from >= matchFrom && sel.to <= matchTo && !sel.empty
            if (isEditingExplicitly) continue

            const { fileName, alt, width, height } = parseImageAttributes(match[1])
            if (!isImageFile(fileName)) continue

            const url = resolveImageUrl(fileName, vaultPath)
            const deco = Decoration.replace({
              widget: new ImageWidget(matchFrom, matchTo, fileName, url, alt, width, height),
              inclusive: false,
            })
            ranges.push(deco.range(matchFrom, matchTo))
          }
        }

        return Decoration.set(ranges, true)
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  )
}
