document.addEventListener('DOMContentLoaded', () => {
    const priceRange = document.querySelector('#priceRange');
    const priceValue = document.querySelector('#priceValue');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', () => {
            priceValue.textContent = `${parseInt(priceRange.value).toLocaleString('ru-RU')} ₽`;
            filterProducts();
        });
    }
    
    document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', filterProducts);
    });
    
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) sortSelect.addEventListener('change', sortProducts);
    
    function filterProducts() {
        const products = document.querySelectorAll('.catalog-grid .product');
        const maxPrice = priceRange ? parseInt(priceRange.value) : Infinity;
        const activeCategories = Array.from(document.querySelectorAll('.filter-item input[data-category]:checked')).map(cb => cb.dataset.category);
        products.forEach(product => {
            const price = parseInt(product.dataset.price || 0);
            const category = product.dataset.category || '';
            const priceMatch = price <= maxPrice;
            const categoryMatch = activeCategories.length === 0 || activeCategories.includes(category);
            product.style.display = (priceMatch && categoryMatch) ? '' : 'none';
        });
    }
    
    function sortProducts() {
        const grid = document.querySelector('.catalog-grid');
        if (!grid) return;
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
});