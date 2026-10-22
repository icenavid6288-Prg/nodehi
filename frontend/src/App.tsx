import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import CheckoutResult from './pages/CheckoutResult'
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
import AdminLayout from './pages/admin/AdminLayout'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminReviews from './pages/admin/AdminReviews'
import AdminHeroSlides from './pages/admin/AdminHeroSlides'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { CatalogProvider } from './context/CatalogContext'
import { useNoindex } from './lib/seo'

/** صفحهٔ ۴۰۴ ایندکس نمی‌شود؛ مسیرهای دسته/برند مستقیماً Shop را رندر می‌کنند. */
function NotFound() {
  useNoindex('صفحه پیدا نشد', '/404')

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
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="category/:categorySlug" element={<Shop />} />
                <Route path="brands" element={<Brands />} />
                <Route path="ready-to-ship" element={<Navigate to="/shop?inStock=1" replace />} />
                <Route path="checkout/result" element={<CheckoutResult />} />
                <Route path="brand/:brandSlug" element={<Shop />} />
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

              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="products" replace />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="hero-slides" element={<AdminHeroSlides />} />
              </Route>
            </Routes>
          </CartProvider>
        </AuthProvider>
      </CatalogProvider>
    </BrowserRouter>
  )
}
