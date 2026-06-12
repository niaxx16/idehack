// Regenerates types/database.ts from the live Supabase schema.
// Usage: node scripts/generate-database-types.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local,
// fetches the PostgREST OpenAPI description, and emits types in the official
// `supabase gen types typescript` output format.

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// PostgREST's OpenAPI output has no return type info for RPC functions,
// so returns are maintained here (verified against supabase/ SQL sources).
const FUNCTION_RETURNS = {
  add_canvas_contribution: 'Json',
  generate_personal_code: 'string',
  get_leaderboard:
    '{\n          team_id: string\n          team_name: string\n          total_investment: number\n          jury_avg_score: number\n          final_score: number\n        }[]',
  get_top_investors:
    '{\n          investor_id: string\n          investor_name: string\n          investor_team_id: string\n          investor_team_name: string\n          total_invested: number\n          roi_score: number\n          winning_investments: Json\n        }[]',
  is_admin: 'boolean',
  join_team_by_code: 'Json',
  join_team_by_token: 'Json',
  rejoin_with_personal_code: 'Json',
  setup_team_name: 'boolean',
  submit_portfolio: 'Json',
  tmp_ping: 'Json',
}

function loadEnv() {
  const lines = readFileSync(resolve(root, '.env.local'), 'utf8').split(/\r?\n/)
  const env = {}
  for (const line of lines) {
    if (line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

function tsType(prop) {
  if (!prop) return 'Json'
  if (prop.format === 'jsonb' || prop.format === 'json' || !prop.type) return 'Json'
  if (prop.enum) return prop.enum.map((v) => `'${v}'`).join(' | ')
  switch (prop.type) {
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'string':
      return 'string'
    case 'array':
      return `${tsType(prop.items)}[]`
    default:
      return 'Json'
  }
}

function parseForeignKey(description) {
  const m = description?.match(/<fk table='([^']+)' column='([^']+)'\/>/)
  return m ? { table: m[1], column: m[2] } : null
}

function emitTable(name, def) {
  const required = new Set(def.required || [])
  const cols = Object.entries(def.properties)
  const lines = []

  const colLine = (col, prop, mode) => {
    const nullable = !required.has(col)
    const optional = mode === 'update' || (mode === 'insert' && (nullable || prop.default !== undefined))
    return `          ${col}${optional ? '?' : ''}: ${tsType(prop)}${nullable ? ' | null' : ''}`
  }

  for (const mode of ['Row', 'Insert', 'Update']) {
    lines.push(`        ${mode}: {`)
    for (const [col, prop] of cols) lines.push(colLine(col, prop, mode.toLowerCase()))
    lines.push('        }')
  }

  const fks = cols
    .map(([col, prop]) => ({ col, fk: parseForeignKey(prop.description) }))
    .filter((x) => x.fk)
  if (fks.length === 0) {
    lines.push('        Relationships: []')
  } else {
    lines.push('        Relationships: [')
    lines.push(
      fks
        .map(
          ({ col, fk }) =>
            `          {\n            foreignKeyName: "${name}_${col}_fkey"\n            columns: ["${col}"]\n            isOneToOne: false\n            referencedRelation: "${fk.table}"\n            referencedColumns: ["${fk.column}"]\n          }`
        )
        .join(',\n')
    )
    lines.push('        ]')
  }

  return `      ${name}: {\n${lines.join('\n')}\n      }`
}

function emitFunction(name, bodySchema) {
  const props = bodySchema?.properties || {}
  const requiredArgs = new Set(bodySchema?.required || [])
  const args = Object.entries(props)
    .map(([arg, prop]) => `          ${arg}${requiredArgs.has(arg) ? '' : '?'}: ${tsType(prop)}`)
    .join('\n')
  const argsBlock = args ? `{\n${args}\n        }` : 'Record<PropertyKey, never>'
  const returns = FUNCTION_RETURNS[name] || 'Json'
  return `      ${name}: {\n        Args: ${argsBlock}\n        Returns: ${returns}\n      }`
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local')
  process.exit(1)
}

const res = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
if (!res.ok) {
  console.error(`Failed to fetch schema: HTTP ${res.status}`)
  process.exit(1)
}
const api = await res.json()

const tables = Object.entries(api.definitions).sort(([a], [b]) => a.localeCompare(b))

// Collect named enums: enum-typed columns carry the pg type name in `format`
const enums = new Map()
for (const [, def] of tables) {
  for (const prop of Object.values(def.properties)) {
    if (prop.enum && prop.format && !prop.format.includes(' ')) {
      enums.set(prop.format.replace(/^public\./, ''), prop.enum)
    }
  }
}

const functions = Object.keys(api.paths)
  .filter((p) => p.startsWith('/rpc/'))
  .map((p) => p.slice('/rpc/'.length))
  .sort()

const unknownFns = functions.filter((f) => !(f in FUNCTION_RETURNS))
if (unknownFns.length > 0) {
  console.warn(`Warning: no return type mapping for: ${unknownFns.join(', ')} (defaulting to Json)`)
}

const tablesBlock = tables.map(([name, def]) => emitTable(name, def)).join('\n')
const functionsBlock = functions
  .map((name) => {
    const body = api.paths[`/rpc/${name}`]?.post?.parameters?.find((p) => p.in === 'body')
    return emitFunction(name, body?.schema)
  })
  .join('\n')
const enumsBlock =
  enums.size === 0
    ? '      [_ in never]: never'
    : [...enums.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, values]) => `      ${name}: ${values.map((v) => `'${v}'`).join(' | ')}`)
        .join('\n')

const output = `// Auto-generated from the live Supabase schema. Do not edit by hand.
// Regenerate with: node scripts/generate-database-types.mjs

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
${tablesBlock}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
${functionsBlock}
    }
    Enums: {
${enumsBlock}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`

writeFileSync(resolve(root, 'types/database.ts'), output)
console.log(`types/database.ts written (${tables.length} tables, ${functions.length} functions, ${enums.size} enums)`)
