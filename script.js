
// Shared site script for AgriConnect Organic
const STRINGS = {
    en: { siteName: "AgriConnect Organic", tagline: "Certified Organic Marketplace", searchPlaceholder: "Search products or sellers...", browseProducts: "Browse products", newListings: "New product listings", topSellers: "Top seller products", newSellers: "New sellers", sellers: "Sellers", products: "Products", cart: "Cart", account: "Sign up / Log in", checkout: "Checkout", placeOrder: "Place Order", paymentMethod: "Mode of payment", address: "Delivery address", orderPlaced: "Order placed successfully!", needSignIn: "Please sign in to continue.", language: "Language", english: "English", filipino: "Filipino" },
    fil: { siteName: "AgriConnect Organic", tagline: "Sertipikadong Organikong Pamilihan", searchPlaceholder: "Maghanap ng produkto o nagtitinda...", browseProducts: "Mag-browse ng mga produkto", newListings: "Bagong listahan ng produkto", topSellers: "Pinakamabentang produkto", newSellers: "Bagong nagtitinda", sellers: "Nagtitinda", products: "Mga produkto", cart: "Cart", account: "Mag-sign up / Mag-log in", checkout: "Checkout", placeOrder: "Ilagay ang Order", paymentMethod: "Paraan ng pagbabayad", address: "Address para sa pag-deliver", orderPlaced: "Matagumpay na naipadala ang order!", needSignIn: "Mangyaring mag-sign in upang magpatuloy.", language: "Wika", english: "Ingles", filipino: "Filipino" }
};

function t(key) { const lang = localStorage.getItem('agri_lang') || 'en'; return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key; }

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea') { el.placeholder = t(key); } else { el.textContent = t(key); }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); el.placeholder = t(key); });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.site-name').forEach(el => el.textContent = t('siteName'));
    document.querySelectorAll('.site-tagline').forEach(el => el.textContent = t('tagline'));
    applyTranslations();
    document.querySelectorAll('.lang-switch').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); const code = btn.dataset.lang; localStorage.setItem('agri_lang', code); applyTranslations(); document.querySelectorAll('.site-name').forEach(el => el.textContent = t('siteName')); }); });
});

const toastWrap = document.createElement('div'); toastWrap.className = 'toast-wrap'; document.body.appendChild(toastWrap);
function showToast(message, options = {}) {
    const id = 't' + Date.now();
    const el = document.createElement('div'); el.className = 'toast'; el.id = id;
    el.innerHTML = '<div style="flex:1"><div>' + message + '</div></div>';
    const close = document.createElement('button'); close.className = 'close'; close.innerHTML = '✕';
    close.onclick = () => { el.remove(); };
    el.appendChild(close);
    toastWrap.appendChild(el);
    const timeout = options.timeout === 0 ? null : (options.timeout || 5000);
    if (timeout) setTimeout(() => { try { el.remove() } catch (e) { } }, timeout);
    return id;
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('agri_cart')) || { items: [] }
    } catch (e) {
        return {
            items: []
        }
    }
}
//function saveCart(c) { localStorage.setItem('agri_cart', JSON.stringify(c)); updateCartCount(); }
//function updateCartCount() { const el = document.getElementById('cart-count'); if (el) { const c = getCart(); el.textContent = c.items.reduce((s, i) => s + i.qty, 0); } }
function currentUser() { try { return JSON.parse(localStorage.getItem('agri_user') || 'null') } catch (e) { return null } }
function requireSignIn(callback) { if (!currentUser()) { showToast(t('needSignIn')); location.href = 'login.html'; return false; } return true; }
// ---------------------------
// CART SYSTEM
// ---------------------------

// ---------------------------
// CART SYSTEM (Unified & Backwards-compatible)
// ---------------------------

// Load cart or initialize new one. Accepts legacy "cart" (array) or "agri_cart" (object).
function getCart() {
    try {
        const rawAgri = localStorage.getItem("agri_cart");
        const rawCart = localStorage.getItem("cart");

        if (rawAgri) {
            const parsed = JSON.parse(rawAgri);
            if (parsed && Array.isArray(parsed.items)) return parsed;
            // If agri_cart is an array by any chance, normalize it.
            if (Array.isArray(parsed)) return { items: parsed };
        }

        if (rawCart) {
            const parsed = JSON.parse(rawCart);
            // If legacy "cart" stored an array, wrap it
            if (Array.isArray(parsed)) return { items: parsed };
            // If it stored an object with items, use it
            if (parsed && parsed.items) return parsed;
        }

        // default empty cart object
        return { items: [] };
    } catch (e) {
        return { items: [] };
    }
}

