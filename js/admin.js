/* =========================================================
   АДМИН-ПАНЕЛЬ (ПОЛНЫЙ КОНТРОЛЬ)
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    const session = await DB.getSession();
    if (!session || session.role !== 'ADMIN') {
        alert('Доступ запрещён. Войдите как администратор.');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('adminWelcome').textContent = `Здравствуйте, ${session.firstName || 'Админ'}!`;

    document.getElementById('logoutAdmin').addEventListener('click', async () => {
        await DB.clearSession();
        localStorage.removeItem('abode_session');
        window.location.href = 'index.html';
    });

    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-content').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

    renderOrders();
    renderReviews();
    renderQuestions();
    renderProducts();
    renderUsers(); // <--- ДОБАВЛЕНО
    renderContentEditor();

    // Обработка формы добавления товара
    const imageInput = document.getElementById('productImageInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = imagePreview ? imagePreview.querySelector('img') : null;

    if (imageInput && previewImg) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                compressImage(event.target.result, 800, 800, 0.7, (compressed) => {
                    previewImg.src = compressed;
                    imagePreview.style.display = 'block';
                });
            };
            reader.readAsDataURL(file);
        });
    }

    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            
            const title = form.title.value.trim();
            const price = parseInt(form.price.value);
            const category = form.category.value;
            const desc = form.desc.value.trim();
            const imageUrl = form.imageUrl.value.trim();

            if (!title || !price) { alert('Заполните название и цену'); return; }

            const finalImage = (imageUrl) ? imageUrl : (previewImg && previewImg.src ? previewImg.src : 'img/placeholder.jpg');

            const custom = JSON.parse(localStorage.getItem('abode_custom_products') || '[]');
            const newId = 100 + custom.length + 1;

            custom.push({ 
                id: newId, 
                title: title, 
                price: price, 
                category: category,
                desc: desc || 'Описание товара отсутствует.',
                img: finalImage
            });

            localStorage.setItem('abode_custom_products', JSON.stringify(custom));
            
            form.reset();
            if (imagePreview) imagePreview.style.display = 'none';
            if (previewImg) previewImg.src = '';
            
            closeProductModal();
            renderProducts();
            if (typeof showToast === 'function') showToast('Товар добавлен');
        });
    }
});

/* ============ ФУНКЦИЯ СЖАТИЯ КАРТИНКИ ============ */
function compressImage(base64Str, maxWidth, maxHeight, quality, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        callback(canvas.toDataURL('image/jpeg', quality));
    };
}

/* ============ ОТКРЫТИЕ / ЗАКРЫТИЕ МОДАЛКИ ============ */
function openProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        const form = document.getElementById('productForm');
        if (form) form.reset();
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.style.display = 'none';
            preview.querySelector('img').src = '';
        }
    }
}

/* ============ ПОЛЬЗОВАТЕЛИ (НОВОЕ) ============ */
async function renderUsers() {
    const box = document.getElementById('adminUsers');
    if (!box) return;

    // Получаем всех пользователей из IndexedDB
    const db = await openDB();
    const tx = db.transaction('users', 'readonly');
    const req = tx.objectStore('users').getAll();

    req.onsuccess = () => {
        const users = req.result || [];
        if (users.length === 0) {
            box.innerHTML = '<p style="color:var(--text-light);">Пока нет пользователей</p>';
            return;
        }

        box.innerHTML = users.map(u => `
            <div class="admin-card">
                <div class="admin-card-info">
                    <strong>${escHtml(u.firstName)} ${escHtml(u.lastName)}</strong>
                    ${u.phone ? `<div style="font-size:13px; color:var(--text-light); margin-top:2px;">Тел.: ${escHtml(u.phone)}</div>` : ''}
                    ${u.address ? `<div style="font-size:13px; color:var(--text-light);">Адрес: ${escHtml(u.address)}</div>` : ''}
                    <div style="font-size:14px; color:var(--text-light);">${escHtml(u.email)}</div>
                    <div style="font-size:13px; color:var(--text-light); margin-top:4px;">Роль: ${u.role === 'ADMIN' ? '<b style="color:var(--gold)">Администратор</b>' : 'Клиент'}</div>
                    <div style="font-size:13px; color:var(--text-light);">Дата рег.: ${new Date(u.createdAt).toLocaleString('ru-RU')}</div>
                    <div style="margin-top:5px;">
                        Статус: ${u.blocked ? '<span style="color:red; font-weight:bold;">Заблокирован</span>' : '<span style="color:green; font-weight:bold;">Активен</span>'}
                    </div>
                </div>
                <div class="admin-actions">
                    <button class="btn-sm btn-gold btn-edit-user" data-id="${u.id}">Редактировать</button>
                    ${u.role === 'ADMIN' ? '' : `
                        <button class="btn-sm ${u.blocked ? 'btn-gold' : 'btn-danger'} btn-toggle-block" data-id="${u.id}" data-blocked="${u.blocked}">
                            ${u.blocked ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                        <button class="btn-sm btn-danger btn-delete-user" data-id="${u.id}">Удалить</button>
                    `}
                </div>
            </div>
        `).join('');

        // Обработчики кнопок
        box.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.addEventListener('click', () => openUserModal(parseInt(btn.dataset.id)));
        });

        box.querySelectorAll('.btn-toggle-block').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                const isBlocked = btn.dataset.blocked === 'true';
                await DB.updateUser(id, { blocked: !isBlocked });
                renderUsers();
                if (typeof showToast === 'function') showToast(isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован');
            });
        });

        box.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Удалить пользователя навсегда?')) return;
                const id = parseInt(btn.dataset.id);
                await dbDelete('users', id);
                renderUsers();
                if (typeof showToast === 'function') showToast('Пользователь удалён');
            });
        });
    };
}

