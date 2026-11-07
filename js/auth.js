/* =========================================================
   АВТОРИЗАЦИЯ И КОРЗИНА (localStorage)
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

    // --- СОЗДАНИЕ АДМИНА ПРИ ПЕРВОМ ЗАПУСКЕ ---
    if (!localStorage.getItem('abode_admin_created')) {
        try {
            await DB.createUser({
                email: 'admin@golden-abode.ru',
                password: 'admin123',
                firstName: 'Администратор',
                lastName: 'Золотой',
                phone: ''
            });
            const adminUser = await DB.loginUser('admin@golden-abode.ru', 'admin123');
            adminUser.role = 'ADMIN';
            await DB.updateUser(adminUser.id, { role: 'ADMIN' });
            localStorage.setItem('abode_admin_created', '1');
            console.log('✅ Админ создан: admin@golden-abode.ru / admin123');
        } catch (e) {
            console.log('Админ уже существует или ошибка:', e.message);
        }
    }

    const session = await DB.getSession();
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        if (session) {
            profileBtn.href = 'profile.html';
            profileBtn.setAttribute('title', 'Личный кабинет');
        } else {
            profileBtn.href = 'login.html';
            profileBtn.setAttribute('title', 'Войти');
        }
    }

    // Показываем админку только админам
    if (session && session.role === 'ADMIN') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'flex';
    }

    if (session && !localStorage.getItem('abode_session')) {
        localStorage.setItem('abode_session', JSON.stringify({ userId: session.userId, email: session.email }));
    }

    updateCartBadge();

    /* ============ ФОРМА ВХОДА ============ */
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('[name="email"]').value.trim();
            const password = loginForm.querySelector('[name="password"]').value;
            const errorBox = document.getElementById('authError');
            errorBox.textContent = '';
            try {
                const user = await DB.loginUser(email, password);
                
                // ПРОВЕРКА НА БЛОКИРОВКУ
                if (user.blocked) {
                    errorBox.textContent = 'Ваш аккаунт заблокирован администратором.';
                    return;
                }

                await DB.setSession(user);
                localStorage.setItem('abode_session', JSON.stringify({ userId: user.id, email: user.email }));
                mergeGuestCart(user.id);
                window.location.href = user.role === 'ADMIN' ? 'admin.html' : 'profile.html';
            } catch (err) { errorBox.textContent = err.message; }
        });
    }

    /* ============ ФОРМА РЕГИСТРАЦИИ ============ */
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorBox = document.getElementById('authError');
            errorBox.textContent = '';
            const data = {
                firstName: registerForm.querySelector('[name="firstName"]').value.trim(),
                lastName: registerForm.querySelector('[name="lastName"]').value.trim(),
                email: registerForm.querySelector('[name="email"]').value.trim(),
                phone: registerForm.querySelector('[name="phone"]').value.trim(),
                password: registerForm.querySelector('[name="password"]').value
            };
            const nameError = validateName(data.firstName, 'first') || validateName(data.lastName, 'last');
            if (nameError) { errorBox.textContent = nameError; return; }
            if (data.password.length < 6) {
                errorBox.textContent = 'Пароль должен быть не менее 6 символов';
                return;
            }
            try {
                const userId = await DB.createUser(data);
                const user = await DB.getUser(userId);
                await DB.setSession(user);
                localStorage.setItem('abode_session', JSON.stringify({ userId: user.id, email: user.email }));
                mergeGuestCart(user.id);
                window.location.href = 'profile.html';
            } catch (err) { errorBox.textContent = err.message; }
        });
    }

    /* ============ ПРОФИЛЬ ============ */
    const profilePage = document.getElementById('profilePage');
    if (profilePage) {
        if (!session) { window.location.href = 'login.html'; return; }
        loadProfile(session.userId);

        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    firstName: profileForm.querySelector('[name="firstName"]').value.trim(),
                    lastName: profileForm.querySelector('[name="lastName"]').value.trim(),
                    phone: profileForm.querySelector('[name="phone"]').value.trim(),
                    address: profileForm.querySelector('[name="address"]').value.trim()
                };
                const profileError = document.getElementById('profileError');
                if (profileError) profileError.textContent = '';
                try {
                    await DB.updateUser(session.userId, data);
                } catch (err) {
                    if (profileError) profileError.textContent = err.message;
                    return;
                }
                const updated = await DB.getUser(session.userId);
                await DB.setSession(updated);
                loadProfile(session.userId);
                showToast('Профиль сохранён');
            });
        }

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const box = document.getElementById('passwordError');
                box.textContent = '';
                const current = passwordForm.querySelector('[name="current"]').value;
                const next = passwordForm.querySelector('[name="next"]').value;
                const repeat = passwordForm.querySelector('[name="repeat"]').value;
                if (next !== repeat) { box.textContent = 'Новые пароли не совпадают'; return; }
                try {
                    await DB.changePassword(session.userId, current, next);
                    passwordForm.reset();
                    showToast('Пароль изменён');
                } catch (err) { box.textContent = err.message; }
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await DB.clearSession();
                localStorage.removeItem('abode_session');
                window.location.href = 'index.html';
            });
        }

        loadOrders(session.userId);
    }

    /* ============ КОРЗИНА ============ */
    const cartPage = document.getElementById('cartPage');
    if (cartPage) {
        loadCart();
    }
});

/* =========================================================
   ФУНКЦИИ КОРЗИНЫ (localStorage)
   ========================================================= */

function getUserId() {
    try {
        const sessionStr = localStorage.getItem('abode_session');
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            return session.userId || 'guest';
        }
    } catch(e) {}
    return 'guest';
}