// Save cart to storage (canonical form under "agri_cart"; also store legacy "cart" array for compatibility)
function saveCart(cartObj) {
    // Expect cartObj to be { items: [...] } — but if an array is passed, coerce it.
    let obj = cartObj;
    if (!obj) obj = { items: [] };
    if (Array.isArray(obj)) obj = { items: obj };

    // ensure items exists and is an array
    obj.items = obj.items || [];

    try {
        localStorage.setItem("agri_cart", JSON.stringify(obj));
        // also write legacy `cart` key as array for older pages that might read it
        localStorage.setItem("cart", JSON.stringify(obj.items));
    } catch (e) {
        console.warn("Failed to save cart", e);
    }

    updateCartCount();
}

// Add item to cart (accepts different incoming shapes)
function addToCart(product) {
    const cartObj = getCart();
    const items = cartObj.items;

    // Normalise incoming product fields (support both shapes)
    const pid = product.id || product.productId || product._id;
    const pname = product.name || product.title || product.productName || "Untitled";
    const pprice = typeof product.price === "number" ? product.price : parseFloat(product.price) || 0;
    const punit = product.unit || product.u || "";
    const pqty = parseFloat(product.quantity || product.qty || product.q || 1) || 1;

    // check existing
    const existing = items.find(i => (i.id || i.productId) === pid);
    if (existing) {
        existing.quantity = (existing.quantity || existing.qty || 0) + pqty;
    } else {
        // store canonical internal format: { id, name, price, unit, quantity }
        items.push({
            id: pid,
            name: pname,
            price: pprice,
            unit: punit,
            quantity: pqty
        });
    }

    saveCart(cartObj);
    // If you have a toast helper:
    if (typeof showToast === "function") showToast("Item added to cart");
    // re-render if cart is visible
    if (typeof renderCart === "function") renderCart();
}

// Update quantity (for cart.html)
function updateQuantity(productId, newQty) {
    const cartObj = getCart();
    const items = cartObj.items;
    const item = items.find(i => i.id === productId || i.productId === productId);

    if (item) {
        const q = parseInt(newQty, 10) || 0;
        if (q <= 0) {
            removeFromCart(productId);
            return;
        }
        item.quantity = q;
        saveCart(cartObj);
        if (typeof renderCart === "function") renderCart();
    }
}

// Remove an item
function removeFromCart(productId) {
    const cartObj = getCart();
    cartObj.items = cartObj.items.filter(i => (i.id || i.productId) !== productId);
    saveCart(cartObj);
    if (typeof renderCart === "function") renderCart();
}

// Render cart on cart.html — robust against different item property names
function renderCart() {
    const cartObj = getCart();
    const items = cartObj.items || [];
    const container = document.getElementById("cart-items");

    if (!container) return;

    container.innerHTML = "";

    if (items.length === 0) {
        container.innerHTML = "<p style=\"text-align:center;\">Your cart is empty.</p>";
        const totalEl = document.getElementById("cart-total");
        if (totalEl) totalEl.textContent = "0";
        return;
    }

    items.forEach(item => {
        // support either `name` or `title`, and `quantity` or `qty`.
        const displayName = item.name || item.title || item.productName || "Item";
        const displayQty = item.quantity || item.qty || 1;
        const displayPrice = (typeof item.price === "number") ? item.price : parseFloat(item.price) || 0;

        const div = document.createElement("div");
        div.classList.add("cart-item");
        div.innerHTML = `
      <h3>${displayName}</h3>
      <p>₱${displayPrice}</p>
      <label>Quantity:
        <input type="number" min="1" value="${displayQty}"
          onchange="updateQuantity('${item.id || item.productId}', this.value)">
      </label>
      <button onclick="removeFromCart('${item.id || item.productId}')">Remove</button>
      <hr>
    `;

        container.appendChild(div);
    });

    // update cart total if element exists
    const totalEl = document.getElementById("cart-total");
    if (totalEl) {
        const total = items.reduce((sum, it) => {
            const qty = (it.quantity || it.qty || 0);
            const price = (typeof it.price === "number") ? it.price : (parseFloat(it.price) || 0);
            return sum + (qty * price);
        }, 0);
        totalEl.textContent = total.toFixed(2);
    }
}

// Keep an up-to-date cart count in any nav badge that uses id "cart-count"
function updateCartCount() {
    try {
        const c = getCart();
        const total = (c.items || []).reduce((s, i) => s + (i.quantity || i.qty || 0), 0);
        const el = document.getElementById("cart-count");
        if (el) el.textContent = total;
    } catch (e) { /* ignore */ }
}

// Make sure cart UI is rendered on page load if applicable
document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderCart === "function") renderCart();
    updateCartCount();
});

// On page load, if cart container exists → render
document.addEventListener("DOMContentLoaded", renderCart);

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("add-to-cart-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        // Get product info from your page
        const product = {
            id: document.getElementById("product-id").value,
            name: document.getElementById("product-name").innerText,
            price: parseFloat(document.getElementById("product-price").innerText.replace('₱', '')),
            quantity: 1
        };

        addToCart(product);
    });
});

