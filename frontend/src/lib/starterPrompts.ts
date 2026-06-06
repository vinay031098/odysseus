/** Starter prompts for `/prompt` — subset of legacy compare EVAL_PROMPTS. */

const CHAT_PROMPTS = [
  'Compute the sum of the decimal digits of 2^100. Do NOT use code execution — work it out by reasoning about the number. Show every step, then end with the final number on its own line.',
  'You have three jugs of capacities 7, 5, and 3 liters. The 7-liter jug starts full; the others empty. Using only pouring (no markings), produce the shortest sequence of pours that leaves exactly 2 liters in the 3-liter jug.',
  'Output a complete self-contained HTML file that centers a single SVG illustration on a simple background. The SVG must use only inline shapes. Make it expressive. The SVG should depict: a friendly robot',
  'Explain the butterfly lifecycle using ASCII art. Produce four separate frames in fenced code blocks: egg, caterpillar, chrysalis, adult butterfly.',
]

const CODE_PROMPTS = [
  'Implement an LRU cache with O(1) get and put operations. Support a configurable max capacity. Write it in any language with full comments.',
  'Review this code for bugs, security issues, and performance problems:\n\napp.get("/user/:id", (req, res) => {\n  const query = `SELECT * FROM users WHERE id = ${req.params.id}`;\n  db.query(query, (err, result) => res.json(result[0]));\n});',
  'Design a URL shortener service. Cover the API, database schema, and how you would handle 1000 requests per second.',
]

const AGENT_PROMPTS = [
  "Search the web for the current population of the 3 largest cities in the world, then calculate what percentage of the world's total population lives in those cities.",
  'Fact-check these claims: 1) The Great Wall of China is visible from space. 2) Humans only use 10% of their brains. 3) Lightning never strikes the same place twice. Cite sources.',
  'Write a Python script that generates a bar chart of the 5 most common programming languages in 2025 and save it as chart.png. Then run it.',
]

const HTML_PROMPTS = [
  'Output a complete HTML file for a Snake game. ONLY use vanilla HTML, CSS, and JavaScript. Canvas-based, neon green snake on dark grid, score counter, game over + restart.',
  'Output a complete HTML file for an animated solar system. Canvas-based, glowing Sun center, 8 planets orbiting at correct relative speeds, starfield background.',
  'Output a complete HTML file for an interactive fractal tree. Canvas-based, sliders for angle/depth/length/wind.',
]

const ALL_STARTER_PROMPTS = [...CHAT_PROMPTS, ...CODE_PROMPTS, ...AGENT_PROMPTS, ...HTML_PROMPTS]

const FIRST_USE_KEY = 'odysseus_prompt_command_used'

export function pickStarterPrompt(): string {
  try {
    const firstUse = localStorage.getItem(FIRST_USE_KEY) !== '1'
    if (firstUse) {
      localStorage.setItem(FIRST_USE_KEY, '1')
      return 'i have no imagination help me'
    }
  } catch {
    /* ignore */
  }
  if (!ALL_STARTER_PROMPTS.length) return 'Tell me something interesting about the world today.'
  return ALL_STARTER_PROMPTS[Math.floor(Math.random() * ALL_STARTER_PROMPTS.length)]
}
