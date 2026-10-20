#!/usr/bin/env node
/**
 * اجرای هم‌زمان بک‌اند لاراول و فرانت‌اند React.
 *
 *   npm run dev:full
 *
 * PHP از PATH خوانده می‌شود و اگر پیدا نشد، مسیر پیش‌فرض XAMPP روی ویندوز
 * امتحان می‌شود. هر دو پروسه با Ctrl+C یک‌جا بسته می‌شوند.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const isWindows = process.platform === 'win32'
const xamppPhp = 'C:\\xampp\\php\\php.exe'
const php = isWindows && existsSync(xamppPhp) ? xamppPhp : 'php'

const children = []

function run(label, command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', shell: isWindows })
  child.on('exit', (code) => {
    console.log(`\n▸ ${label} با کد ${code} بسته شد.`)
    shutdown()
  })
  children.push(child)
}

let closing = false

function shutdown() {
  if (closing) return
  closing = true
  for (const child of children) {
    try {
      child.kill()
    } catch {
      /* پروسه از قبل بسته شده */
    }
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log('\n▸ بک‌اند لاراول: http://127.0.0.1:8000')
console.log('▸ فرانت‌اند React: http://127.0.0.1:5173\n')

run('Laravel', php, ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'], join(root, 'backend'))
run('Vite', isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], join(root, 'frontend'))
