document.addEventListener('DOMContentLoaded', () => {
    // Корзина
    const cartButtons = document.querySelectorAll('.product-cart-btn');
    const cartCount = document.querySelector('.cart-count');
    let count = 0;

    cartButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            count++;
            if(cartCount) cartCount.textContent = count;
            btn.style.background = '#C5A059';
            btn.style.color = '#fff';
            setTimeout(() => { btn.style.background = ''; btn.style.color = ''; }, 300);
        });
    });

    // Формы
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Сообщение отправлено! (Демо)');
            form.reset();
        });
    });
});