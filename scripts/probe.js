#!/usr/bin/env node
/**
 * آزمایش «آیا Node روی این هاست اجرا می‌شود؟» — بدون Next و بدون وابستگی.
 *
 *   npm run probe
 *
 * روی هاست، در پنل، Startup file را موقتاً به این فایل بگذارید (یا Application
 * startup command = `node scripts/probe.js`) و دامنه را باز کنید:
 *
 *   • اگر صفحهٔ «NODE IS RUNNING» آمد → Node و مسیر دامنه درست است؛ پس ۴۰۴
 *     قبلی از سمت Next/بیلد بوده و سراغ `npm run doctor` بروید.
 *   • اگر باز هم ۴۰۴ ساده آمد → درخواست‌ها اصلاً به Node نمی‌رسند؛ ایراد در
 *     Application root / Application URL پنل یا نداشتن Node در این هاست است.
 */

'use strict'

const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const root = path.join(__dirname, '..')
const port = Number(process.env.PORT) || 3000

const lines = [
  'NODE IS RUNNING',
  '',
  `node        : ${process.version}`,
  `port        : ${port}`,
  `cwd         : ${process.cwd()}`,
  `project root: ${root}`,
  `NODE_ENV    : ${process.env.NODE_ENV || '(unset)'}`,
  `build       : ${fs.existsSync(path.join(root, '.next', 'BUILD_ID')) ? 'yes (.next/BUILD_ID)' : 'NO — run: npm run build'}`,
  `env file    : ${fs.existsSync(path.join(root, '.env')) ? 'yes' : 'NO — create .env'}`,
  `DATABASE_URL: ${process.env.DATABASE_URL ? 'set (via host env)' : fs.existsSync(path.join(root, '.env')) ? 'set by .env (loaded later by server.js)' : 'MISSING'}`,
  `next pkg    : ${fs.existsSync(path.join(root, 'node_modules', 'next', 'package.json')) ? 'installed' : 'NOT INSTALLED — run: npm install'}`,
  `prisma      : ${fs.existsSync(path.join(root, 'node_modules', '.prisma', 'client', 'index.js')) ? 'client generated' : 'client NOT generated'}`,
  '',
  'اگر این صفحه را می‌بینید، Node سالم است؛ در پنل Startup file را به server.js برگردانید.',
  '',
].join('\n')

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
  response.end(`${lines}\n${request.method} ${request.url}\n`)
})

server.on('error', (error) => {
  console.error(`probe failed: ${error.code || ''} ${error.message}`)
  process.exit(1)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`probe listening on 0.0.0.0:${port}`)
})
