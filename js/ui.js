/* =========================================================
   Кнопка «Показать / Скрыть» у полей пароля
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[type="password"]').forEach(input => {
        const wrap = document.createElement('div');
        wrap.className = 'pw-wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pw-toggle';
        btn.textContent = 'Показать';
        btn.setAttribute('aria-label', 'Показать пароль');
        btn.addEventListener('click', () => {
            const hidden = input.type === 'password';
            input.type = hidden ? 'text' : 'password';
            btn.textContent = hidden ? 'Скрыть' : 'Показать';
            btn.setAttribute('aria-label', hidden ? 'Скрыть пароль' : 'Показать пароль');
        });
        wrap.appendChild(btn);
    });
});
