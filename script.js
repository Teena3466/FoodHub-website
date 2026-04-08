// Simple cart management using localStorage
const CART_KEY = "foodhub_cart";

function getCart() {
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCountBadge(cart);
}

function updateCartCountBadge(cart = null) {
  const countEl = document.querySelector(".nav-cart-count");
  if (!countEl) return;
  const items = cart ?? getCart();
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  countEl.textContent = totalQty > 0 ? String(totalQty) : "0";
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((entry) => entry.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart(cart);
}

function updateCartQuantity(id, delta) {
  const cart = getCart();
  const index = cart.findIndex((item) => item.id === id);
  if (index === -1) return;
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  saveCart(cart);
  renderCartPage();
  renderCheckoutSummary();
}

function removeFromCart(id) {
  const cart = getCart().filter((item) => item.id !== id);
  saveCart(cart);
  renderCartPage();
  renderCheckoutSummary();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function computeCartTotals(cart) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const delivery = cart.length > 0 ? 3.5 : 0;
  const fees = subtotal > 0 ? subtotal * 0.06 : 0;
  const total = subtotal + delivery + fees;
  return { subtotal, delivery, fees, total };
}

// Page-specific render helpers

function renderCartPage() {
  const container = document.querySelector("[data-cart-list]");
  if (!container) return; // Not on cart page

  const cart = getCart();
  const summaryTotalEl = document.querySelector("[data-cart-total]");
  const summaryItemsEl = document.querySelector("[data-cart-items-count]");

  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML =
      '<div class="cart-empty">Your cart is currently empty. <a href="menu.html">Browse the menu</a> to get started.</div>';
    if (summaryTotalEl) summaryTotalEl.textContent = formatCurrency(0);
    if (summaryItemsEl) summaryItemsEl.textContent = "0 items";
    return;
  }

  const list = document.createElement("div");
  list.className = "cart-list";

  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${formatCurrency(item.price)} · ${
      item.category ?? "Item"
    }</div>
      </div>
      <div class="muted">${formatCurrency(item.price * item.quantity)}</div>
      <div>
        <div class="cart-qty" data-qty="${item.id}">
          <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div>
        <button type="button" class="cart-remove" data-remove="${item.id}">Remove</button>
      </div>
    `;
    list.appendChild(row);
  });

  container.appendChild(list);

  const totals = computeCartTotals(cart);
  if (summaryTotalEl) summaryTotalEl.textContent = formatCurrency(totals.total);
  if (summaryItemsEl)
    summaryItemsEl.textContent = `${cart.length} item${
      cart.length > 1 ? "s" : ""
    }`;

  // Attach events
  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const removeId = target.getAttribute("data-remove");
    if (removeId) {
      removeFromCart(removeId);
      return;
    }

    const action = target.getAttribute("data-action");
    if (action) {
      const qtyWrapper = target.closest("[data-qty]");
      if (!qtyWrapper) return;
      const id = qtyWrapper.getAttribute("data-qty");
      if (!id) return;
      updateCartQuantity(id, action === "inc" ? 1 : -1);
    }
  });
}

function renderCheckoutSummary() {
  const summaryRoot = document.querySelector("[data-checkout-summary]");
  if (!summaryRoot) return;

  const cart = getCart();
  const itemsRoot = summaryRoot.querySelector("[data-summary-items]");
  const subtotalEl = summaryRoot.querySelector("[data-summary-subtotal]");
  const deliveryEl = summaryRoot.querySelector("[data-summary-delivery]");
  const feesEl = summaryRoot.querySelector("[data-summary-fees]");
  const totalEl = summaryRoot.querySelector("[data-summary-total]");

  if (!itemsRoot) return;

  itemsRoot.innerHTML = "";

  if (cart.length === 0) {
    itemsRoot.innerHTML =
      '<div class="muted" style="font-size:0.85rem;">No items in your cart yet. <a href="menu.html">Add something tasty</a>.</div>';
  } else {
    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "summary-row muted";
      row.innerHTML = `
        <span>${item.quantity} × ${item.name}</span>
        <span>${formatCurrency(item.price * item.quantity)}</span>
      `;
      itemsRoot.appendChild(row);
    });
  }

  const totals = computeCartTotals(cart);
  if (subtotalEl) subtotalEl.textContent = formatCurrency(totals.subtotal);
  if (deliveryEl) deliveryEl.textContent = formatCurrency(totals.delivery);
  if (feesEl) feesEl.textContent = formatCurrency(totals.fees);
  if (totalEl) totalEl.textContent = formatCurrency(totals.total);
}

function handleCheckoutSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  const cart = getCart();
  if (cart.length === 0) {
    alert("Your cart is empty. Please add some items before checking out.");
    return;
  }

  const name = form.querySelector("[name='name']");
  const address = form.querySelector("[name='address']");
  const phone = form.querySelector("[name='phone']");

  if (!name || !address || !phone) {
    alert("Please fill in your details.");
    return;
  }

  // Basic UX feedback
  alert("Thank you! Your order has been placed.");
  localStorage.removeItem(CART_KEY);
  window.location.href = "index.html";
}

// Initialization

document.addEventListener("DOMContentLoaded", () => {
  updateCartCountBadge();

  // Menu page: hook up Add to cart buttons
  const menuItemsRoot = document.querySelector("[data-menu-grid]");
  if (menuItemsRoot) {
    menuItemsRoot.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const button = target.closest("[data-add-to-cart]");
      if (!button) return;

      const id = button.getAttribute("data-id");
      const name = button.getAttribute("data-name");
      const priceStr = button.getAttribute("data-price");
      const category = button.getAttribute("data-category") || "";

      if (!id || !name || !priceStr) return;
      const price = parseFloat(priceStr);
      if (Number.isNaN(price)) return;

      addToCart({ id, name, price, category });
    });
  }

  // Cart page
  renderCartPage();

  // Checkout page
  renderCheckoutSummary();
  const checkoutForm = document.querySelector("[data-checkout-form]");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", handleCheckoutSubmit);
  }
});

