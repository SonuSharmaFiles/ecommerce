# ShopFlow — Static storefront

A simple, modern ecommerce storefront built with vanilla **HTML, CSS, and JavaScript**.
No framework, no build step, no backend — runs on GitHub Pages or any static host.

## Pages

- `index.html` — homepage with hero and featured products
- `products.html` — catalog with search, category, brand, and price filters
- `product.html` — product detail (loads via `?id=` query param)
- `cart.html` — shopping cart with quantity controls
- `checkout.html` — checkout form with order summary
- `about.html`, `contact.html` — basic informational pages

## Data

All products live in `data/products.json`. Add, edit, or remove entries there.

## Cart

Lives in `localStorage` under the key `shopflow-cart`. Persists across pages and reloads.

## Run locally

It's plain HTML — open `index.html` in any browser. For best results (so `fetch()` to
`data/products.json` works without a CORS hiccup), serve from a local HTTP server:

```bash
# Python 3
python3 -m http.server 8000

# Node
npx serve .
```

Then open <http://localhost:8000>.

## Deploy

Push to a GitHub repo and enable **Pages** (Settings → Pages → Source: `main` / root).
Site goes live at `https://<your-user>.github.io/<repo>/`.
