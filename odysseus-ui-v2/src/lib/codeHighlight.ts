import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const LANGUAGES = {
  javascript,
  typescript,
  python,
  rust,
  go,
  java,
  bash,
  sql,
  json,
  yaml,
  css,
  xml,
} as const

for (const [name, mod] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, mod)
}

const ALIASES: Record<string, keyof typeof LANGUAGES> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  html: 'xml',
  svg: 'xml',
}

function resolveLanguage(language: string): keyof typeof LANGUAGES | null {
  const lang = (language || 'text').toLowerCase()
  if (lang in LANGUAGES) return lang as keyof typeof LANGUAGES
  if (lang in ALIASES) return ALIASES[lang]
  return null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** highlight.js-backed syntax highlighting for code documents. */
export function highlightCode(source: string, language: string): string {
  const resolved = resolveLanguage(language)
  if (!resolved) return escapeHtml(source)
  try {
    return hljs.highlight(source, { language: resolved }).value
  } catch {
    return escapeHtml(source)
  }
}

export function isCodeLanguage(language: string | null | undefined): boolean {
  const lang = (language || 'text').toLowerCase()
  if (lang === 'markdown' || lang === 'text' || lang === 'email' || lang === 'canvas') return false
  return true
}

export function highlightLanguageClass(language: string | null | undefined): string {
  const resolved = resolveLanguage(language || 'text')
  return resolved ? `language-${resolved}` : 'language-text'
}
