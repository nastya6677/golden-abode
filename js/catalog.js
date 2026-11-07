/* =========================================================
   КАТАЛОГ — фильтры, сортировка, поиск, теги категорий
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

    /* ================= 1. СВОРАЧИВАНИЕ ФИЛЬТРОВ ================= */
    const filterTitles = document.querySelectorAll('.filter-title');
    filterTitles.forEach(title => {
        title.addEventListener('click', () => {
            const content = title.nextElementSibling;
            const arrow = title.querySelector('.filter-arrow');
            if (!content) return;
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? '' : 'none';
            if (arrow) arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });

    /* ================= 2–5. ЕДИНАЯ ФИЛЬТРАЦИЯ ================= */
    /* Все условия (строка поиска, цена, категории, материал, тег) применяются вместе */
    const normText = (str) => String(str).toLowerCase().replace(/ё/g, 'е');
    const grid = document.querySelector('.catalog-grid');
    const priceRange = document.querySelector('#priceRange');
    const priceValue = document.querySelector('#priceValue');
    const categoryTags = document.querySelectorAll('.category-tag');
    let activeTag = 'all';

    let emptyMsg = null;
    if (grid) {
        emptyMsg = document.createElement('p');
        emptyMsg.className = 'catalog-empty';
        emptyMsg.textContent = 'По выбранным условиям товаров не найдено. Измените фильтры или строку поиска.';
        emptyMsg.style.display = 'none';
        grid.insertAdjacentElement('afterend', emptyMsg);
    }

    function applyFilters() {
        const products = document.querySelectorAll('.catalog-grid .product');
        const maxPrice = priceRange ? parseInt(priceRange.value) : Infinity;
        const categories = Array.from(document.querySelectorAll('.filter-item input[data-category]:checked')).map(cb => cb.dataset.category);
        const materials = Array.from(document.querySelectorAll('.filter-item input[data-material]:checked')).map(cb => cb.dataset.material);
        const queries = Array.from(document.querySelectorAll('.catalog-search')).map(i => normText(i.value.trim())).filter(Boolean);
        let visible = 0;
        products.forEach(product => {
            const price = parseInt(product.dataset.price || 0);
            const category = product.dataset.category || '';
            const productMaterials = (product.dataset.material || '').split(',').filter(Boolean);
            const title = normText(product.querySelector('.product__title')?.textContent || '');
            const priceText = (product.querySelector('.product__price')?.textContent || '').toLowerCase();
            let ok = price <= maxPrice;
            if (ok && activeTag !== 'all') ok = category === activeTag;
            if (ok && categories.length) ok = categories.includes(category);
            if (ok && materials.length) ok = materials.some(m => productMaterials.includes(m));
            if (ok && queries.length) ok = queries.every(q => title.includes(q) || priceText.includes(q));
            product.style.display = ok ? '' : 'none';
            if (ok) visible++;
        });
        if (emptyMsg) emptyMsg.style.display = visible === 0 ? '' : 'none';
    }

    document.querySelectorAll('.catalog-search').forEach(input => input.addEventListener('input', applyFilters));
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', () => {
            priceValue.textContent = `до ${parseInt(priceRange.value).toLocaleString('ru-RU')} ₽`;
            applyFilters();
        });
    }
    document.querySelectorAll('.filter-item input[data-category], .filter-item input[data-material]').forEach(cb => {
        cb.addEventListener('change', applyFilters);
    });
    categoryTags.forEach(tag => {
        tag.addEventListener('click', () => {
            categoryTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            activeTag = tag.dataset.filter;
            document.querySelectorAll('.filter-item input[data-category]').forEach(cb => { cb.checked = false; });
            applyFilters();
        });
    });

    /* ================= 6. СОРТИРОВКА ================= */
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) sortSelect.addEventListener('change', sortProducts);

    function sortProducts() {
        const grid = document.querySelector('.catalog-grid');
        if (!grid || !sortSelect) return;
        const products = Array.from(grid.querySelectorAll('.product'));
        const sortValue = sortSelect.value;
        products.sort((a, b) => {
            const priceA = parseInt(a.dataset.price || 0);
            const priceB = parseInt(b.dataset.price || 0);
            if (sortValue === 'price-asc') return priceA - priceB;
            if (sortValue === 'price-desc') return priceB - priceA;
            return 0;
        });
        products.forEach(p => grid.appendChild(p));
    }

    /* ================= 7. МОБИЛЬНЫЙ САЙДБАР ================= */
    const filterToggle = document.querySelector('.filter-toggle');
    const filterSidebar = document.querySelector('.catalog-sidebar');
    if (filterToggle && filterSidebar) {
        filterToggle.addEventListener('click', () => filterSidebar.classList.toggle('open'));
    }

    /* ================= 8. ДОБАВЛЕНИЕ НОВЫХ ТОВАРОВ АДМИНОМ ================= */
    function renderCustomProducts() {
        const customProducts = JSON.parse(localStorage.getItem('abode_custom_products') || '[]');
        const hidden = JSON.parse(localStorage.getItem('abode_hidden_products') || '[]');
        const grid = document.querySelector('.catalog-grid');
        if (!grid) return;

        customProducts.forEach(p => {
            if (hidden.includes(p.id)) return;
            const existing = grid.querySelector(`a[href="product.html?id=${p.id}"]`);
            if (existing) return;

            const a = document.createElement('a');
            a.href = `product.html?id=${p.id}`;
            a.className = 'product';
            a.dataset.price = p.price;
            a.dataset.category = p.category || 'custom';
            a.innerHTML = `
                <div class="product__badges"><span class="product__badge product__badge--new">Новинка</span></div>
                <div class="product__img"><img src="${p.img || 'img/placeholder.jpg'}" alt="${p.title}"></div>
                <h3 class="product__title">${p.title}</h3>
                <div class="product__price">${p.price.toLocaleString('ru-RU')} ₽</div>
                <button class="product__cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></button>
            `;
            grid.appendChild(a);
        });
    }
    renderCustomProducts();
});