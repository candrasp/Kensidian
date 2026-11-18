import { LanguageDescription } from '@codemirror/language'
import { languages as langData } from '@codemirror/language-data'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { xml } from '@codemirror/lang-xml'

// Pemuatan instan untuk bahasa-bahasa yang paling sering dipakai
const eagerLanguages: LanguageDescription[] = [
  LanguageDescription.of({ name: 'JavaScript', alias: ['js', 'node', 'javascript'], support: javascript() }),
  LanguageDescription.of({ name: 'TypeScript', alias: ['ts', 'typescript'], support: javascript({ typescript: true }) }),
  LanguageDescription.of({ name: 'JSX', alias: ['jsx'], support: javascript({ jsx: true }) }),
  LanguageDescription.of({ name: 'TSX', alias: ['tsx'], support: javascript({ jsx: true, typescript: true }) }),
  LanguageDescription.of({ name: 'HTML', alias: ['html', 'htm', 'xhtml'], support: html() }),
  LanguageDescription.of({ name: 'XML', alias: ['xml', 'svg', 'rss', 'xsd'], support: xml() }),
  LanguageDescription.of({ name: 'CSS', alias: ['css'], support: css() }),
  LanguageDescription.of({ name: 'JSON', alias: ['json'], support: json() }),
  LanguageDescription.of({ name: 'Python', alias: ['py', 'python'], support: python() }),
  LanguageDescription.of({ name: 'Rust', alias: ['rs', 'rust'], support: rust() }),
]

// Resolver bahasa sinkron/asinkron untuk CodeMirror markdown parser
export function resolveCodeLanguage(info: string) {
  if (!info) return null
  const clean = info.trim().toLowerCase()
  const matched =
    LanguageDescription.matchLanguageName(supportedLanguages, clean, true) ||
    LanguageDescription.matchFilename(supportedLanguages, 'a.' + clean)
  return matched || null
}

// Gabungkan dengan bahasa dinamis lain dari language-data
export const supportedLanguages: LanguageDescription[] = [
  ...eagerLanguages,
  ...langData.filter(
    (l) => !eagerLanguages.some((e) => e.name.toLowerCase() === l.name.toLowerCase())
  ),
]
