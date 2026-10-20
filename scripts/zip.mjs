/**
 * نویسنده زیپ کوچک و بدون وابستگی.
 *
 * چرا خودمان می‌سازیم: `Compress-Archive` ویندوز مسیرها را با بک‌اسلش داخل زیپ
 * می‌نویسد و بعضی ابزارهای بازکردن روی لینوکس (پنل هاست، python zipfile) آن را
 * به‌صورت فایل‌های تخت با نام عجیب باز می‌کنند. اینجا مسیرها همیشه با «/» و
 * UTF-8 (فلگ 0x0800) نوشته می‌شوند.
 *
 * فقط فایل‌ها ذخیره می‌شوند؛ پوشه خالی در بسته لازم نیست.
 */

import { deflateRawSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let value = i
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[i] = value >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** تاریخ/ساعت با قالب ZIP (مبنا ۱۹۸۰) */
function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

/** همه فایل‌های یک پوشه به‌صورت مسیر نسبی با «/» */
function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, base, out)
    else if (entry.isFile()) out.push(relative(base, full).split(sep).join('/'))
    else if (entry.isSymbolicLink()) out.push(relative(base, full).split(sep).join('/'))
  }
  return out
}

/**
 * ساخت فایل زیپ از یک پوشه.
 * @param {string} sourceDir پوشه‌ای که محتوایش در ریشه زیپ می‌نشیند
 * @param {string} outFile مسیر فایل خروجی
 * @returns {{ files: number, bytes: number }}
 */
export function createZip(sourceDir, outFile) {
  const names = walk(sourceDir).sort()
  const chunks = []
  const central = []
  let offset = 0

  for (const name of names) {
    const full = join(sourceDir, name)
    const data = readFileSync(full)
    const nameBytes = Buffer.from(name, 'utf8')
    const stat = statSync(full)
    const { time, day } = dosDateTime(stat.mtime)
    const crc = crc32(data)

    const deflated = deflateRawSync(data, { level: 9 })
    const useDeflate = deflated.length < data.length
    const payload = useDeflate ? deflated : data
    const method = useDeflate ? 8 : 0

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(day, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(payload.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)

    chunks.push(local, nameBytes, payload)

    const header = Buffer.alloc(46)
    header.writeUInt32LE(0x02014b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(20, 6)
    header.writeUInt16LE(0x0800, 8)
    header.writeUInt16LE(method, 10)
    header.writeUInt16LE(time, 12)
    header.writeUInt16LE(day, 14)
    header.writeUInt32LE(crc, 16)
    header.writeUInt32LE(payload.length, 20)
    header.writeUInt32LE(data.length, 24)
    header.writeUInt16LE(nameBytes.length, 28)
    header.writeUInt16LE(0, 30)
    header.writeUInt16LE(0, 32)
    header.writeUInt16LE(0, 34)
    header.writeUInt16LE(0, 36)
    header.writeUInt32LE(0, 38)
    header.writeUInt32LE(offset, 42)

    central.push(header, nameBytes)
    offset += local.length + nameBytes.length + payload.length
  }

  const centralBuffer = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(names.length, 8)
  end.writeUInt16LE(names.length, 10)
  end.writeUInt32LE(centralBuffer.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  writeFileSync(outFile, Buffer.concat([...chunks, centralBuffer, end]))
  return { files: names.length, bytes: offset + centralBuffer.length + end.length }
}
