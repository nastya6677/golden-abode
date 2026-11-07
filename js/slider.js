document.addEventListener('DOMContentLoaded', () => {
    const heroDots = document.querySelectorAll('.hero__dot');
    const hero = document.querySelector('.hero');
    if (heroDots.length && hero) {
        const heroSlides = [
            { title: 'Духовные традиции и культура в каждом сувенире', subtitle: 'Республика Калмыкия' },
            { title: 'Уникальные товары буддийской культуры', subtitle: 'Из самого сердца Калмыкии' },
            { title: 'Этнические сувениры ручной работы', subtitle: 'Сохраняя традиции предков' }
        ];
        let currentSlide = 0;
        let heroInterval;
        const goToSlide = (index) => {
            currentSlide = index;
            heroDots.forEach((dot, i) => dot.classList.toggle('active', i === index));
            const titleEl = hero.querySelector('.hero__title');
            const subtitleEl = hero.querySelector('.hero__subtitle');
            if (titleEl && subtitleEl) {
                titleEl.style.opacity = 0;
                subtitleEl.style.opacity = 0;
                setTimeout(() => {
                    titleEl.textContent = heroSlides[index].title;
                    subtitleEl.textContent = heroSlides[index].subtitle;
                    titleEl.style.transition = 'opacity 0.5s';
                    subtitleEl.style.transition = 'opacity 0.5s';
                    titleEl.style.opacity = 1;
                    subtitleEl.style.opacity = 1;
                }, 200);
            }
        };
        const startAutoPlay = () => {
            heroInterval = setInterval(() => {
                goToSlide((currentSlide + 1) % heroSlides.length);
            }, 6000);
        };
        heroDots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                clearInterval(heroInterval);
                goToSlide(i);
                startAutoPlay();
            });
        });
        startAutoPlay();
    }
    const sliderPrev = document.querySelector('.slider-arrow--prev');
    const sliderNext = document.querySelector('.slider-arrow--next');
    const productsGrid = document.querySelector('.products');
    if (sliderPrev && sliderNext && productsGrid) {
        const scrollAmount = 300;
        sliderPrev.addEventListener('click', () => productsGrid.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
        sliderNext.addEventListener('click', () => productsGrid.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
    }
});