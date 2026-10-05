import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseSelection, searchFor } from './selection.ts'

describe('parseSelection', () => {
  it('reads a positive whole number', () => {
    assert.deepEqual(parseSelection('?business=2'), { kind: 'business', id: 2 })
    assert.deepEqual(parseSelection('?business=99'), { kind: 'business', id: 99 })
  })
  it('treats no parameter, or an empty one, as nothing selected', () => {
    assert.deepEqual(parseSelection(''), { kind: 'none' })
    assert.deepEqual(parseSelection('?business='), { kind: 'none' })
  })
  it('rejects anything else as an invalid link rather than guessing', () => {
    for (const raw of ['abc', '0', '-1', '1e2', '0x10', '01', '2.0', ' 2', '9007199254740993']) {
      assert.deepEqual(parseSelection(`?business=${encodeURIComponent(raw)}`), { kind: 'invalid', raw }, raw)
    }
  })
})

describe('searchFor', () => {
  it('sets or clears the parameter and keeps the others', () => {
    assert.equal(searchFor('', 3), '?business=3')
    assert.equal(searchFor('?business=3&tab=x', 4), '?business=4&tab=x')
    assert.equal(searchFor('?business=3', null), '')
  })
})
