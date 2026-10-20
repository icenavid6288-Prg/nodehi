import { beforeEach, describe, expect, it, vi } from 'vitest'

// اجرای واقعی مهاجرت/seed در تست نه لازم است نه بی‌خطر؛ فقط قرار‌دادن
// گزینه‌های درست برای فرزند بررسی می‌شود.
const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
  existsSync: vi.fn(),
}))

vi.mock('node:child_process', () => ({ execFile: mocks.execFile }))
vi.mock('node:fs', () => ({ existsSync: mocks.existsSync }))
vi.mock('@/lib/db', () => ({
  isDbNotReadyError: () => false,
  prisma: {
    setting: { findFirst: vi.fn(async () => ({ key: 'site.name' })) },
    user: { count: vi.fn(async () => 1) },
    product: { count: vi.fn(async () => 23) },
  },
}))

import { InstallError, runInstall } from './install'

type ExecCallback = (error: (Error & { stdout?: string; stderr?: string }) | null, stdout: string, stderr: string) => void

function succeed() {
  mocks.execFile.mockImplementation((_file: string, _args: string[], _options: unknown, callback: ExecCallback) =>
    callback(null, 'ok', ''),
  )
}

function failOn(step: 'migrate' | 'seed') {
  mocks.execFile.mockImplementation((_file: string, args: string[], _options: unknown, callback: ExecCallback) => {
    if (args.join(' ').includes(step === 'seed' ? 'seed.mjs' : 'migrate')) {
      callback(Object.assign(new Error('boom'), { stdout: 'the failure output' }), '', '')
      return
    }
    callback(null, 'ok', '')
  })
}

describe('runInstall', () => {
  beforeEach(() => {
    mocks.execFile.mockReset()
    mocks.existsSync.mockReset()
    // ابزار پریسما روی سرور موجود است
    mocks.existsSync.mockReturnValue(true)
    succeed()
  })

  it('مهاجرت و seed را با env حساب مدیر اجرا می‌کند', async () => {
    const steps = await runInstall({ adminPhone: '09120000000' })

    expect(steps.map((step) => step.name)).toEqual(['migrate', 'seed'])
    expect(steps.every((step) => step.ok)).toBe(true)
    expect(mocks.execFile).toHaveBeenCalledTimes(2)

    const migrateArgs = mocks.execFile.mock.calls[0][1] as string[]
    const seedArgs = mocks.execFile.mock.calls[1][1] as string[]
    expect(migrateArgs.join(' ')).toContain('migrate deploy')
    expect(seedArgs.join(' ')).toContain('seed.mjs')

    for (const call of mocks.execFile.mock.calls) {
      const options = call[2] as { env?: Record<string, string>; windowsHide?: boolean }
      expect(options.env?.SEED_ADMIN_PHONE).toBe('09120000000')
    }
  })

  it('پنجره فرزند را پنهان می‌کند (وگرنه ویندوز با 0xC0000142 شکست می‌خورد)', async () => {
    await runInstall({ adminPhone: '09120000000' })

    for (const call of mocks.execFile.mock.calls) {
      const options = call[2] as { windowsHide?: boolean }
      expect(options.windowsHide).toBe(true)
    }
  })

  it('خطای مهاجرت را با لاگ همان گام گزارش می‌کند', async () => {
    failOn('migrate')

    await expect(runInstall({ adminPhone: '09120000000' })).rejects.toMatchObject({
      name: 'InstallError',
      steps: [{ name: 'migrate', ok: false, log: 'the failure output' }],
    })
  })

  it('خطای seed را بعد از گام موفق مهاجرت گزارش می‌کند', async () => {
    failOn('seed')

    const error = await runInstall({ adminPhone: '09120000000' }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(InstallError)
    const steps = (error as InstallError).steps
    expect(steps.map((step) => [step.name, step.ok])).toEqual([
      ['migrate', true],
      ['seed', false],
    ])
  })

  it('نبودن ابزار پریسما را پیش از هر اجرایی گزارش می‌کند', async () => {
    mocks.existsSync.mockReturnValue(false)

    const error = await runInstall({ adminPhone: '09120000000' }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(InstallError)
    expect((error as InstallError).steps).toEqual([])
    expect(mocks.execFile).not.toHaveBeenCalled()
  })
})
