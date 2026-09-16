/**
 * Node ESM resolve hook: allow bare `import x from './y.json'`.
 *
 * Vite rewrites JSON imports at build time, so app source uses the bare form.
 * Node requires an explicit `with { type: 'json' }` attribute, which would mean
 * editing app source purely to satisfy the test runner. This hook injects the
 * attribute instead, so tests exercise the real module graph unmodified.
 */
export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context)
  if (result.url.endsWith('.json')) {
    return { ...result, importAttributes: { ...result.importAttributes, type: 'json' } }
  }
  return result
}
