/* =========================================================
   КОРЗИНА — добавление товаров с карточек
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const cartButtons = document.querySelectorAll('.product__cart');

    cartButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const card = btn.closest('.product');
            if (!card) return;

            const title = card.querySelector('.product__title')?.textContent.trim() || 'Товар';
            const priceText = card.querySelector('.product__price')?.textContent.trim() || '0';
            const price = parseFloat(priceText.replace(/[^\d]/g, '')) || 0;
            const imageUrl = card.querySelector('.product__img img')?.getAttribute('src') || '';
            
            let productId = card.dataset.productId;
            if (!productId) {
                const href = card.getAttribute('href') || '';
                const match = href.match(/id=(\d+)/);
                productId = match ? parseInt(match[1]) : 0;
            } else {
                productId = parseInt(productId);
            }

            let userId = 'guest';
            try {
                const sessionStr = localStorage.getItem('abode_session');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    userId = session.userId || 'guest';
                }
            } catch(err) {}

            const cartKey = 'abode_cart_' + userId;
            let cart = [];
            try {
                cart = JSON.parse(localStorage.getItem(cartKey)) || [];
            } catch(err) { cart = []; }

            const existingItem = cart.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    productId: productId,
                    title: title,
                    price: price,
                    imageUrl: imageUrl,
                    quantity: 1
                });
            }

            localStorage.setItem(cartKey, JSON.stringify(cart));

            if (typeof updateCartBadge === 'function') updateCartBadge();

            if (typeof showToast === 'function') {
                showToast('Товар добавлен в корзину');
            } else {
                alert('Товар добавлен в корзину');
            }

            btn.classList.add('added');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            setTimeout(() => {
                btn.classList.remove('added');
                btn.innerHTML = originalHTML;
            }, 1500);
        });
    });
});