/* Перенос корзины гостя в корзину пользователя после входа или регистрации */
function mergeGuestCart(userId) {
    try {
        const guestKey = 'abode_cart_guest';
        const guest = JSON.parse(localStorage.getItem(guestKey)) || [];
        if (!guest.length) return;
        const userKey = 'abode_cart_' + userId;
        const cart = JSON.parse(localStorage.getItem(userKey)) || [];
        guest.forEach(item => {
            const same = cart.find(c => c.productId === item.productId);
            if (same) same.quantity = (Number(same.quantity) || 0) + (Number(item.quantity) || 0);
            else cart.push(item);
        });
        localStorage.setItem(userKey, JSON.stringify(cart));
        localStorage.removeItem(guestKey);
    } catch (e) {}
}

function getCartItems() {
    const userId = getUserId();
    const key = 'abode_cart_' + userId;
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch(e) { return []; }
}

function saveCartItems(items) {
    const userId = getUserId();
    const key = 'abode_cart_' + userId;
    localStorage.setItem(key, JSON.stringify(items));
}

async function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (!badge) return;
    const items = getCartItems();
    const total = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    badge.textContent = total;
}

async function loadProfile(userId) {
    try {
        const user = await DB.getUser(userId);
        if (!user) return;
        const f = document.getElementById('profileForm');
        if (f) {
            f.querySelector('[name="firstName"]').value = user.firstName || '';
            f.querySelector('[name="lastName"]').value = user.lastName || '';
            f.querySelector('[name="email"]').value = user.email || '';
            f.querySelector('[name="phone"]').value = user.phone || '';
            f.querySelector('[name="address"]').value = user.address || '';
        }
        const w = document.getElementById('welcomeText');
        if (w) {
            const name = (user.firstName && user.firstName.trim()) || user.email || 'гость';
            w.textContent = `Здравствуйте, ${name}!`;
        }
    } catch (e) { console.error(e); }
}

async function loadOrders(userId) {
    const box = document.getElementById('ordersList');
    if (!box) return;
    try {
        const orders = JSON.parse(localStorage.getItem('abode_orders') || '[]').filter(o => o.userId === userId);
        if (orders.length === 0) {
            box.innerHTML = '<p style="color:var(--text-light);">Пока нет заказов</p>';
            return;
        }
        box.innerHTML = orders.map(o => `
            <div style="border:1px solid var(--border);padding:16px;border-radius:8px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;font-weight:600;">
                    <span>Заказ №${o.id}</span>
                    <span style="color:var(--gold);">${o.total} ₽</span>
                </div>
                <div style="font-size:12px;color:var(--text-light);margin-top:6px;">
                    Статус: ${o.status} · ${new Date(o.createdAt).toLocaleString('ru-RU')}
                </div>
                <div style="font-size:13px;color:var(--text-light);margin-top:8px;">
                    ${o.items.map(i => `${i.title} × ${i.quantity}`).join(', ')}
                </div>
            </div>
        `).join('');
    } catch (e) { box.innerHTML = '<p style="color:var(--text-light);">Ошибка загрузки</p>'; }
}

async function loadCart() {
    const box = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!box) return;
    const items = getCartItems();

    if (items.length === 0) {
        box.innerHTML = '<p style="color:var(--text-light);padding:20px;text-align:center;">Корзина пуста</p><p style="text-align:center;padding-bottom:20px;"><a href="catalog.html" style="color:var(--gold);font-weight:600;">Перейти в каталог →</a></p>';
        if (totalEl) totalEl.textContent = '0 ₽';
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        }
        return;
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.cursor = 'pointer';
    }

    box.innerHTML = items.map((i, index) => `
        <div style="display:flex;gap:16px;padding:16px;border-bottom:1px solid var(--border);align-items:center;">
            <div style="width:80px;height:80px;background:var(--beige);border-radius:8px;overflow:hidden;flex-shrink:0;">
                <img src="${i.imageUrl || 'img/placeholder.jpg'}" alt="" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div style="flex:1;">
                <div style="font-weight:600;">${i.title}</div>
                <div style="color:var(--gold);font-weight:700;margin-top:6px;">${i.price} ₽ × ${i.quantity} = ${(i.price * i.quantity).toFixed(0)} ₽</div>
                <div class="cart-qty">
                    <button type="button" class="qty-btn" data-index="${index}" data-delta="-1" aria-label="Уменьшить количество">−</button>
                    <span class="qty-value">${i.quantity}</span>
                    <button type="button" class="qty-btn" data-index="${index}" data-delta="1" aria-label="Увеличить количество">+</button>
                </div>
            </div>
            <button class="btn-remove" data-index="${index}" style="color:var(--burgundy);font-size:20px;background:none;border:none;cursor:pointer;">✕</button>
        </div>
    `).join('');

    const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    if (totalEl) totalEl.textContent = total.toFixed(0) + ' ₽';

    box.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            const delta = parseInt(btn.dataset.delta);
            const currentCart = getCartItems();
            if (!currentCart[index]) return;
            const next = (Number(currentCart[index].quantity) || 1) + delta;
            currentCart[index].quantity = Math.min(99, Math.max(1, next));
            saveCartItems(currentCart);
            loadCart();
            updateCartBadge();
        });
    });

    box.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            let currentCart = getCartItems();
            currentCart.splice(index, 1);
            saveCartItems(currentCart);
            loadCart();
            updateCartBadge();
        });
    });
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="toast__icon">✓</span> ${msg}`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 400);
    }, 2500);
}