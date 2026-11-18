import type { EditorView } from '@codemirror/view'

export interface ParsedTable {
  headers: string[]
  alignments: string[]
  rows: string[][]
}

function parseRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
}

export function parseMarkdownTable(source: string): ParsedTable | null {
  const lines = source.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const headers = parseRow(lines[0])
  if (headers.length === 0) return null

  const sepParts = parseRow(lines[1])
  const alignments = headers.map((_, i) => {
    const s = sepParts[i] ?? '---'
    if (s.startsWith(':') && s.endsWith(':')) return 'center'
    if (s.endsWith(':')) return 'right'
    return 'left'
  })

  const rows = lines.slice(2).map((l) => {
    const raw = parseRow(l)
    return headers.map((_, col) => raw[col] ?? '')
  })
  return { headers, alignments, rows }
}

export function serializeMarkdownTable(data: ParsedTable): string {
  const { headers, alignments, rows } = data
  const headStr = `| ${headers.map((h) => h || ' ').join(' | ')} |`
  const sepStr = `| ${alignments.map((a) => (a === 'center' ? ':---:' : a === 'right' ? '---:' : '---')).join(' | ')} |`
  const rowStrs = rows.map((r) => `| ${headers.map((_, i) => r[i] || ' ').join(' | ')} |`)
  return [headStr, sepStr, ...rowStrs].join('\n')
}

function makeActionBtn(text: string, title: string, cls: string, onClick: () => void): HTMLElement {
  const btn = document.createElement('button')
  btn.className = cls
  btn.textContent = text
  btn.title = title
  btn.contentEditable = 'false'
  btn.tabIndex = -1
  btn.addEventListener('mousedown', (e) => { e.preventDefault(); onClick() })
  return btn
}

export function attachTableEditor(
  tableEl: HTMLTableElement,
  view: EditorView,
  getRange: () => { from: number; to: number } | null,
  initialData: ParsedTable
) {
  const current: ParsedTable = {
    headers: [...initialData.headers],
    alignments: [...initialData.alignments],
    rows: initialData.rows.map((r) => [...r]),
  }
  let dirty = false

  const sync = () => {
    if (!dirty) return
    const range = getRange()
    if (!range) return
    dirty = false
    view.dispatch({ changes: { from: range.from, to: range.to, insert: serializeMarkdownTable(current) } })
  }

  const allCells: HTMLElement[] = []
  const registerCell = (cell: HTMLElement, onInput: (v: string) => void) => {
    setupCell(cell, onInput, sync)
    allCells.push(cell)
  }

  const addRow = () => { current.rows.push(Array(current.headers.length).fill('')); dirty = true; sync() }
  const addColumn = () => {
    current.headers.push(''); current.alignments.push('left')
    current.rows.forEach((r) => r.push(''))
    dirty = true; sync()
  }
  const removeRow = (idx: number) => {
    if (current.rows.length <= 1) return
    current.rows.splice(idx, 1); dirty = true; sync()
  }
  const removeColumn = (col: number) => {
    if (current.headers.length <= 1) return
    current.headers.splice(col, 1); current.alignments.splice(col, 1)
    current.rows.forEach((r) => r.splice(col, 1))
    dirty = true; sync()
  }

  // Header cells
  tableEl.querySelectorAll('th').forEach((th, colIdx) => {
    registerCell(th, (v) => { if (current.headers[colIdx] !== v) { current.headers[colIdx] = v; dirty = true } })
    if (current.headers.length > 1) {
      th.classList.add('cm-lp-table-header-cell')
      th.appendChild(makeActionBtn('×', 'Hapus kolom', 'cm-lp-table-del-col-btn', () => removeColumn(colIdx)))
    }
  })

  // Body rows
  tableEl.querySelectorAll('tbody tr').forEach((tr, rowIdx) => {
    tr.querySelectorAll('td').forEach((td, colIdx) => {
      registerCell(td, (v) => {
        if (!current.rows[rowIdx]) current.rows[rowIdx] = []
        if (current.rows[rowIdx][colIdx] !== v) { current.rows[rowIdx][colIdx] = v; dirty = true }
      })
    })
    const delTd = document.createElement('td')
    delTd.className = 'cm-lp-table-action-col'
    if (current.rows.length > 1) {
      delTd.appendChild(makeActionBtn('×', 'Hapus baris', 'cm-lp-table-del-btn', () => removeRow(rowIdx)))
    }
    tr.appendChild(delTd)
  })

  // "+ Kolom" button in thead
  const thRow = tableEl.querySelector('thead tr')
  if (thRow) {
    const addColTh = document.createElement('th')
    addColTh.className = 'cm-lp-table-action-col'
    addColTh.appendChild(makeActionBtn('+', 'Tambah kolom', 'cm-lp-table-action-btn', addColumn))
    thRow.appendChild(addColTh)
  }

  // "+ Baris" button row in tfoot
  const tfoot = tableEl.createTFoot()
  const addRowTr = tfoot.insertRow()
  const addRowTd = addRowTr.insertCell()
  addRowTd.colSpan = current.headers.length + 1
  addRowTd.className = 'cm-lp-table-action-row'
  addRowTd.appendChild(makeActionBtn('+ Baris', 'Tambah baris', 'cm-lp-table-action-btn', addRow))

  // Keyboard navigation
  tableEl.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = (e.target as HTMLElement).closest('th, td') as HTMLElement | null
    if (!target) return
    if (e.key === 'Tab') {
      e.preventDefault()
      const idx = allCells.indexOf(target)
      if (idx === -1) return
      const nextIdx = e.shiftKey ? idx - 1 : idx + 1
      if (nextIdx >= 0 && nextIdx < allCells.length) {
        allCells[nextIdx].focus()
      } else if (!e.shiftKey && nextIdx >= allCells.length) {
        addRow()
        target.blur()
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      target.blur()
    }
  })
}

function setupCell(cell: HTMLElement, onInput: (text: string) => void, onBlur: () => void) {
  cell.setAttribute('contenteditable', 'true')
  cell.setAttribute('spellcheck', 'false')
  cell.classList.add('cm-lp-table-cell-editable')
  cell.addEventListener('input', () => {
    // Ambil hanya teks sel tanpa teks tombol aksi
    const clone = cell.cloneNode(true) as HTMLElement
    clone.querySelectorAll('button').forEach((b) => b.remove())
    onInput(clone.textContent?.trim() ?? '')
  })
  cell.addEventListener('blur', () => { onBlur() })
}
