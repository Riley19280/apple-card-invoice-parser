import { findSequence } from '@/util.js'

test('findSequence returns the index of the first occurrence of sequence in the array', () => {
  const sequence = ['cat', 'dog']
  const array = ['apple', 'cat', 'dog', 'banana']
  expect(findSequence(sequence, array)).toBe(1)
})

test('findSequence returns -1 if sequence is not found in the array', () => {
  const sequence2 = ['dog', 'fish']
  const array = ['apple', 'cat', 'dog', 'banana']
  expect(findSequence(sequence2, array)).toBe(false)
})

test('findSequence returns false if sequence is longer than the array', () => {
  const sequence3 = ['cat', 'dog', 'mouse', 'elephant']
  const array = ['cat', 'dog']
  expect(findSequence(sequence3, array)).toBe(false)
})

test('findSequence returns 0 if array is empty and sequence is also empty', () => {
  const sequence4: any[] = []
  const array: any[] = []
  expect(findSequence(sequence4, array)).toBe(0)
})


test('findSequence can use wildcards', () => {
  const sequence2 = ['cat', '*', 'banana']
  const array = ['apple', 'cat', 'dog', 'banana']
  expect(findSequence(sequence2, array)).toBe(1)
})

test('findSequence can use regex', () => {
  const sequence2 = [/apple\d+/]
  const array = ['apple', 'apple1234']
  expect(findSequence(sequence2, array)).toBe(1)
})
