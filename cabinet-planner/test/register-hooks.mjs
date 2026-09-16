/** Entry point for `node --import`. Registers the JSON resolve hook. */
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./json-hooks.mjs', pathToFileURL(import.meta.filename))
