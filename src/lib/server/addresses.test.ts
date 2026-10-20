import { describe, expect, it } from 'vitest'
import { parseAddressInput } from './addresses'

/**
 * آدرس‌ها به جدول Address می‌روند و بعداً روی برچسب ارسال چاپ می‌شوند؛ پس
 * اعتبارسنجی اینجا آخرین سد پیش از ذخیره داده ناقص است.
 */
describe('parseAddressInput', () => {
  const valid = {
    title: 'خانه',
    receiver: 'مریم احمدی',
    phone: '09121234567',
    province: 'تهران',
    city: 'تهران',
    line: 'خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳',
    postalCode: '1234567890',
  }

  it('ورودی درست را بدون خطا می‌پذیرد', () => {
    const { fields, values } = parseAddressInput(valid)
    expect(fields).toEqual({})
    expect(values.receiver).toBe('مریم احمدی')
    expect(values.postalCode).toBe('1234567890')
  })

  it('شماره همراه را یکسان‌سازی می‌کند (فاصله و ارقام فارسی)', () => {
    const { fields, values } = parseAddressInput({ ...valid, phone: '۰۹۱۲ ۱۲۳ ۴۵۶۷' })
    expect(fields.phone).toBeUndefined()
    expect(values.phone).toBe('09121234567')
  })

  it('شماره همراه نامعتبر را رد می‌کند', () => {
    expect(parseAddressInput({ ...valid, phone: '12345' }).fields.phone).toBeTruthy()
    expect(parseAddressInput({ ...valid, phone: '08121234567' }).fields.phone).toBeTruthy()
  })

  it('نشانی کوتاه را رد می‌کند', () => {
    expect(parseAddressInput({ ...valid, line: 'تهران' }).fields.line).toBeTruthy()
  })

  it('کد پستی غیر ۱۰ رقمی را رد می‌کند ولی خالی را می‌پذیرد', () => {
    expect(parseAddressInput({ ...valid, postalCode: '123' }).fields.postalCode).toBeTruthy()
    const { fields, values } = parseAddressInput({ ...valid, postalCode: '' })
    expect(fields.postalCode).toBeUndefined()
    expect(values.postalCode).toBeNull()
  })

  it('عنوان خالی را با پیش‌فرض «خانه» جایگزین می‌کند', () => {
    expect(parseAddressInput({ ...valid, title: '' }).values.title).toBe('خانه')
  })

  it('ورودی خالی را کاملاً رد می‌کند', () => {
    const { fields } = parseAddressInput({})
    expect(fields.receiver).toBeTruthy()
    expect(fields.phone).toBeTruthy()
    expect(fields.province).toBeTruthy()
    expect(fields.city).toBeTruthy()
    expect(fields.line).toBeTruthy()
  })

  it('متن خیلی بلند را به سقف مجاز می‌برد (بدون ذخیره ورودی نامحدود)', () => {
    const { values } = parseAddressInput({ ...valid, line: 'ا'.repeat(1000) })
    expect(values.line.length).toBe(300)
  })
})
