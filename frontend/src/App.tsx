import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, Link, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Track from './pages/Track'
import About from './pages/About'
import Brands from './pages/Brands'
import Contact from './pages/Contact'
import Account from './pages/Account'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Faq from './pages/Faq'
import Guides from './pages/Guides'
import Loyalty from './pages/Loyalty'
import Legal from './pages/Legal'
// پنل مدیریت فقط برای کارکنان است؛ جدا کردن آن در chunk جداگانه، حجم
// باندل فروشگاه برای مشتریان را بالا نمی‌برد.
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./admin/Dashboard'))
const AdminProducts = lazy(() => import('./admin/Products'))
const AdminOrders = lazy(() => import('./admin/Orders'))
const AdminReviews = lazy(() => import('./admin/Reviews'))
const AdminAudit = lazy(() => import('./admin/Audit'))
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { CatalogProvider } from './context/CatalogContext'

/** مسیرهای سئویی /category/:slug و /brand/:slug به فیلتر فروشگاه نگاشت می‌شوند. */
function CatalogRedirect({ param }: { param: 'category' | 'brand' }) {
  const { slug = '' } = useParams()
  return <Navigate to={`/shop?${param}=${encodeURIComponent(slug)}`} replace />
}

function NotFound() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-extrabold">صفحه پیدا نشد</h1>
      <p className="mt-2 text-sm text-ink-muted">آدرسی که وارد کرده‌اید وجود ندارد.</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
        بازگشت به خانه
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CatalogProvider>
        <AuthProvider>
          <CartProvider>
            <Suspense
              fallback={
                <div className="container-page py-20 text-center text-sm text-ink-muted">
                  در حال بارگذاری...
                </div>
              }
            >
            <Routes>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="audit" element={<AdminAudit />} />
              </Route>

              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="category/:slug" element={<CatalogRedirect param="category" />} />
                <Route path="brands" element={<Brands />} />
                <Route path="ready-to-ship" element={<Navigate to="/shop?inStock=1" replace />} />
                <Route path="checkout/result" element={<Navigate to="/track" replace />} />
                <Route path="brand/:slug" element={<CatalogRedirect param="brand" />} />
                <Route path="product/:slug" element={<Product />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="login" element={<Login />} />
                <Route path="track" element={<Track />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="account" element={<Account />} />
                <Route path="blog" element={<Blog />} />
                <Route path="blog/:slug" element={<BlogPost />} />
                <Route path="guides" element={<Guides />} />
                <Route path="faq" element={<Faq />} />
                <Route path="loyalty" element={<Loyalty />} />
                <Route path="terms" element={<Legal slug="terms" />} />
                <Route path="privacy" element={<Legal slug="privacy" />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            </Suspense>
          </CartProvider>
        </AuthProvider>
      </CatalogProvider>
    </BrowserRouter>
  )
}
