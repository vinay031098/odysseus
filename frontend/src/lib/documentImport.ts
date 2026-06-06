import * as documentsApi from '@/api/documents'
import type { Document } from '@/api/documents'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

/** Extension → language tag (mirrors static/js/documentLibrary.js). */
export const EXT_TO_LANG: Record<string, string> = {
  '.py': 'python',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.md': 'markdown',
  '.json': 'json',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.sh': 'bash',
  '.bash': 'bash',
  '.sql': 'sql',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.rb': 'ruby',
  '.php': 'php',
  '.xml': 'xml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.txt': '',
  '.log': '',
  '.cfg': 'ini',
  '.conf': 'ini',
  '.env': '',
  '.jsx': 'javascript',
  '.tsx': 'typescript',
  '.vue': 'html',
  '.svelte': 'html',
  '.scss': 'css',
  '.sass': 'css',
  '.less': 'css',
  '.csv': 'csv',
  '.tsv': 'csv',
  '.xlsx': 'csv',
  '.xls': 'csv',
  '.ods': 'csv',
  '.docx': 'markdown',
  '.doc': 'markdown',
  '.pdf': 'pdf',
}

export const IMPORT_ACCEPT = Object.keys(EXT_TO_LANG).join(',')

export type ImportFileStatus = 'pending' | 'importing' | 'done' | 'failed'

export type ImportProgressItem = {
  name: string
  status: ImportFileStatus
  error?: string
}

export type ImportProgress = {
  items: ImportProgressItem[]
  current: number
  total: number
  imported: number
  failed: number
  running: boolean
}

export function parseFileImportMeta(file: File): {
  ext: string
  baseTitle: string
  language: string | null
  isSpreadsheet: boolean
  isPdf: boolean
} {
  const name = file.name
  const dotIdx = name.lastIndexOf('.')
  const ext = dotIdx >= 0 ? name.slice(dotIdx).toLowerCase() : ''
  const baseTitle = dotIdx > 0 ? name.slice(0, dotIdx) : name
  const language = EXT_TO_LANG[ext] !== undefined ? EXT_TO_LANG[ext] : null
  const isSpreadsheet = ['.xlsx', '.xls', '.ods'].includes(ext)
  const isPdf = ext === '.pdf'
  return { ext, baseTitle, language, isSpreadsheet, isPdf }
}

function spreadsheetToCsvParts(buf: ArrayBuffer): string[] {
  const wb = XLSX.read(buf, { type: 'array' })
  const parts: string[] = []
  for (const sheetName of wb.SheetNames) {
    if (wb.SheetNames.length > 1) parts.push(`# Sheet: ${sheetName}`)
    parts.push(XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]!))
  }
  return parts
}

function spreadsheetToSheetCsv(buf: ArrayBuffer): Array<{ sheetName: string; csv: string }> {
  const wb = XLSX.read(buf, { type: 'array' })
  return wb.SheetNames.map((sheetName) => ({
    sheetName,
    csv: XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]!),
  }))
}

