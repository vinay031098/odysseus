import { execShell } from '@/api/cookbookServe'

const PYODIDE_VERSION = '0.27.5'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

type PyodideInstance = {
  runPythonAsync: (code: string) => Promise<unknown>
}

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>
  }
}

let pyodideInstance: PyodideInstance | null = null
let pyodideLoading = false
const pyodideQueue: Array<{ resolve: (py: PyodideInstance) => void; reject: (err: Error) => void }> =
  []

function loadPyodideScript(): Promise<void> {
  if (window.loadPyodide) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-pyodide-loader="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Pyodide')), {
        once: true,
      })
      return
    }
    const script = document.createElement('script')
    script.src = `${PYODIDE_CDN}pyodide.js`
    script.dataset.pyodideLoader = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Pyodide'))
    document.head.appendChild(script)
  })
}

async function loadPyodideInstance(): Promise<PyodideInstance> {
  if (pyodideInstance) return pyodideInstance
  if (pyodideLoading) {
    return new Promise((resolve, reject) => {
      pyodideQueue.push({ resolve, reject })
    })
  }

  pyodideLoading = true
  try {
    await loadPyodideScript()
    if (!window.loadPyodide) {
      throw new Error('Pyodide loader unavailable')
    }
    const py = await window.loadPyodide({ indexURL: PYODIDE_CDN })
    pyodideInstance = py
    pyodideQueue.forEach((entry) => entry.resolve(py))
    pyodideQueue.length = 0
    return py
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to load Pyodide')
    pyodideQueue.forEach((entry) => entry.reject(error))
    pyodideQueue.length = 0
    throw error
  } finally {
    pyodideLoading = false
  }
}

function pyodideResultPair(result: unknown): [string, string] {
  if (result && typeof result === 'object' && 'toJs' in result) {
    const boxed = result as { toJs: () => [string, string]; destroy?: () => void }
    const pair = boxed.toJs()
    boxed.destroy?.()
    return [pair[0] || '', pair[1] || '']
  }
  if (Array.isArray(result)) {
    return [String(result[0] ?? ''), String(result[1] ?? '')]
  }
  return ['', '']
}

export async function runPythonCode(code: string): Promise<string> {
  const py = await loadPyodideInstance()
  const wrapper = `
import sys, io
_stdout = io.StringIO()
_stderr = io.StringIO()
sys.stdout = _stdout
sys.stderr = _stderr
try:
    exec(${JSON.stringify(code)})
except Exception as _e:
    _stderr.write(str(_e))
finally:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
(_stdout.getvalue(), _stderr.getvalue())
`

  const result = await Promise.race([
    py.runPythonAsync(wrapper),
    new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error('Execution timed out (10 s)')), 10000),
    ),
  ])

  const [stdout, stderr] = pyodideResultPair(result)
  if (stderr) return stderr
  if (stdout) return stdout
  return '(no output)'
}

export function runJavaScriptCode(code: string): Promise<string> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.sandbox = 'allow-scripts'
    document.body.appendChild(iframe)

    let settled = false
    const cleanup = () => {
      if (iframe.parentNode) iframe.remove()
    }

    const failsafe = window.setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        resolve('Execution timed out (10 s)')
      }
    }, 15000)

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow || settled) return
      settled = true
      window.clearTimeout(failsafe)
      window.removeEventListener('message', onMessage)
      const data = e.data as { error?: string; logs?: string[] }
      if (data.error) resolve(data.error)
      else if (data.logs?.length) resolve(data.logs.join('\n'))
      else resolve('(no output)')
      cleanup()
    }

    window.addEventListener('message', onMessage)

    const wrappedCode = `
<!DOCTYPE html><html><body><script>
var _logs = [];
console.log = function() { _logs.push([].map.call(arguments, function(a) { try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch(e) { return String(a); } }).join(' ')); };
console.warn = function() { _logs.push('[warn] ' + [].map.call(arguments, String).join(' ')); };
console.error = function() { _logs.push('[error] ' + [].map.call(arguments, String).join(' ')); };
try {
  var _timer = setTimeout(function() { parent.postMessage({error:'Execution timed out (10 s)'},'*'); }, 10000);
  ${code.replace(/<\/script>/gi, '<\\/script>')}
  clearTimeout(_timer);
  parent.postMessage({logs: _logs}, '*');
} catch(e) {
  parent.postMessage({error: e.toString()}, '*');
}
<\\/script></body></html>`

    iframe.srcdoc = wrappedCode
  })
}

export async function runServerCode(code: string, lang: string): Promise<string> {
  const b64 = btoa(unescape(encodeURIComponent(code)))
  const command =
    lang === 'python' || lang === 'py'
      ? `python3 -c "import base64; exec(base64.b64decode('${b64}').decode('utf-8'))"`
      : `python3 -c "import base64, subprocess, sys; sys.exit(subprocess.run(['bash','-c',base64.b64decode('${b64}').decode('utf-8')]).returncode)"`

  const data = await execShell(command)
  if (data.stderr?.trim()) {
    const parts = [data.stderr.trim()]
    if (data.stdout?.trim()) parts.push(data.stdout.trim())
    return parts.join('\n\n')
  }
  if (data.stdout?.trim()) return data.stdout.trim()
  const suffix = data.exit_code ? ` — exit code ${data.exit_code}` : ''
  return `(no output)${suffix}`
}

export function runHtmlCode(code: string): string {
  const win = window.open('', '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no')
  if (!win) return 'Popup blocked — please allow popups for this site.'
  try {
    win.opener = null
  } catch {
    /* ignore */
  }
  win.document.open()
  win.document.write(code)
  win.document.close()
  return 'Opened in new window'
}

export type RunCodeResult = {
  output: string
  viaServer?: boolean
}

export async function runCodeBlock(code: string, lang: string): Promise<RunCodeResult> {
  const normalized = lang.toLowerCase()
  if (normalized === 'bash' || normalized === 'sh' || normalized === 'shell' || normalized === 'zsh') {
    return { output: await runServerCode(code, 'bash'), viaServer: true }
  }
  if (normalized === 'python' || normalized === 'py') {
    try {
      return { output: await runPythonCode(code) }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Pyodide unavailable'
      const serverOutput = await runServerCode(code, 'python')
      return {
        output: `Pyodide unavailable (${reason}). Ran on server instead.\n\n${serverOutput}`,
        viaServer: true,
      }
    }
  }
  if (normalized === 'javascript' || normalized === 'js') {
    return { output: await runJavaScriptCode(code) }
  }
  if (normalized === 'html') {
    return { output: runHtmlCode(code) }
  }
  return { output: `Unsupported language: ${lang}` }
}

export function isRunnableLanguage(lang: string): boolean {
  const normalized = lang.toLowerCase()
  return ['bash', 'sh', 'shell', 'zsh', 'python', 'py', 'javascript', 'js', 'html'].includes(
    normalized,
  )
}

export function isServerShellLanguage(lang: string): boolean {
  const normalized = lang.toLowerCase()
  return ['bash', 'sh', 'shell', 'zsh', 'python', 'py'].includes(normalized)
}
