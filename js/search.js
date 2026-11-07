/* =========================================================
   ПОИСК — модальное окно на всех страницах
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

    /* Создаём HTML модального окна (добавляется один раз в body) */
    const modalHTML = `
        <div class="search-modal" id="searchModal">
            <div class="search-modal__overlay" data-search-close></div>
            <div class="search-modal__box">
                <button class="search-modal__close" aria-label="Закрыть" data-search-close>✕</button>
                <h3 class="search-modal__title">Поиск по сайту</h3>
                <div class="search-modal__input-wrap">
                    <input type="text" id="searchInput" class="search-modal__input" placeholder="Что вы ищете?">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-modal__icon">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                </div>
                <div class="search-modal__results" id="searchResults"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('searchModal');
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    /* Открытие окна при клике на иконку поиска */
    document.querySelectorAll('[data-search-open]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openSearch();
        });
    });

    /* Закрытие — по крестику, оверлею, Esc */
    document.querySelectorAll('[data-search-close]').forEach(el => {
        el.addEventListener('click', closeSearch);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSearch();
    });

    function openSearch() {
        modal.classList.add('open');
        setTimeout(() => input.focus(), 200);
    }
    function closeSearch() {
        modal.classList.remove('open');
        input.value = '';
        results.innerHTML = '';
    }

    /* Вспомогательные функции: экранирование и приведение «ё» к «е» */
    const esc = (str) => String(str).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
    const norm = (str) => String(str).toLowerCase().replace(/ё/g, 'е');

    /* Список товаров: со страницы каталога или (на других страницах) из catalog.html */
    let catalogCache = null;
    function readCards(root) {
        return Array.from(root.querySelectorAll('.product')).map(p => ({
            title: p.querySelector('.product__title')?.textContent.trim() || '',
            price: p.querySelector('.product__price')?.textContent.trim() || '',
            img: p.querySelector('.product__img img')?.getAttribute('src') || '',
            link: p.getAttribute('href') || 'catalog.html'
        }));
    }
    async function getProducts() {
        if (document.querySelector('.catalog-grid .product')) return readCards(document);
        if (!catalogCache) {
            try {
                const html = await (await fetch('catalog.html')).text();
                catalogCache = readCards(new DOMParser().parseFromString(html, 'text/html'));
            } catch (e) { catalogCache = readCards(document); }
        }
        return catalogCache;
    }

    /* Живой поиск по всем товарам каталога */
    input.addEventListener('input', async () => {
        const raw = input.value;
        const query = norm(raw.trim());

        if (query.length < 2) {
            results.innerHTML = '<p class="search-modal__hint">Введите минимум 2 символа</p>';
            return;
        }

        const products = await getProducts();
        if (norm(input.value.trim()) !== query) return; // пользователь уже изменил запрос
        const found = products.filter(p => norm(p.title).includes(query));

        if (found.length === 0) {
            results.innerHTML = `<p class="search-modal__hint">Ничего не найдено по запросу «${esc(raw)}»</p>`;
            return;
        }

        results.innerHTML = found.slice(0, 8).map(p => `
            <a href="${esc(p.link)}" class="search-result">
                <div class="search-result__img"><img src="${esc(p.img)}" alt=""></div>
                <div class="search-result__info">
                    <div class="search-result__title">${esc(p.title)}</div>
                    <div class="search-result__price">${esc(p.price)}</div>
                </div>
            </a>
        `).join('');
    });
});