/** Convert HTML from mammoth to clean markdown (legacy documentLibrary.js). */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  let md = ''

  function walkChildren(node: Node) {
    for (const child of node.childNodes) walk(child)
  }

  function convertTable(table: Element) {
    const rows = table.querySelectorAll('tr')
    rows.forEach((tr, i) => {
      const cells = tr.querySelectorAll('th, td')
      md += `| ${Array.from(cells)
        .map((c) => c.textContent?.trim() ?? '')
        .join(' | ')} |\n`
      if (i === 0) {
        md += `| ${Array.from(cells)
          .map(() => '---')
          .join(' | ')} |\n`
      }
    })
  }

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      md += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'h1') {
      md += '\n# '
      walkChildren(el)
      md += '\n'
    } else if (tag === 'h2') {
      md += '\n## '
      walkChildren(el)
      md += '\n'
    } else if (tag === 'h3') {
      md += '\n### '
      walkChildren(el)
      md += '\n'
    } else if (tag === 'h4') {
      md += '\n#### '
      walkChildren(el)
      md += '\n'
    } else if (tag === 'strong' || tag === 'b') {
      md += '**'
      walkChildren(el)
      md += '**'
    } else if (tag === 'em' || tag === 'i') {
      md += '*'
      walkChildren(el)
      md += '*'
    } else if (tag === 'a') {
      md += '['
      walkChildren(el)
      md += `](${(el as HTMLAnchorElement).href || ''})`
    } else if (tag === 'br') {
      md += '\n'
    } else if (tag === 'p') {
      md += '\n'
      walkChildren(el)
      md += '\n'
    } else if (tag === 'ul' || tag === 'ol') {
      md += '\n'
      walkChildren(el)
    } else if (tag === 'li') {
      const parent = el.parentElement?.tagName.toLowerCase()
      if (parent === 'ol') {
        const idx = Array.from(el.parentElement!.children).indexOf(el) + 1
        md += `${idx}. `
      } else {
        md += '- '
      }
      walkChildren(el)
      md += '\n'
    } else if (tag === 'table') {
      md += '\n'
      convertTable(el)
      md += '\n'
    } else if (tag === 'img') {
      const img = el as HTMLImageElement
      const src = img.src || ''
      if (!src.startsWith('data:')) {
        md += `![${img.alt || ''}](${src})`
      } else if (img.alt) {
        md += `*[image: ${img.alt}]*`
      }
    } else {
      walkChildren(el)
    }
  }

  walkChildren(doc.body)
  return md.replace(/\n{3,}/g, '\n\n').trim()
}

export async function readFileContent(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const isSpreadsheet = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.ods')
  const isDocx = name.endsWith('.docx')

  if (isSpreadsheet) {
    const buf = await file.arrayBuffer()
    return spreadsheetToCsvParts(buf).join('\n\n')
  }

  if (isDocx) {
    const buf = await file.arrayBuffer()
    const result = await mammoth.convertToHtml({ arrayBuffer: buf })
    return htmlToMarkdown(result.value)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export type ImportBatchResult = {
  imported: number
  failed: number
  firstError: string
  documents: Document[]
}

export type ImportBatchOptions = {
  onProgress?: (progress: ImportProgress) => void
  signal?: AbortSignal
}

/** Import multiple files sequentially (legacy libraryImportFiles). */
export async function importDocumentFiles(
  fileList: File[],
  options: ImportBatchOptions = {},
): Promise<ImportBatchResult> {
  const files = [...fileList]
  const items: ImportProgressItem[] = files.map((f) => ({ name: f.name, status: 'pending' }))
  let imported = 0
  let failed = 0
  let firstError = ''
  const documents: Document[] = []

  const emit = (current: number, running: boolean) => {
    options.onProgress?.({
      items: items.map((item) => ({ ...item })),
      current,
      total: files.length,
      imported,
      failed,
      running,
    })
  }

  emit(0, true)

  for (let i = 0; i < files.length; i++) {
    if (options.signal?.aborted) break

    const file = files[i]!
    items[i]!.status = 'importing'
    emit(i, true)

    try {
      const { baseTitle, language, isSpreadsheet, isPdf } = parseFileImportMeta(file)

      if (isPdf) {
        const doc = await documentsApi.importPdf(file)
        documents.push(doc)
        imported++
        items[i]!.status = 'done'
        emit(i + 1, i < files.length - 1)
        continue
      }

      if (isSpreadsheet) {
        const buf = await file.arrayBuffer()
        const sheets = spreadsheetToSheetCsv(buf)
        for (const { sheetName, csv } of sheets) {
          if (!csv.trim()) continue
          const sheetTitle =
            sheets.length > 1 ? `${baseTitle} - ${sheetName}` : baseTitle
          const doc = await documentsApi.createDocument({
            title: sheetTitle,
            language: 'csv',
            content: csv,
          })
          documents.push(doc)
        }
        imported++
        items[i]!.status = 'done'
        emit(i + 1, i < files.length - 1)
        continue
      }

      const content = await readFileContent(file)
      const doc = await documentsApi.createDocument({
        title: baseTitle,
        language,
        content,
      })
      documents.push(doc)
      imported++
      items[i]!.status = 'done'
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!firstError) firstError = msg
      failed++
      items[i]!.status = 'failed'
      items[i]!.error = msg
    }

    emit(i + 1, i < files.length - 1)
  }

  emit(files.length, false)

  return { imported, failed, firstError, documents }
}
