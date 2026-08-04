import { describe, it, expect } from 'vitest'
import en from '../../../messages/en.json'
import ar from '../../../messages/ar.json'

function getKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null) {
      keys = keys.concat(getKeys(v, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

describe('i18n parity', () => {
  it('en.json and ar.json have the same keys', () => {
    const enKeys = getKeys(en).sort()
    const arKeys = getKeys(ar).sort()
    expect(arKeys).toEqual(enKeys)
  })

  it('both files have at least 80 translation keys', () => {
    expect(getKeys(en).length).toBeGreaterThanOrEqual(80)
    expect(getKeys(ar).length).toBeGreaterThanOrEqual(80)
  })
})
