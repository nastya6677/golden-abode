document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form[data-validate]').forEach(form => {
        form.addEventListener('submit', (e) => {
            let isValid = true;
            form.querySelectorAll('[required]').forEach(input => {
                const value = input.value.trim();
                const errorEl = input.parentElement.querySelector('.form-error');
                input.classList.remove('error');
                if (errorEl) errorEl.remove();
                let error = '';
                if (!value) error = 'Поле обязательно для заполнения';
                else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Введите корректный email';
                if (error) {
                    isValid = false;
                    input.classList.add('error');
                    const err = document.createElement('span');
                    err.className = 'form-error';
                    err.textContent = error;
                    input.parentElement.appendChild(err);
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                e.stopImmediatePropagation();
            } else {
                // Форма валидна, показываем успех
                const btn = form.querySelector('button[type="submit"]');
                if (btn) {
                    const origText = btn.textContent;
                    btn.textContent = 'Отправлено ✓';
                    btn.style.background = '#4CAF50';
                    btn.style.color = 'white';
                    setTimeout(() => {
                        btn.textContent = origText;
                        btn.style.background = '';
                        btn.style.color = '';
                        form.reset();
                    }, 3000);
                }
            }
        });
        form.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('error');
                const errorEl = input.parentElement.querySelector('.form-error');
                if (errorEl) errorEl.remove();
            });
        });
    });

    document.querySelectorAll('.subscribe').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('input');
            if (input && input.value.trim()) {
                const btn = form.querySelector('button');
                const orig = btn.textContent;
                btn.textContent = '✓';
                btn.style.background = '#4CAF50';
                btn.style.color = 'white';
                input.value = '';
                setTimeout(() => {
                    btn.textContent = orig;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
            }
        });
    });
});