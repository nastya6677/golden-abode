/* =========================================================
   API-КЛИЕНТ — связь с Java-бэкендом
   ========================================================= */

const API_URL = 'http://localhost:8080/api';

/* Токен и пользователь в localStorage */
const auth = {
    getToken: () => localStorage.getItem('token'),
    setToken: (t) => localStorage.setItem('token', t),
    clear: () => { localStorage.removeItem('token'); localStorage.removeItem('user'); },
    isAuth: () => !!localStorage.getItem('token'),
    getUser: () => JSON.parse(localStorage.getItem('user') || 'null'),
    setUser: (u) => localStorage.setItem('user', JSON.stringify(u))
};

/* Универсальный запрос */
async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = auth.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(API_URL + path, { ...options, headers });

    if (res.status === 401) {
        auth.clear();
        if (!window.location.pathname.includes('login') &&
            !window.location.pathname.includes('register')) {
            window.location.href = 'login.html';
        }
        return null;
    }

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Ошибка запроса');
    }

    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
}

/* Методы API */
const API = {
    /* Авторизация */
    register: (data) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    /* Профиль */
    getProfile: () => apiFetch('/user/profile'),
    updateProfile: (data) => apiFetch('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),

    /* Корзина */
    getCart: () => apiFetch('/cart'),
    addToCart: (productId, qty = 1) => apiFetch(`/cart/add/${productId}?quantity=${qty}`, { method: 'POST' }),
    removeFromCart: (cartItemId) => apiFetch(`/cart/remove/${cartItemId}`, { method: 'DELETE' }),
    clearCart: () => apiFetch('/cart/clear', { method: 'DELETE' }),

    /* Заказы */
    createOrder: (address) => apiFetch('/orders/create', { method: 'POST', body: JSON.stringify({ address }) }),
    getOrders: () => apiFetch('/orders'),

    /* Товары (публично) */
    getProducts: () => apiFetch('/products')
};