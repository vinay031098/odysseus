export type ContactSuggestion = {
  name: string
  email: string
}

export function splitRecipientsAndFragment(rawValue: string): { confirmed: string; fragment: string } {
  const cut = rawValue.lastIndexOf(',')
  if (cut < 0) return { confirmed: '', fragment: rawValue.trimStart() }
  return {
    confirmed: rawValue.slice(0, cut + 1).trimStart(),
    fragment: rawValue.slice(cut + 1).trimStart(),
  }
}

export function commitRecipientValue(rawValue: string, email: string): string {
  const { confirmed } = splitRecipientsAndFragment(rawValue)
  const head = confirmed ? `${confirmed.replace(/\s+$/, '')} ` : ''
  return `${head}${email}, `
}

export function parseExistingEmails(rawValue: string): Set<string> {
  return new Set(
    rawValue
      .split(',')
      .map((segment) => {
        const match = segment.match(/<([^>]+)>/)
        return (match ? match[1] : segment).trim().toLowerCase()
      })
      .filter(Boolean),
  )
}

export function flattenContactSuggestions(
  contacts: { name: string; emails?: string[] }[],
  already: Set<string>,
  limit = 8,
): ContactSuggestion[] {
  const items: ContactSuggestion[] = []
  for (const contact of contacts) {
    for (const email of contact.emails ?? []) {
      if (already.has(email.toLowerCase())) continue
      items.push({ name: contact.name || email, email })
      if (items.length >= limit) return items
    }
  }
  return items
}

export function isCompleteEmailFragment(fragment: string): boolean {
  return /^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/.test(fragment.trim())
}
