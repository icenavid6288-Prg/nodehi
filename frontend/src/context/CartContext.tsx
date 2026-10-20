import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type CartLine = {
  slug: string
  name: string
  price: number
  image?: string | null
  stock: number
  quantity: number
}

type CartContextValue = {
  lines: CartLine[]
  count: number
  subtotal: number
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void
  setQuantity: (slug: string, quantity: number) => void
  remove: (slug: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'nodehi.cart.v1'

function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.slug === 'string') : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0)
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)

    return {
      lines,
      count,
      subtotal,
      add(line, quantity = 1) {
        setLines((current) => {
          const existing = current.find((item) => item.slug === line.slug)
          const max = Math.max(line.stock, 1)
          if (existing) {
            return current.map((item) =>
              item.slug === line.slug
                ? { ...item, quantity: Math.min(item.quantity + quantity, max) }
                : item
            )
          }
          return [...current, { ...line, quantity: Math.min(quantity, max) }]
        })
      },
      setQuantity(slug, quantity) {
        setLines((current) =>
          current
            .map((item) =>
              item.slug === slug
                ? { ...item, quantity: Math.max(1, Math.min(quantity, Math.max(item.stock, 1))) }
                : item
            )
            .filter((item) => item.quantity > 0)
        )
      },
      remove(slug) {
        setLines((current) => current.filter((item) => item.slug !== slug))
      },
      clear() {
        setLines([])
      },
    }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart باید داخل CartProvider استفاده شود')
  return context
}
