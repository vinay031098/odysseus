/** Text-based easter egg replies for slash commands (v2 parity with legacy). */

const ODYSSEY_QUOTES = [
  'Tell me, O Muse, of that ingenious hero who travelled far and wide...',
  'Of all creatures that breathe and move upon the earth, nothing is bred that is weaker than man.',
  'There is a time for many words, and there is also a time for sleep.',
  'I am Odysseus, son of Laertes, known to all for my cunning. My fame reaches even unto heaven.',
]

const EIGHT_BALL = [
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes, definitely.',
  'Reply hazy, try again.',
  'Ask again later.',
  "Don't count on it.",
  'My reply is no.',
  'Very doubtful.',
]

const FORTUNES = [
  'A fresh start will put you on your way.',
  'In the middle of difficulty lies opportunity.',
  'The best way to predict the future is to create it.',
  'Curiosity kills boredom. Nothing can kill curiosity.',
  'Good news will come to you by mail.',
]

const WISDOM = [
  ['The only way to do great work is to love what you do.', 'Steve Jobs'],
  ['Simplicity is the ultimate sophistication.', 'Leonardo da Vinci'],
  ['Talk is cheap. Show me the code.', 'Linus Torvalds'],
  ['Make it work, make it right, make it fast.', 'Kent Beck'],
  ['It works on my machine.', 'Every developer ever'],
] as const

const ASCII_FONT: Record<string, string> = {
  A: '  #  \n # # \n#####\n#   #\n#   #',
  B: '#### \n#   #\n#### \n#   #\n#### ',
  C: ' ####\n#    \n#    \n#    \n ####',
  D: '#### \n#   #\n#   #\n#   #\n#### ',
  E: '#####\n#    \n###  \n#    \n#####',
  O: ' ### \n#   #\n#   #\n#   #\n ### ',
  S: ' ####\n#    \n ### \n    #\n#### ',
  Y: '#   #\n # # \n  #  \n  #  \n  #  ',
  ' ': '     \n     \n     \n     \n     ',
  '?': ' ### \n#   #\n  ## \n     \n  #  ',
}

function renderAscii(text: string): string {
  const chars = text
    .toUpperCase()
    .split('')
    .map((c) => (ASCII_FONT[c] || ASCII_FONT['?']).split('\n'))
  const rows = [0, 1, 2, 3, 4].map((r) => chars.map((c) => c[r] || '     ').join(' '))
  return '```\n' + rows.join('\n') + '\n```'
}

let appLoadTime = Date.now()
if (typeof window !== 'undefined') {
  const w = window as Window & { _odysseusLoadTime?: number }
  if (!w._odysseusLoadTime) w._odysseusLoadTime = appLoadTime
  else appLoadTime = w._odysseusLoadTime
}

export function handleFlip(): string {
  const edge = Math.random() < 0.001
  if (edge) return 'The coin landed on its **edge**. (Click again? Try `/flip` once more.)'
  return Math.random() < 0.5 ? '**Heads**' : '**Tails**'
}

export function handleRoll(args: string[]): string {
  const spec = (args[0] || '6').toLowerCase()
  const m = spec.match(/^(\d+)?d(\d+)$/)
  const count = m ? Math.min(parseInt(m[1] || '1', 10), 20) : 1
  const sides = m ? Math.min(parseInt(m[2], 10), 1000) : Math.min(parseInt(spec, 10) || 6, 1000)
  const results = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
  const total = results.reduce((a, b) => a + b, 0)
  const dice = results.map((v) => `\`${v}\``).join(' ')
  return count > 1 ? `${dice}\n\n${count}d${sides} = **${total}**` : `Rolled **${results[0]}** (d${sides})`
}

export function handle8Ball(args: string[]): string {
  const q = args.join(' ').trim()
  if (!q) return 'Ask a yes/no question.'
  const answer = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)]
  return `*${q}*\n\n🎱 ${answer}`
}

export function handleFortune(): string {
  const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
  const nums = Array.from({ length: 6 }, () => String(Math.floor(Math.random() * 90) + 10)).join(' ')
  return `🥠 *Fortune Cookie*\n\n${f}\n\n_${nums}_`
}

export function handleOdyssey(): string {
  const q = ODYSSEY_QUOTES[Math.floor(Math.random() * ODYSSEY_QUOTES.length)]
  return `> ${q}\n>\n> — Homer, *The Odyssey*`
}

export function handleAscii(args: string[]): string {
  return renderAscii(args.join(' ') || 'Odysseus')
}

export function handleMatrix(): string {
  const cols = 28
  const rows = 8
  const chars = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ0123456789ABCDEF'
  const lines: string[] = []
  for (let r = 0; r < rows; r++) {
    let line = ''
    for (let c = 0; c < cols; c++) {
      line += chars[Math.floor(Math.random() * chars.length)]
    }
    lines.push(line)
  }
  const rain = lines.join('\n')
  return (
    '```\n' +
    rain +
    '\n```\n\n' +
    '*The Matrix*\n\n' +
    'Wake up, Neo...\n\n' +
    'The Matrix has you...'
  )
}

export function handleCowsay(args: string[]): string {
  const text = args.join(' ') || 'moo'
  const pad = Math.max(text.length + 2, 4)
  const top = ' ' + '_'.repeat(pad)
  const mid = '< ' + text + ' '.repeat(pad - text.length - 2) + ' >'
  const bot = ' ' + '-'.repeat(pad)
  const cow = `${top}\n${mid}\n${bot}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`
  return '```\n' + cow + '\n```'
}

export function handleWisdom(): string {
  const [quote, author] = WISDOM[Math.floor(Math.random() * WISDOM.length)]
  return `> ${quote}\n>\n> — ${author}`
}

export function handleUptime(): string {
  const diff = Date.now() - appLoadTime
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  parts.push(`${m}m`, `${s}s`)
  return `**${parts.join(' ')}**\n\n_session uptime_`
}

export function handleColor(args: string[]): string {
  const hex =
    args[0] ||
    '#' +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0')
  const c = hex.startsWith('#') ? hex : `#${hex}`
  return `🎨 \`${c}\``
}