/* ============ ЗАКАЗЫ ============ */
async function renderOrders() {
    const box = document.getElementById('adminOrders');
    const orders = JSON.parse(localStorage.getItem('abode_orders') || '[]');

    if (orders.length === 0) {
        box.innerHTML = '<p style="color:var(--text-light);">Пока нет заказов</p>';
        return;
    }

    box.innerHTML = orders.map((o, idx) => `
        <div class="admin-card">
            <div class="admin-card-info">
                <div style="font-weight:700; font-size:16px;">Заказ №${o.id}</div>
                <div style="font-size:13px; color:var(--text-light); margin-top:4px;">${new Date(o.createdAt).toLocaleString('ru-RU')}</div>
                <div style="margin-top:8px; font-size:14px;"><strong>Клиент:</strong> ${o.userEmail || 'Гость'}</div>
                <div style="font-size:14px;"><strong>Адрес:</strong> ${o.address || 'не указан'}</div>
                <div style="font-size:14px;"><strong>Телефон:</strong> ${o.phone || 'не указан'}</div>
                <div style="margin-top:8px; font-size:14px;">
                    <strong>Товары:</strong>
                    <ul style="margin:5px 0 0 15px; padding:0;">
                        ${o.items.map(i => `<li>${i.title} × ${i.quantity} = ${i.price * i.quantity} ₽</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:20px; color:var(--gold); font-weight:700; margin-bottom:10px;">${o.total} ₽</div>
                <div class="admin-actions">
                    <select class="order-status admin-form-control" data-idx="${idx}" style="padding:5px 10px; font-size:13px; width:auto;">
                        <option value="NEW" ${o.status === 'NEW' ? 'selected' : ''}>Новый</option>
                        <option value="PROCESSING" ${o.status === 'PROCESSING' ? 'selected' : ''}>В обработке</option>
                        <option value="SHIPPED" ${o.status === 'SHIPPED' ? 'selected' : ''}>Отправлен</option>
                        <option value="DELIVERED" ${o.status === 'DELIVERED' ? 'selected' : ''}>Доставлен</option>
                        <option value="CANCELLED" ${o.status === 'CANCELLED' ? 'selected' : ''}>Отменён</option>
                    </select>
                    <button class="btn-sm btn-danger btn-delete-order" data-idx="${idx}">Удалить</button>
                </div>
            </div>
        </div>
    `).join('');

    box.querySelectorAll('.order-status').forEach(sel => {
        sel.addEventListener('change', () => {
            const orders = JSON.parse(localStorage.getItem('abode_orders') || '[]');
            orders[sel.dataset.idx].status = sel.value;
            localStorage.setItem('abode_orders', JSON.stringify(orders));
            if (typeof showToast === 'function') showToast('Статус обновлён');
        });
    });

    box.querySelectorAll('.btn-delete-order').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm('Удалить заказ?')) return;
            const orders = JSON.parse(localStorage.getItem('abode_orders') || '[]');
            orders.splice(btn.dataset.idx, 1);
            localStorage.setItem('abode_orders', JSON.stringify(orders));
            renderOrders();
        });
    });
}

/* ============ ОТЗЫВЫ ============ */
function renderReviews() {
    const box = document.getElementById('adminReviews');
    const reviews = JSON.parse(localStorage.getItem('abode_reviews') || '[]');

    if (reviews.length === 0) {
        box.innerHTML = '<p style="color:var(--text-light);">Пока нет отзывов</p>';
        return;
    }

    box.innerHTML = reviews.map((r, idx) => `
        <div class="admin-card" style="flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                <div><strong>${r.name}</strong> <span style="color:var(--text-light); font-size:13px;">· ${r.date}</span></div>
                <div style="color:var(--gold); font-size:18px;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
            </div>
            <p style="margin:10px 0; font-size:14px;">${r.text}</p>
            <div class="admin-form-group">
                <label>Ответ:</label>
                <textarea class="admin-form-control review-reply" data-idx="${idx}" style="min-height:60px;">${r.reply || ''}</textarea>
            </div>
            <div class="admin-actions">
                <button class="btn-sm btn-gold btn-save-reply" data-idx="${idx}">Сохранить ответ</button>
                <button class="btn-sm btn-danger btn-delete-review" data-idx="${idx}">Удалить отзыв</button>
            </div>
        </div>
    `).join('');

    box.querySelectorAll('.btn-save-reply').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = btn.dataset.idx;
            const textarea = box.querySelector(`.review-reply[data-idx="${idx}"]`);
            const reviews = JSON.parse(localStorage.getItem('abode_reviews') || '[]');
            reviews[idx].reply = textarea.value.trim();
            localStorage.setItem('abode_reviews', JSON.stringify(reviews));
            if (typeof showToast === 'function') showToast('Ответ сохранён');
        });
    });

    box.querySelectorAll('.btn-delete-review').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm('Удалить отзыв?')) return;
            const reviews = JSON.parse(localStorage.getItem('abode_reviews') || '[]');
            reviews.splice(btn.dataset.idx, 1);
            localStorage.setItem('abode_reviews', JSON.stringify(reviews));
            renderReviews();
        });
    });
}

/* ============ ВОПРОСЫ ============ */
function renderQuestions() {
    const box = document.getElementById('adminQuestions');
    const questions = JSON.parse(localStorage.getItem('abode_questions') || '[]');

    if (questions.length === 0) {
        box.innerHTML = '<p style="color:var(--text-light);">Пока нет вопросов</p>';
        return;
    }

    box.innerHTML = questions.map((q, idx) => `
        <div class="admin-card" style="flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                <div><strong>${q.name}</strong> <span style="color:var(--text-light); font-size:13px;">· ${q.email}</span></div>
                <span style="color:var(--text-light); font-size:13px;">${q.date}</span>
            </div>
            <p style="margin:10px 0; font-size:14px;">${q.message}</p>
            <div class="admin-form-group">
                <label>Ответ:</label>
                <textarea class="admin-form-control question-reply" data-idx="${idx}" style="min-height:60px;">${q.reply || ''}</textarea>
            </div>
            <div class="admin-actions">
                <button class="btn-sm btn-gold btn-save-question" data-idx="${idx}">Сохранить ответ</button>
                <button class="btn-sm btn-danger btn-delete-question" data-idx="${idx}">Удалить вопрос</button>
            </div>
        </div>
    `).join('');

    box.querySelectorAll('.btn-save-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = btn.dataset.idx;
            const textarea = box.querySelector(`.question-reply[data-idx="${idx}"]`);
            const questions = JSON.parse(localStorage.getItem('abode_questions') || '[]');
            questions[idx].reply = textarea.value.trim();
            localStorage.setItem('abode_questions', JSON.stringify(questions));
            if (typeof showToast === 'function') showToast('Ответ сохранён');
        });
    });

    box.querySelectorAll('.btn-delete-question').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm('Удалить вопрос?')) return;
            const questions = JSON.parse(localStorage.getItem('abode_questions') || '[]');
            questions.splice(btn.dataset.idx, 1);
            localStorage.setItem('abode_questions', JSON.stringify(questions));
            renderQuestions();
        });
    });
}

/* ============ ТОВАРЫ ============ */
function renderProducts() {
    const box = document.getElementById('adminProducts');
    const hidden = JSON.parse(localStorage.getItem('abode_hidden_products') || '[]');
    const allProducts = getAllProducts();
    const prevScope = (document.getElementById('reportScope') || {}).value || 'all';

    box.innerHTML = `
        <div style="margin-bottom:20px; display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
            <button onclick="openProductModal()" class="btn-sm btn-gold" style="font-size:14px; padding:10px 24px;">+ Добавить товар</button>
        </div>
        <div style="background:var(--beige); border:1px solid var(--border); border-radius:12px; padding:16px 20px; margin-bottom:20px; display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <strong style="font-size:14px;">Отчёт для печати:</strong>
            <select id="reportScope" class="admin-form-control" style="width:auto; padding:8px 12px; font-size:13px;">
                <option value="all" ${prevScope === 'all' ? 'selected' : ''}>Все товары</option>
                <option value="visible" ${prevScope === 'visible' ? 'selected' : ''}>Только показываемые на сайте</option>
            </select>
            <button type="button" id="btnReportWord" class="btn-sm btn-gold">Скачать Word (.docx)</button>
            <button type="button" id="btnReportExcel" class="btn-sm btn-outline">Скачать Excel (.xlsx)</button>
        </div>
        ${allProducts.map(p => `
            <div class="admin-card">
                <div class="admin-card-info">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <img src="${p.img || 'img/placeholder.jpg'}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; background:#eee;">
                        <div>
                            <strong>№${p.id} — ${p.title}</strong>
                            <div style="font-size:14px; color:var(--gold); font-weight:600;">${p.price.toLocaleString('ru-RU')} ₽ <span style="color:var(--text-light); font-weight:400; font-size:12px;">· ${p.categoryName}</span></div>
                        </div>
                    </div>
                </div>
                <div class="admin-actions">
                    <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
                        <input type="checkbox" class="product-visible" data-id="${p.id}" ${hidden.includes(p.id) ? '' : 'checked'}>
                        Показывать
                    </label>
                    ${p.id > 100 ? `<button class="btn-sm btn-danger btn-delete-product" data-id="${p.id}">Удалить</button>` : ''}
                </div>
            </div>
        `).join('')}
    `;

    document.getElementById('btnReportWord').addEventListener('click', () => exportProductsWord().catch(err => alert('Не удалось создать Word-файл: ' + err.message)));
    document.getElementById('btnReportExcel').addEventListener('click', () => {
        try { exportProductsExcel(); } catch (err) { alert('Не удалось создать Excel-файл: ' + err.message); }
    });

    box.querySelectorAll('.btn-delete-product').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm('Удалить этот товар?')) return;
            const id = parseInt(btn.dataset.id);
            let custom = JSON.parse(localStorage.getItem('abode_custom_products') || '[]');
            custom = custom.filter(p => p.id !== id);
            localStorage.setItem('abode_custom_products', JSON.stringify(custom));
            renderProducts();
            if (typeof showToast === 'function') showToast('Товар удалён');
        });
    });

    box.querySelectorAll('.product-visible').forEach(cb => {
        cb.addEventListener('change', () => {
            const id = parseInt(cb.dataset.id);
            let hiddenList = JSON.parse(localStorage.getItem('abode_hidden_products') || '[]');
            if (cb.checked) {
                hiddenList = hiddenList.filter(x => x !== id);
            } else {
                if (!hiddenList.includes(id)) hiddenList.push(id);
            }
            localStorage.setItem('abode_hidden_products', JSON.stringify(hiddenList));
            if (typeof showToast === 'function') showToast('Видимость обновлена');
        });
    });
}

/* ============ КОНТЕНТ САЙТА ============ */
function renderContentEditor() {
    const box = document.getElementById('adminContent');
    if (!box) return;

    const defaultContent = {
        hero_title: 'Духовные традиции и культура в каждом сувенире',
        hero_subtitle: 'Республика Калмыкия',
        hero_text: 'Интернет-магазин «Золотая обитель» — это уникальные товары буддийской культуры и этнические сувениры из Республики Калмыкия',
        about_title: 'Мы создаём пространство, где древняя мудрость встречается с современностью',
        about_text: 'Наша цель — сохранять традиции, популяризировать духовное наследие и делать его доступным для каждого.',
        quote_text: '«Буддийская мудрость — это не только учение, но и образ жизни. Мы верим, что каждый человек может найти в себе источник спокойствия и силы.»',
        contacts_phone: '+7 (999) 123-45-67',
        contacts_email: 'info@golden-abode.ru',
        contacts_address: 'г. Элиста, Республика Калмыкия, ул. Ленина, 12',
        delivery_text: 'Быстро, надёжно, в любую точку России',
        footer_title: 'Золотая обитель',
        footer_subtitle: 'Товары буддийской культуры и этнические сувениры'
    };

    const content = { ...defaultContent, ...(JSON.parse(localStorage.getItem('abode_content') || '{}')) };

    const fields = [
        { key: 'hero_subtitle', label: 'Главная: подзаголовок' },
        { key: 'hero_title', label: 'Главная: заголовок' },
        { key: 'hero_text', label: 'Главная: описание', textarea: true },
        { key: 'about_title', label: 'О нас: заголовок миссии' },
        { key: 'about_text', label: 'О нас: текст миссии', textarea: true },
        { key: 'quote_text', label: 'О нас: цитата', textarea: true },
        { key: 'delivery_text', label: 'Доставка: подзаголовок' },
        { key: 'contacts_phone', label: 'Контакты: телефон' },
        { key: 'contacts_email', label: 'Контакты: e-mail' },
        { key: 'contacts_address', label: 'Контакты: адрес' },
        { key: 'footer_title', label: 'Футер: название магазина' },
        { key: 'footer_subtitle', label: 'Футер: подзаголовок' }
    ];

    box.innerHTML = `
        <div style="background:var(--beige);padding:24px;border-radius:12px;">
            <form id="contentForm">
                ${fields.map(f => `
                    <div class="admin-form-group">
                        <label>${f.label}</label>
                        ${f.textarea
                            ? `<textarea name="${f.key}" class="admin-form-control" style="min-height:80px;">${content[f.key] || ''}</textarea>`
                            : `<input type="text" name="${f.key}" class="admin-form-control" value="${(content[f.key] || '').replace(/"/g, '&quot;')}">`
                        }
                    </div>
                `).join('')}
                <div class="admin-actions" style="margin-top:20px;">
                    <button type="submit" class="btn-sm btn-gold">Сохранить изменения</button>
                    <button type="button" id="resetContentBtn" class="btn-sm btn-outline">Сбросить всё</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('contentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const newContent = {};
        fields.forEach(f => {
            const el = form.querySelector(`[name="${f.key}"]`);
            if (el) newContent[f.key] = el.value.trim();
        });
        localStorage.setItem('abode_content', JSON.stringify(newContent));
        if (typeof showToast === 'function') showToast('Контент сохранён');
    });

    document.getElementById('resetContentBtn').addEventListener('click', () => {
        if (!confirm('Сбросить весь контент к стандартному?')) return;
        localStorage.removeItem('abode_content');
        renderContentEditor();
        if (typeof showToast === 'function') showToast('Контент сброшен');
    });
}

/* ============ РЕДАКТИРОВАНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ ============ */
function escHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

async function openUserModal(id) {
    const user = await DB.getUser(id);
    if (!user) { alert('Пользователь не найден'); return; }
    const session = await DB.getSession();
    const form = document.getElementById('userForm');
    form.dataset.id = id;
    form.firstName.value = user.firstName || '';
    form.lastName.value = user.lastName || '';
    form.email.value = user.email || '';
    form.phone.value = user.phone || '';
    form.address.value = user.address || '';
    form.role.value = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
    // свою роль менять нельзя, чтобы не лишить себя доступа
    form.role.disabled = !!(session && session.userId === id);
    document.getElementById('userRoleHint').style.display = form.role.disabled ? 'block' : 'none';
    form.newPassword.value = '';
    document.getElementById('userFormError').textContent = '';
    document.getElementById('userModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('userForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = document.getElementById('userFormError');
        errBox.textContent = '';
        const id = parseInt(form.dataset.id);
        const email = form.email.value.trim().toLowerCase();
        const newPassword = form.newPassword.value;

        try {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Укажите корректный e-mail');
            const other = await dbFindUserByEmail(email);
            if (other && other.id !== id) throw new Error('Этот e-mail уже используется другим пользователем');
            if (newPassword && newPassword.length < 6) throw new Error('Новый пароль должен быть не менее 6 символов');

            const updates = {
                firstName: form.firstName.value,
                lastName: form.lastName.value,
                email,
                phone: form.phone.value.trim(),
                address: form.address.value.trim()
            };
            if (!form.role.disabled) updates.role = form.role.value;

            await DB.updateUser(id, updates);
            if (newPassword) await DB.resetPassword(id, newPassword);

            // если админ правил сам себя — обновляем сессию
            const session = await DB.getSession();
            if (session && session.userId === id) {
                await DB.setSession(await DB.getUser(id));
            }
        } catch (err) {
            errBox.textContent = err.message;
            return;
        }
        closeUserModal();
        renderUsers();
        if (typeof showToast === 'function') showToast('Профиль пользователя сохранён');
    });
});
