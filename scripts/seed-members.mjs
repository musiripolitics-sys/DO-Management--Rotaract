#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '..', '.env.local')
const envText = readFileSync(envPath, 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const members = JSON.parse(readFileSync(join(__dirname, 'members.json'), 'utf8'))

const PROFILE_FIELDS = [
  'full_name',
  'designation',
  'club_name',
  'date_of_birth',
  'address',
  'phone_number',
  't_shirt_size',
  'blood_group',
  'willing_to_donate_blood',
  'professional_photo_url',
]

let created = 0
let updated = 0
let failed = 0

for (const m of members) {
  try {
    let userId

    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email: m.email,
      email_confirm: true,
      user_metadata: { full_name: m.full_name },
    })

    if (createErr) {
      const isDuplicate =
        createErr.message?.toLowerCase().includes('already') ||
        createErr.code === 'email_exists' ||
        createErr.status === 422

      if (!isDuplicate) {
        console.error(`✗ ${m.email}: ${createErr.message}`)
        failed++
        continue
      }

      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      if (listErr) {
        console.error(`✗ ${m.email}: lookup failed: ${listErr.message}`)
        failed++
        continue
      }
      const existing = list.users.find((u) => u.email?.toLowerCase() === m.email)
      if (!existing) {
        console.error(`✗ ${m.email}: exists but not found in list`)
        failed++
        continue
      }
      userId = existing.id
    } else {
      userId = createData.user.id
      created++
    }

    const update = {}
    for (const f of PROFILE_FIELDS) {
      if (m[f] != null) update[f] = m[f]
    }

    const { error: upErr } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)

    if (upErr) {
      console.error(`✗ ${m.email}: profile update failed: ${upErr.message}`)
      failed++
      continue
    }

    updated++
    process.stdout.write('.')
  } catch (err) {
    console.error(`\n✗ ${m.email}: ${err.message}`)
    failed++
  }
}

console.log(`\n\nDone. Created: ${created}, Profiles updated: ${updated}, Failed: ${failed}`)
