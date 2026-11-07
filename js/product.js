/* =========================================================
   СТРАНИЦА ТОВАРА — загрузка по id из URL
   ========================================================= */

const BASE_PRODUCTS = {
    '1': { title: 'Статуэтка Будды Шакьямуни (бронза, 12 см)', price: 4990, category: 'statue', img: 'img/prod-buddha.jpg', badge: 'Хит', desc: 'Изысканная бронзовая статуэтка Будды Шакьямуни. Высота 12 см. Ручная работа калмыцких мастеров. Идеальный подарок для практикующих буддизм и ценителей восточной культуры.' },
    '2': { title: 'Поющая чаша ручной работы (18 см)', price: 7490, category: 'attr', img: 'img/prod-bowl.jpg', badge: 'Новинка', desc: 'Поющая чаша из высококачественной бронзы. Диаметр 18 см. Применяется для медитации, звукотерапии и духовных практик. Издаёт глубокий, чистый звук.' },
    '3': { title: 'Буддийские четки (мала) из сандала', price: 2490, category: 'beads', img: 'img/prod-beads.jpg', badge: 'Хит', desc: 'Традиционные буддийские четки из натурального сандала. 108 бусин. Идеальны для повторения мантр и медитаций. Приятный натуральный аромат.' },
    '4': { title: 'Тханка «Белая Тара» (ручная работа)', price: 12900, category: 'thanka', img: 'img/prod-thanka.jpg', badge: '', desc: 'Традиционная тибетская тханка с изображением Белой Тары. Ручная работа. Натуральные минеральные краски. Размер 40×50 см.' },
    '5': { title: 'Этнический сувенир (калмыцкий оберег)', price: 1290, category: 'souvenir', img: 'img/prod-souvenir.jpg', badge: '', desc: 'Калмыцкий оберег ручной работы. Традиционный символ защиты и благополучия. Отличный сувенир из Элисты.' },
    '6': { title: 'Колокольчик ритуальный (бронза, 10 см)', price: 5490, category: 'attr', img: 'img/prod-bell.jpg', badge: '', desc: 'Ритуальный бронзовый колокольчик с дордже. Высота 10 см. Используется в буддийских практиках.' },
    '7': { title: 'Браслет из бирюзы (натуральный камень)', price: 3990, category: 'beads', img: 'img/prod-bracelet.jpg', badge: '', desc: 'Браслет из натуральной бирюзы на эластичной основе. Универсальный размер. Камень очищает энергетику и приносит удачу.' },
    '8': { title: 'Молитвенный барабан (металл, 15 см)', price: 6990, category: 'attr', img: 'img/prod-drum.jpg', badge: '', desc: 'Молитвенный барабан из металла. Высота 15 см. Внутри свиток с мантрами.' },
    '9': { title: 'Масляная лампа (бронза, 8 см)', price: 2990, category: 'attr', img: 'img/prod-lamp.jpg', badge: '', desc: 'Традиционная бронзовая масляная лампа. Высота 8 см. Используется для подношений.' },
    '10': { title: 'Ритуальный барабан (дерево, 12 см)', price: 4490, category: 'attr', img: 'img/prod-drum-small.jpg', badge: '', desc: 'Ритуальный барабан из дерева. Диаметр 12 см. Ручная работа.' },
    '11': { title: 'Оберег «Дунгур» (ручная работа)', price: 1990, category: 'souvenir', img: 'img/prod-dungur.jpg', badge: '', desc: 'Традиционный калмыцкий оберег «Дунгур». Ручная работа. Приносит удачу и защищает дом.' },
    '12': { title: 'Благовония тибетские (набор, 20 палочек)', price: 1490, category: 'attr', img: 'img/prod-incense.jpg', badge: '', desc: 'Набор тибетских благовоний. 20 палочек. Натуральные травы. Создают атмосферу спокойствия и гармонии.' }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Собираем все товары (базовые + добавленные админом)
    const PRODUCTS = { ...BASE_PRODUCTS };
    const customProducts = JSON.parse(localStorage.getItem('abode_custom_products') || '[]');
    
    customProducts.forEach(p => {
        PRODUCTS[p.id] = {
            title: p.title,
            price: p.price,
            category: p.category || 'custom',
            img: p.img || 'img/placeholder.jpg',
            badge: 'Новинка',
            desc: p.desc || 'Описание отсутствует.'
        };
    });

    // 2. Проверяем, не скрыт ли товар админом
    const hidden = JSON.parse(localStorage.getItem('abode_hidden_products') || '[]');
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = PRODUCTS[id];

    if (!product || hidden.includes(parseInt(id))) {
        document.getElementById('productDetail').style.display = 'none';
        document.getElementById('notFound').style.display = 'block';
        return;
    }

    // 3. Заполняем страницу данными
    document.title = product.title + ' — Золотая обитель';
    document.getElementById('productImg').src = product.img;
    document.getElementById('productImg').alt = product.title;
    document.getElementById('productTitle').textContent = product.title;
    document.getElementById('productPrice').textContent = product.price.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('productDesc').innerHTML = `<p>${product.desc}</p>`;
    document.getElementById('breadcrumbProduct').textContent = product.title;

    // 4. Логика работы с количеством
    const qtyInput = document.getElementById('qtyInput');
    let quantity = 1;

    document.querySelector('[data-qty-minus]').addEventListener('click', (e) => {
        e.preventDefault();
        if (quantity > 1) { quantity--; qtyInput.value = quantity; }
    });

    document.querySelector('[data-qty-plus]').addEventListener('click', (e) => {
        e.preventDefault();
        if (quantity < 99) { quantity++; qtyInput.value = quantity; }
    });

    // 5. Добавление в корзину
    document.getElementById('addToCartBtn').addEventListener('click', (e) => {
        e.preventDefault();
        
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
        try { cart = JSON.parse(localStorage.getItem(cartKey)) || []; } catch(err) { cart = []; }

        const existingItem = cart.find(item => item.productId === parseInt(id));
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                productId: parseInt(id),
                title: product.title,
                price: product.price,
                imageUrl: product.img,
                quantity: quantity
            });
        }

        localStorage.setItem(cartKey, JSON.stringify(cart));

        if (typeof updateCartBadge === 'function') updateCartBadge();

        if (typeof showToast === 'function') {
            showToast(`Добавлено ${quantity} шт. в корзину`);
        } else {
            alert(`Добавлено ${quantity} шт. в корзину`);
        }

        quantity = 1;
        qtyInput.value = 1;
    });
});