import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--fg)',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-text)',
    fontSize: 'var(--font-size-text, 16px)',
    letterSpacing: '0.005em',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
    lineHeight: '1.65',
    WebkitFontSmoothing: 'antialiased',
  },
  '.cm-content': {
    maxWidth: 'var(--file-line-width, 900px)',
    margin: '0 auto',
    padding: '24px 32px 48px',
    caretColor: 'var(--accent)',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#d8dee9',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(136, 192, 208, 0.28) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  /* Panel Container default CodeMirror reset */
  '.cm-panels': {
    backgroundColor: 'transparent !important',
    border: 'none !important',
  },
  '.cm-panels-top': {
    borderBottom: 'none !important',
  },
  /* Panel Pencarian (Find & Replace) Modern & Minimalis (Obsidian-style) */
  '.cm-panel.cm-search': {
    position: 'absolute',
    top: '12px',
    right: '24px',
    padding: '4px 8px',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-md, 8px)',
    boxShadow: 'var(--shadow-modal)',
    color: 'var(--fg)',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    zIndex: '100',
    whiteSpace: 'nowrap',
  },
  '.cm-panel.cm-search input.cm-textfield': {
    backgroundColor: 'var(--bg-app)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-sm, 4px)',
    color: 'var(--fg)',
    padding: '3px 8px',
    fontSize: '12px',
    outline: 'none',
    width: '130px',
  },
  '.cm-panel.cm-search input.cm-textfield:focus': {
    borderColor: 'var(--accent)',
  },
  '.cm-panel.cm-search .cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm, 4px)',
    color: 'var(--fg-muted)',
    padding: '3px 6px',
    fontSize: '11px',
    cursor: 'pointer',
    textTransform: 'capitalize',
    transition: 'all 0.1s ease',
  },
  '.cm-panel.cm-search .cm-button:hover': {
    backgroundColor: 'var(--bg-hover)',
    color: 'var(--fg)',
  },
  /* Sembunyikan opsi lanjutan yang mengotori tampilan (regex, by word, replace all) */
  '.cm-panel.cm-search label:has(input[name="regexp"]), .cm-panel.cm-search label:has(input[name="byWord"]), .cm-panel.cm-search label:has(input[name="replace"]), .cm-panel.cm-search button[name="select"]': {
    display: 'none !important',
  },
  '.cm-panel.cm-search label': {
    color: 'var(--fg-faint)',
    fontSize: '11px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    cursor: 'pointer',
    margin: '0 4px',
    userSelect: 'none',
  },
  '.cm-panel.cm-search label:hover': {
    color: 'var(--fg-muted)',
  },
  '.cm-panel.cm-search input[type="checkbox"]': {
    accentColor: 'var(--accent)',
    width: '12px',
    height: '12px',
    cursor: 'pointer',
  },
  '.cm-panel.cm-search button[name="close"]': {
    backgroundImage: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '12px',
    lineHeight: '1',
    width: '20px',
    height: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--fg-faint)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm, 4px)',
    marginLeft: '6px',
    padding: '0',
    flexShrink: '0',
  },
  '.cm-panel.cm-search button[name="close"]:hover': {
    color: 'var(--fg)',
    backgroundColor: 'var(--bg-hover)',
  },
})

export const markdownHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading, color: 'var(--h1)', fontWeight: '600' },
    { tag: tags.heading1, color: 'var(--h1)', fontWeight: '700', fontSize: '1.45em' },
    { tag: tags.heading2, color: 'var(--h2)', fontWeight: '600', fontSize: '1.25em' },
    { tag: tags.heading3, color: 'var(--h3)', fontWeight: '600', fontSize: '1.12em' },
    { tag: tags.heading4, color: 'var(--h4)', fontWeight: '600', fontSize: '1.04em' },
    { tag: tags.heading5, color: 'var(--h5)', fontWeight: '600' },
    { tag: tags.heading6, color: 'var(--h6)', fontWeight: '600' },
    { tag: tags.tagName, color: '#e06c75' },
    { tag: tags.attributeName, color: '#d19a66' },
    { tag: tags.attributeValue, color: '#98c379' },
    { tag: tags.angleBracket, color: '#abb2bf' },
    { tag: tags.bracket, color: '#abb2bf' },
    { tag: tags.keyword, color: '#c678dd' },
    { tag: tags.comment, color: '#5c6370', fontStyle: 'italic' },
    { tag: tags.string, color: '#98c379' },
    { tag: tags.number, color: '#e5c07b' },
    { tag: tags.literal, color: '#e5c07b' },
    { tag: tags.propertyName, color: '#d19a66' },
    { tag: tags.link, color: '#61afef', textDecoration: 'underline' },
    { tag: tags.url, color: '#61afef' },
    { tag: tags.function(tags.variableName), color: '#61afef' },
    { tag: tags.typeName, color: '#56b6c2' },
    { tag: tags.operator, color: '#abb2bf' },
    { tag: tags.emphasis, fontStyle: 'italic', color: 'inherit' },
    { tag: tags.strong, fontWeight: '600', color: 'rgba(224, 108, 117, 0.9)' },
    { tag: tags.processingInstruction, color: '#c678dd' },
    { tag: tags.punctuation, color: '#abb2bf' },
    { tag: tags.monospace, fontFamily: 'var(--font-mono)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#98c379', borderRadius: '3px', padding: '1px 3px' },
  ])
)
