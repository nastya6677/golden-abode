/* =========================================================
   ВОССТАНОВЛЕНИЕ ПАРОЛЯ
   1) forgot-password.html – запрос ссылки на указанную при регистрации почту
   2) reset-password.html  – установка нового пароля по ссылке из письма
   В браузере хранится только хеш одноразового кода (SHA-256) и срок его действия.
   ========================================================= */
const RESET_KEY = 'abode_password_resets';
const RESET_LAST_KEY = 'abode_password_reset_last';
const RESET_TTL_MS = 30 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;

async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function loadResets() {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(RESET_KEY)) || {}; } catch (e) { all = {}; }
    const now = Date.now();
    Object.keys(all).forEach(k => { if (all[k].expiresAt < now) delete all[k]; });
    return all;
}
function saveResets(all) { localStorage.setItem(RESET_KEY, JSON.stringify(all)); }

async function createResetToken(user) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const all = loadResets();
    Object.keys(all).forEach(k => { if (all[k].userId === user.id) delete all[k]; });
    all[await sha256Hex(token)] = { userId: user.id, email: user.email, expiresAt: Date.now() + RESET_TTL_MS };
    saveResets(all);
    return token;
}

document.addEventListener('DOMContentLoaded', () => {
    /* ---------- Запрос ссылки ---------- */
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        const msg = document.getElementById('recoveryMsg');
        const demo = document.getElementById('recoveryDemo');
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            msg.style.color = 'inherit'; msg.textContent = ''; demo.innerHTML = '';
            const email = forgotForm.querySelector('[name="email"]').value.trim().toLowerCase();
            const last = JSON.parse(localStorage.getItem(RESET_LAST_KEY) || '{}');
            const wait = RESET_COOLDOWN_MS - (Date.now() - (last[email] || 0));
            if (wait > 0) {
                msg.style.color = '#E53935';
                msg.textContent = 'Повторный запрос возможен через ' + Math.ceil(wait / 1000) + ' с.';
                return;
            }
            last[email] = Date.now();
            localStorage.setItem(RESET_LAST_KEY, JSON.stringify(last));
            const generic = 'Если этот адрес зарегистрирован, мы отправили на него письмо со ссылкой для восстановления пароля. Ссылка действует 30 минут.';
            try {
                const user = await dbFindUserByEmail(email);
                if (!user || user.blocked) { msg.textContent = generic; return; }
                const token = await createResetToken(user);
                const link = new URL('reset-password.html', window.location.href).href + '?token=' + token;
                if (mailConfigured()) {
                    await sendResetEmail({ toEmail: user.email, toName: user.firstName, link: link, minutes: 30 });
                    msg.textContent = generic;
                } else {
                    msg.textContent = generic;
                    demo.innerHTML = '<div class="recovery-demo"><strong>Демонстрационный режим.</strong> Почтовый сервис не подключён, поэтому письмо не отправляется. Ссылка, которая пришла бы на почту: <a id="demoResetLink" href="' + link + '">открыть страницу смены пароля</a>.</div>';
                }
            } catch (err) {
                console.error(err);
                msg.style.color = '#E53935';
                msg.textContent = 'Не удалось отправить письмо. Попробуйте позже.';
            }
        });
    }

    /* ---------- Установка нового пароля ---------- */
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        const err = document.getElementById('resetError');
        const invalid = document.getElementById('resetInvalid');
        const done = document.getElementById('resetDone');
        const token = new URLSearchParams(window.location.search).get('token') || '';
        (async () => {
            const record = token ? loadResets()[await sha256Hex(token)] : null;
            if (!record) { resetForm.style.display = 'none'; invalid.style.display = 'block'; return; }
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                err.textContent = '';
                const pass = resetForm.querySelector('[name="password"]').value;
                const repeat = resetForm.querySelector('[name="repeat"]').value;
                if (pass.length < 6) { err.textContent = 'Пароль должен быть не менее 6 символов'; return; }
                if (pass !== repeat) { err.textContent = 'Пароли не совпадают'; return; }
                try {
                    await DB.resetPassword(record.userId, pass);
                    const all = loadResets();
                    Object.keys(all).forEach(k => { if (all[k].userId === record.userId) delete all[k]; });
                    saveResets(all);
                    resetForm.style.display = 'none'; done.style.display = 'block';
                } catch (ex) { err.textContent = ex.message; }
            });
        })();
    }
});
