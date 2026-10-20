'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import type { CartLine, Product } from '@/types'

const STORAGE_KEY = 'nodehi:store:v1'
const MAX_COMPARE = 4

interface StoreState {
  cart: CartLine[]
  compare: string[]
  wishlist: string[]
  /**
   * کد تخفیف اعمال‌شده —
   * فقط «کد» نگه داشته می‌شود، نه درصد و برچسب. دلیل: درصد از
   * `lib/commerce` خوانده می‌شود تا اگر کمپین تغییر کرد، مقادیر کهنه در
   * localStorage کاربر باقی نماند. حکم نهایی هم همیشه از سرور است.
   * کد در localStorage می‌ماند تا کاربر پس از بازگشت به سایت آن را از دست ندهد.
   */
  couponCode: string | null
}

type Action =
  | { type: 'hydrate'; payload: Partial<StoreState> }
  | { type: 'add-to-cart'; product: Product; quantity: number }
  | { type: 'remove-from-cart'; productId: string }
  | { type: 'set-quantity'; productId: string; quantity: number }
  | { type: 'clear-cart' }
  | { type: 'toggle-compare'; slug: string }
  | { type: 'clear-compare' }
  | { type: 'toggle-wishlist'; slug: string }
  | { type: 'set-coupon'; code: string | null }

const initialState: StoreState = { cart: [], compare: [], wishlist: [], couponCode: null }

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'hydrate':
      return {
        cart: action.payload.cart ?? [],
        compare: action.payload.compare ?? [],
        wishlist: action.payload.wishlist ?? [],
        couponCode: action.payload.couponCode ?? null,
      }

    case 'set-coupon':
      return { ...state, couponCode: action.code }

    case 'add-to-cart': {
      const { product, quantity } = action
      const existing = state.cart.find((line) => line.productId === product.id)
      const maxStock = Math.max(product.stock, 0)

      if (existing) {
        return {
          ...state,
          cart: state.cart.map((line) =>
            line.productId === product.id
              ? { ...line, quantity: Math.min(line.quantity + quantity, maxStock || line.quantity + quantity) }
              : line,
          ),
        }
      }

      const line: CartLine = {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        quantity,
        maxStock,
        readyToShip: product.attributes.readyToShip,
      }
      return { ...state, cart: [...state.cart, line] }
    }

    case 'remove-from-cart':
      return { ...state, cart: state.cart.filter((line) => line.productId !== action.productId) }

    case 'set-quantity':
      return {
        ...state,
        cart: state.cart
          .map((line) =>
            line.productId === action.productId ? { ...line, quantity: Math.max(1, action.quantity) } : line,
          )
          .filter((line) => line.quantity > 0),
      }

    case 'clear-cart':
      // کد تخفیف هم پاک می‌شود: کد اعمال‌شده به سبدِ حذف‌شده تعلق داشت و
      // نگه‌داشتن آن، کوپن را به خرید بعدی منتقل می‌کند که درست نیست.
      return { ...state, cart: [], couponCode: null }

    case 'toggle-compare': {
      if (state.compare.includes(action.slug)) {
        return { ...state, compare: state.compare.filter((slug) => slug !== action.slug) }
      }
      // اگر به سقف مقایسه رسیده باشیم، قدیمی‌ترین حذف می‌شود
      const next = [...state.compare, action.slug]
      return { ...state, compare: next.length > MAX_COMPARE ? next.slice(next.length - MAX_COMPARE) : next }
    }

    case 'clear-compare':
      return { ...state, compare: [] }

    case 'toggle-wishlist':
      return {
        ...state,
        wishlist: state.wishlist.includes(action.slug)
          ? state.wishlist.filter((slug) => slug !== action.slug)
          : [...state.wishlist, action.slug],
      }

    default:
      return state
  }
}

interface StoreContextValue extends StoreState {
  /** تا زمانی که هیدریشن کامل نشده، شمارنده‌ها نباید رندر شوند (جلوگیری از hydration mismatch) */
  hydrated: boolean
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCompare: (slug: string) => void
  clearCompare: () => void
  toggleWishlist: (slug: string) => void
  setCouponCode: (code: string | null) => void
  isInCompare: (slug: string) => boolean
  isInWishlist: (slug: string) => boolean
  cartCount: number
  cartSubtotal: number
  canAddToCompare: boolean
  maxCompare: number
  /** آخرین پیام برای نمایش توست */
  notice: string | null
  clearNotice: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [hydrated, setHydrated] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // خواندن وضعیت ذخیره‌شده پس از mount (localStorage در سرور وجود ندارد)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) dispatch({ type: 'hydrate', payload: JSON.parse(raw) as Partial<StoreState> })
    } catch {
      // داده خراب در localStorage نباید برنامه را متوقف کند
    }
    setHydrated(true)
  }, [])

  // ذخیره تغییرات
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // حالت خصوصی مرورگر یا پر بودن سهمیه — بی‌صدا رد می‌شویم
    }
  }, [state, hydrated])

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 3000)
  }, [])

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (product.stock <= 0) {
        showNotice('این کالا در حال حاضر موجود نیست')
        return
      }
      dispatch({ type: 'add-to-cart', product, quantity })
      showNotice(`«${product.name}» به سبد خرید اضافه شد`)
    },
    [showNotice],
  )

  const value = useMemo<StoreContextValue>(() => {
    const cartCount = state.cart.reduce((sum, line) => sum + line.quantity, 0)
    const cartSubtotal = state.cart.reduce((sum, line) => sum + line.price * line.quantity, 0)

    return {
      ...state,
      hydrated,
      addToCart,
      removeFromCart: (productId: string) => dispatch({ type: 'remove-from-cart', productId }),
      setQuantity: (productId: string, quantity: number) =>
        dispatch({ type: 'set-quantity', productId, quantity }),
      clearCart: () => dispatch({ type: 'clear-cart' }),
      toggleCompare: (slug: string) => dispatch({ type: 'toggle-compare', slug }),
      clearCompare: () => dispatch({ type: 'clear-compare' }),
      toggleWishlist: (slug: string) => dispatch({ type: 'toggle-wishlist', slug }),
      setCouponCode: (code: string | null) => dispatch({ type: 'set-coupon', code }),
      isInCompare: (slug: string) => state.compare.includes(slug),
      isInWishlist: (slug: string) => state.wishlist.includes(slug),
      cartCount,
      cartSubtotal,
      canAddToCompare: state.compare.length < MAX_COMPARE,
      maxCompare: MAX_COMPARE,
      notice,
      clearNotice: () => setNotice(null),
    }
  }, [state, hydrated, notice, addToCart])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore باید داخل StoreProvider استفاده شود')
  return context
}
