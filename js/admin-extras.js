/* =========================================================
   ДОПОЛНЕНИЯ АДМИНКИ (отдельный файл, остальной код не затронут)
   1) Вкладка «Обзор»: статистика, выручка за 7 дней, топ товаров
   2) Поиск по пользователям
   3) Вкладка «Резервная копия»: сохранить / восстановить данные сайта
   ========================================================= */
(function () {
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rub = n => Math.round(n).toLocaleString('ru-RU') + ' ₽';
    const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } };

    const STATUS = {
        NEW: ['Новые', '#C5A059'], PROCESSING: ['В обработке', '#6f8fb5'], SHIPPED: ['Отправлены', '#8a7bb5'],
        DELIVERED: ['Доставлены', '#5a9a6b'], CANCELLED: ['Отменены', '#b05a5a']
    };

    function addTab(key, label, first) {
        const tabs = document.querySelector('.admin-tabs');
        const host = document.querySelector('#tab-content').parentNode;
        const btn = document.createElement('button');
        btn.className = 'admin-tab'; btn.dataset.tab = key; btn.textContent = label;
        first ? tabs.prepend(btn) : tabs.appendChild(btn);
        const pane = document.createElement('div');
        pane.id = 'tab-' + key; pane.className = 'admin-content';
        host.appendChild(pane);
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-content').forEach(t => t.classList.remove('active'));
            pane.classList.add('active');
            if (key === 'overview') renderOverview();
        });
        return pane;
    }

    /* ---------- 1. ОБЗОР ---------- */
    async function userCount() {
        try {
            const db = await openDB();
            return await new Promise(res => {
                const r = db.transaction('users', 'readonly').objectStore('users').count();
                r.onsuccess = () => res(r.result); r.onerror = () => res(0);
            });
        } catch (e) { return 0; }
    }

    async function renderOverview() {
        const box = document.getElementById('tab-overview');
        const orders = ls('abode_orders', '[]');
        const valid = orders.filter(o => o.status !== 'CANCELLED');
        const revenue = valid.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const avg = valid.length ? revenue / valid.length : 0;
        const reviews = ls('abode_reviews', '[]');
        const questions = ls('abode_questions', '[]');
        const unanswered = questions.filter(q => !q.reply).length + reviews.filter(r => !r.reply).length;
        const users = await userCount();
        const products = typeof getAllProducts === 'function' ? getAllProducts() : [];
        const shown = products.filter(p => p.visible).length;

        // выручка за 7 дней
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
            days.push({ d, sum: 0 });
        }
        valid.forEach(o => {
            const t = new Date(o.createdAt); t.setHours(0, 0, 0, 0);
            const slot = days.find(x => x.d.getTime() === t.getTime());
            if (slot) slot.sum += Number(o.total) || 0;
        });
        const maxSum = Math.max(1, ...days.map(x => x.sum));

        // топ товаров
        const top = {};
        valid.forEach(o => (o.items || []).forEach(i => {
            const k = i.title; top[k] = top[k] || { qty: 0, sum: 0 };
            top[k].qty += Number(i.quantity) || 0; top[k].sum += (Number(i.price) || 0) * (Number(i.quantity) || 0);
        }));
        const topList = Object.entries(top).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
        const topMax = topList.length ? topList[0][1].qty : 1;

        // статусы
        const byStatus = {};
        orders.forEach(o => byStatus[o.status || 'NEW'] = (byStatus[o.status || 'NEW'] || 0) + 1);

        const card = (label, val, sub) => `
            <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:18px 20px;">
                <div style="font-size:12px;color:var(--text-light);text-transform:uppercase;letter-spacing:.5px;">${label}</div>
                <div style="font-size:26px;font-weight:700;color:var(--gold);margin-top:6px;">${val}</div>
                ${sub ? `<div style="font-size:12px;color:var(--text-light);margin-top:2px;">${sub}</div>` : ''}
            </div>`;
        const panel = (title, body) => `
            <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:20px;">
                <div style="font-weight:700;margin-bottom:14px;">${title}</div>${body}
            </div>`;
        const empty = '<p style="color:var(--text-light);font-size:14px;margin:0;">Пока нет данных</p>';

        box.innerHTML = `
            <h2 style="font-family:var(--font-accent);font-size:24px;margin-bottom:20px;">Обзор магазина</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:20px;">
                ${card('Выручка', rub(revenue), 'без отменённых заказов')}
                ${card('Заказов', orders.length, `новых: ${byStatus.NEW || 0}`)}
                ${card('Средний чек', rub(avg))}
                ${card('Пользователей', users)}
                ${card('Ждут ответа', unanswered, 'отзывы и вопросы')}
                ${card('Товаров на сайте', `${shown} из ${products.length}`)}
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;">
                ${panel('Выручка за 7 дней', `
                    <div style="display:flex;align-items:flex-end;gap:8px;height:150px;">
                        ${days.map(x => `
                            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;" title="${rub(x.sum)}">
                                <div style="font-size:10px;color:var(--text-light);margin-bottom:3px;">${x.sum ? Math.round(x.sum / 1000 * 10) / 10 + 'к' : ''}</div>
                                <div style="width:100%;max-width:34px;background:var(--gold);border-radius:4px 4px 0 0;height:${Math.max(x.sum ? 4 : 2, x.sum / maxSum * 110)}px;opacity:${x.sum ? 1 : .25};"></div>
                                <div style="font-size:11px;color:var(--text-light);margin-top:5px;">${x.d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</div>
                            </div>`).join('')}
                    </div>`)}
                ${panel('Топ-5 товаров', topList.length ? topList.map(([t, v]) => `
                    <div style="margin-bottom:11px;">
                        <div style="display:flex;justify-content:space-between;font-size:13px;gap:10px;"><span>${esc(t)}</span><b style="white-space:nowrap;">${v.qty} шт.</b></div>
                        <div style="height:6px;background:var(--beige);border-radius:3px;margin-top:4px;"><div style="height:100%;width:${v.qty / topMax * 100}%;background:var(--gold);border-radius:3px;"></div></div>
                    </div>`).join('') : empty)}
                ${panel('Заказы по статусам', orders.length ? Object.entries(STATUS).map(([k, [name, color]]) => {
                    const c = byStatus[k] || 0;
                    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:13px;">
                        <span style="width:110px;">${name}</span>
                        <div style="flex:1;height:8px;background:var(--beige);border-radius:4px;"><div style="height:100%;width:${c / orders.length * 100}%;background:${color};border-radius:4px;"></div></div>
                        <b style="width:24px;text-align:right;">${c}</b></div>`;
                }).join('') : empty)}
            </div>`;
    }

    /* ---------- 2. ПОИСК ПО ПОЛЬЗОВАТЕЛЯМ ---------- */
    function setupUserSearch() {
        const list = document.getElementById('adminUsers');
        if (!list) return;
        const inp = document.createElement('input');
        inp.type = 'search'; inp.className = 'admin-form-control';
        inp.placeholder = 'Поиск по имени, e-mail или телефону…';
        inp.style.cssText = 'margin-bottom:16px;max-width:420px;';
        list.parentNode.insertBefore(inp, list);
        const info = document.createElement('div');
        info.style.cssText = 'font-size:13px;color:var(--text-light);margin:-6px 0 14px;';
        list.parentNode.insertBefore(info, list);

        let busy = false;
        const apply = () => {
            busy = true;
            const q = inp.value.trim().toLowerCase();
            const cards = list.querySelectorAll('.admin-card');
            let shown = 0;
            cards.forEach(c => {
                const ok = !q || c.textContent.toLowerCase().includes(q);
                c.style.display = ok ? '' : 'none';
                if (ok) shown++;
            });
            info.textContent = q && cards.length ? (shown ? `Найдено: ${shown} из ${cards.length}` : 'Никого не найдено') : '';
            busy = false;
        };
        inp.addEventListener('input', apply);
        new MutationObserver(() => { if (!busy) apply(); }).observe(list, { childList: true });
    }

    /* ---------- 3. РЕЗЕРВНАЯ КОПИЯ ---------- */
    async function exportBackup() {
        const data = { app: 'golden-abode', version: 1, createdAt: new Date().toISOString(), storage: {}, users: [] };
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith('abode_') && k !== 'abode_session') data.storage[k] = localStorage.getItem(k);
        }
        const db = await openDB();
        data.users = await new Promise(res => {
            const r = db.transaction('users', 'readonly').objectStore('users').getAll();
            r.onsuccess = () => res(r.result || []); r.onerror = () => res([]);
        });
        const d = new Date(), p = n => String(n).padStart(2, '0');
        const name = `backup_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
        const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        if (typeof showToast === 'function') showToast('Резервная копия сохранена');
    }

    async function importBackup(file) {
        let data;
        try { data = JSON.parse(await file.text()); } catch (e) { alert('Не удалось прочитать файл: это не резервная копия.'); return; }
        if (!data || data.app !== 'golden-abode' || !data.storage || !Array.isArray(data.users)) {
            alert('Файл не похож на резервную копию сайта «Золотая обитель».'); return;
        }
        if (!confirm(`Восстановить данные из копии от ${new Date(data.createdAt).toLocaleString('ru-RU')}?\n\nТекущие заказы, отзывы, товары, контент и пользователи будут заменены данными из файла.`)) return;
        const session = await DB.getSession();
        Object.keys(localStorage).filter(k => k.startsWith('abode_') && k !== 'abode_session' && k !== 'abode_admin_created')
            .forEach(k => localStorage.removeItem(k));
        Object.entries(data.storage).forEach(([k, v]) => { if (k.startsWith('abode_')) localStorage.setItem(k, v); });
        localStorage.setItem('abode_admin_created', '1');
        const db = await openDB();
        await new Promise((res, rej) => { const r = db.transaction('users', 'readwrite').objectStore('users').clear(); r.onsuccess = res; r.onerror = rej; });
        for (const u of data.users) await dbPut('users', u);
        // чтобы не потерять доступ: если текущего админа нет в копии — вернуть его
        if (session && !data.users.some(u => u.id === session.userId)) {
            alert('Данные восстановлены. Вашей учётной записи нет в копии, поэтому нужно войти заново.');
            await DB.clearSession(); location.href = 'login.html'; return;
        }
        alert('Данные восстановлены. Страница будет перезагружена.');
        location.reload();
    }

    function renderBackup(pane) {
        pane.innerHTML = `
            <h2 style="font-family:var(--font-accent);font-size:24px;margin-bottom:8px;">Резервная копия</h2>
            <p style="color:var(--text-light);font-size:14px;margin-bottom:20px;max-width:620px;">
                Данные сайта хранятся в браузере. Сохраните копию в файл, чтобы не потерять заказы, отзывы, товары, тексты и пользователей, или перенести сайт на другой компьютер.</p>
            <div style="display:flex;gap:14px;flex-wrap:wrap;">
                <div class="admin-card" style="flex-direction:column;align-items:flex-start;flex:1;min-width:260px;">
                    <strong>Сохранить копию</strong>
                    <div style="font-size:13px;color:var(--text-light);">Файл .json со всеми данными. Пароли пользователей в нём хранятся в зашифрованном виде, но файл лучше не передавать посторонним.</div>
                    <button type="button" id="btnBackupSave" class="btn-sm btn-gold">Скачать копию</button>
                </div>
                <div class="admin-card" style="flex-direction:column;align-items:flex-start;flex:1;min-width:260px;">
                    <strong>Восстановить из копии</strong>
                    <div style="font-size:13px;color:var(--text-light);">Текущие данные будут заменены данными из файла.</div>
                    <input type="file" id="backupFile" accept="application/json,.json" style="font-size:13px;">
                </div>
            </div>`;
        document.getElementById('btnBackupSave').addEventListener('click', () => exportBackup().catch(e => alert('Ошибка: ' + e.message)));
        document.getElementById('backupFile').addEventListener('change', e => {
            const f = e.target.files[0]; if (f) importBackup(f).catch(err => alert('Ошибка: ' + err.message));
            e.target.value = '';
        });
    }


    /* ---------- 4. ПОЧТА (восстановление пароля) ---------- */
    const MAIL_TEMPLATE = 'Здравствуйте, {{to_name}}!\n\nВы запросили восстановление пароля на сайте «{{site_name}}».\nЧтобы задать новый пароль, перейдите по ссылке (действует {{expires_min}} минут):\n{{reset_link}}\n\nЕсли вы ничего не запрашивали, просто проигнорируйте это письмо.';

    function renderMail(pane) {
        const saved = ls('abode_mail_config', '{}');
        const fileCfg = window.MAIL_CONFIG && window.MAIL_CONFIG.serviceId;
        const field = (name, label, ph) => `
            <div class="admin-form-group"><label>${label}</label>
            <input class="admin-form-control" name="${name}" value="${esc(saved[name] || '')}" placeholder="${ph}" autocomplete="off"></div>`;
        const step = (n, html) => `<li style="margin-bottom:8px;">${html}</li>`;
        pane.innerHTML = `
            <h2 style="font-family:var(--font-accent);font-size:24px;margin-bottom:8px;">Почта для восстановления пароля</h2>
            <p id="mailState" style="font-size:14px;margin-bottom:18px;"></p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
                <div style="background:var(--beige);border-radius:12px;padding:20px;">
                    <strong>Подключение за 5 минут (один раз)</strong>
                    <ol style="font-size:13px;line-height:1.5;margin:12px 0 0 18px;padding:0;">
                        ${step(1, 'Зарегистрируйтесь на <b>emailjs.com</b> (бесплатно).')}
                        ${step(2, '<b>Email Services → Add New Service</b> → Gmail или другая почта. Скопируйте <b>Service ID</b>.')}
                        ${step(3, '<b>Email Templates → Create New Template</b>. В поле <b>To Email</b> впишите <code>{{to_email}}</code>, тему и текст возьмите справа. Скопируйте <b>Template ID</b>.')}
                        ${step(4, '<b>Account → General</b> → скопируйте <b>Public Key</b>.')}
                        ${step(5, 'Вставьте три значения в форму ниже, нажмите «Сохранить», затем «Отправить тест».')}
                    </ol>
                </div>
                <div style="background:var(--beige);border-radius:12px;padding:20px;">
                    <strong>Текст письма для шаблона</strong>
                    <div style="font-size:12px;color:var(--text-light);margin:8px 0;">Тема: Восстановление пароля — {{site_name}}</div>
                    <textarea id="mailTpl" class="admin-form-control" readonly style="min-height:150px;font-size:12px;">${esc(MAIL_TEMPLATE)}</textarea>
                    <button type="button" id="btnCopyTpl" class="btn-sm btn-outline" style="margin-top:8px;">Скопировать текст</button>
                </div>
            </div>
            <form id="mailForm" style="margin-top:20px;max-width:520px;">
                ${field('serviceId', 'Service ID', 'service_xxxxxxx')}
                ${field('templateId', 'Template ID', 'template_xxxxxxx')}
                ${field('publicKey', 'Public Key', 'xxxxxxxxxxxxxxxx')}
                <div class="admin-actions">
                    <button type="submit" class="btn-sm btn-gold">Сохранить</button>
                    <button type="button" id="btnMailTest" class="btn-sm btn-outline">Отправить тест на мою почту</button>
                    <button type="button" id="btnMailClear" class="btn-sm btn-danger">Отключить</button>
                </div>
                <div id="mailMsg" style="font-size:13px;margin-top:12px;min-height:18px;"></div>
            </form>`;

        const state = () => {
            const el = document.getElementById('mailState');
            const ok = typeof mailConfigured === 'function' && mailConfigured();
            el.innerHTML = ok
                ? '<span style="color:#2e7d32;font-weight:600;">● Почта подключена:</span> письма со ссылкой для смены пароля уходят на адрес пользователя.'
                : '<span style="color:#b26a00;font-weight:600;">● Почта не подключена:</span> сайт работает в демонстрационном режиме (ссылка показывается на странице, письмо не отправляется).';
            if (fileCfg) el.innerHTML += ' <span style="color:var(--text-light);">Данные также заданы в js/mailer.js.</span>';
        };
        state();

        const form = document.getElementById('mailForm');
        const msg = document.getElementById('mailMsg');
        const say = (t, ok) => { msg.style.color = ok ? '#2e7d32' : '#c62828'; msg.textContent = t; };

        form.addEventListener('submit', e => {
            e.preventDefault();
            const cfg = { serviceId: form.serviceId.value.trim(), templateId: form.templateId.value.trim(), publicKey: form.publicKey.value.trim() };
            if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey) { say('Заполните все три поля', false); return; }
            localStorage.setItem('abode_mail_config', JSON.stringify(cfg));
            say('Сохранено. Нажмите «Отправить тест», чтобы проверить.', true); state();
        });
        document.getElementById('btnMailClear').addEventListener('click', () => {
            localStorage.removeItem('abode_mail_config');
            form.reset(); say('Отключено', true); state();
        });
        document.getElementById('btnCopyTpl').addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(MAIL_TEMPLATE); } catch (e) { document.getElementById('mailTpl').select(); document.execCommand('copy'); }
            if (typeof showToast === 'function') showToast('Текст скопирован');
        });
        document.getElementById('btnMailTest').addEventListener('click', async () => {
            if (!mailConfigured()) { say('Сначала сохраните три значения', false); return; }
            const session = await DB.getSession();
            const me = session && await DB.getUser(session.userId);
            if (!me) { say('Не удалось определить вашу почту', false); return; }
            say('Отправляю на ' + me.email + '…', true);
            try {
                await sendResetEmail({ toEmail: me.email, toName: me.firstName, link: new URL('login.html', location.href).href, minutes: 30 });
                say('Письмо отправлено на ' + me.email + '. Проверьте почту (и папку «Спам»).', true);
            } catch (err) {
                say('Не удалось отправить: ' + String(err.message).slice(0, 160), false);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.querySelector('.admin-tabs')) return;
        addTab('overview', 'Обзор', true);
        renderMail(addTab('mail', 'Почта', false));
        renderBackup(addTab('backup', 'Резервная копия', false));
        setupUserSearch();
    });
})();
