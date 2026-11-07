/* =========================================================
   БАЗА ДАННЫХ (IndexedDB) — работает прямо в браузере
   ========================================================= */

const DB_NAME = 'golden_abode_db';
const DB_VERSION = 1;
let _db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (_db) return resolve(_db);
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('users')) {
                const users = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                users.createIndex('email', 'email', { unique: true });
            }
            if (!db.objectStoreNames.contains('session')) {
                db.createObjectStore('session', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('cart')) {
                const cart = db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
                cart.createIndex('userId', 'userId', { unique: false });
            }
            if (!db.objectStoreNames.contains('orders')) {
                const orders = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                orders.createIndex('userId', 'userId', { unique: false });
            }
        };
        request.onsuccess = () => { _db = request.result; resolve(_db); };
        request.onerror = () => reject(request.error);
    });
}

async function dbAdd(store, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).add(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function dbPut(store, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function dbGet(store, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function dbDelete(store, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
async function dbGetByIndex(store, indexName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const idx = tx.objectStore(store).index(indexName);
        const req = idx.getAll(value);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}
async function dbFindUserByEmail(email) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readonly');
        const idx = tx.objectStore('users').index('email');
        const req = idx.get(String(email).trim().toLowerCase());
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function hashPassword(password) {
    const enc = new TextEncoder();
    const data = enc.encode(password + 'golden_abode_salt');
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Проверка и нормализация имени ---------- */
const NAME_PATTERN = /^\p{L}+(?:[ '’\-]\p{L}+)*$/u;
function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ')
        .split(' ')
        .map(word => word.split('-').map(part => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part).join('-'))
        .join(' ');
}
function validateName(value, kind) {
    const v = String(value || '').trim().replace(/\s+/g, ' ');
    if (!v) return kind === 'first' ? 'Введите имя' : '';
    const letters = v.replace(/[^\p{L}]/gu, '').length;
    if (letters < 2 || v.length > 40 || !NAME_PATTERN.test(v)) {
        return (kind === 'first' ? 'Имя' : 'Фамилия') + ' должно состоять только из букв (без цифр и других символов), минимум 2 буквы'.replace('должно', kind === 'first' ? 'должно' : 'должна');
    }
    return '';
}

const DB = {
    async createUser({ email, password, firstName, lastName, phone }) {
        const nameError = validateName(firstName, 'first') || validateName(lastName, 'last');
        if (nameError) throw new Error(nameError);
        const exists = await dbFindUserByEmail(email);
        if (exists) throw new Error('Email уже используется');
        const hashedPassword = await hashPassword(password);
        return dbAdd('users', {
            email: String(email).trim().toLowerCase(),
            password: hashedPassword,
            firstName: normalizeName(firstName),
            lastName: normalizeName(lastName),
            phone: phone || '',
            address: '',
            role: 'USER',
            createdAt: new Date().toISOString()
        });
    },
    async loginUser(email, password) {
        const user = await dbFindUserByEmail(email);
        if (!user) throw new Error('Пользователь не найден');
        const hash = await hashPassword(password);
        if (user.password !== hash) throw new Error('Неверный пароль');
        return user;
    },
    async getUser(id) { return dbGet('users', id); },
    async updateUser(id, updates) {
        const user = await dbGet('users', id);
        if (!user) throw new Error('Пользователь не найден');
        if ('firstName' in updates) {
            const err = validateName(updates.firstName, 'first');
            if (err) throw new Error(err);
            updates.firstName = normalizeName(updates.firstName);
        }
        if ('lastName' in updates) {
            const err = validateName(updates.lastName, 'last');
            if (err) throw new Error(err);
            updates.lastName = normalizeName(updates.lastName);
        }
        Object.assign(user, updates);
        return dbPut('users', user);
    },
    async changePassword(id, currentPassword, newPassword) {
        const user = await dbGet('users', id);
        if (!user) throw new Error('Пользователь не найден');
        if (user.password !== await hashPassword(currentPassword)) throw new Error('Текущий пароль указан неверно');
        if (String(newPassword).length < 6) throw new Error('Новый пароль должен быть не менее 6 символов');
        user.password = await hashPassword(newPassword);
        return dbPut('users', user);
    },
    async resetPassword(id, newPassword) {
        const user = await dbGet('users', id);
        if (!user) throw new Error('Пользователь не найден');
        if (String(newPassword).length < 6) throw new Error('Пароль должен быть не менее 6 символов');
        user.password = await hashPassword(newPassword);
        return dbPut('users', user);
    },
    async setSession(user) {
        return dbPut('session', {
            key: 'currentUser',
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            role: user.role,
            loginAt: new Date().toISOString()
        });
    },
    async getSession() { return dbGet('session', 'currentUser'); },
    async clearSession() { return dbDelete('session', 'currentUser'); },

    async addToCart(userId, productId, productData, quantity = 1) {
        const items = await dbGetByIndex('cart', 'userId', userId);
        const existing = items.find(i => i.productId === productId);
        if (existing) {
            existing.quantity += quantity;
            return dbPut('cart', existing);
        }
        return dbAdd('cart', {
            userId, productId,
            title: productData.title,
            price: productData.price,
            imageUrl: productData.imageUrl || '',
            quantity
        });
    },
    async getCart(userId) { return dbGetByIndex('cart', 'userId', userId); },
    async removeFromCart(id) { return dbDelete('cart', id); },
    async clearCart(userId) {
        const items = await dbGetByIndex('cart', 'userId', userId);
        for (const i of items) await dbDelete('cart', i.id);
    },
    async createOrder(userId, address) {
        const cart = await this.getCart(userId);
        if (cart.length === 0) throw new Error('Корзина пуста');
        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const orderId = await dbAdd('orders', {
            userId,
            items: cart.map(i => ({ productId: i.productId, title: i.title, price: i.price, quantity: i.quantity })),
            total, address, status: 'NEW',
            createdAt: new Date().toISOString()
        });
        await this.clearCart(userId);
        return orderId;
    },
    async getOrders(userId) {
        const orders = await dbGetByIndex('orders', 'userId', userId);
        return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
};

openDB().then(() => console.log('%c✅ БД готова', 'color:#C5A059;font-weight:bold;'));