/* =========================================================
   ПРИМЕНЕНИЕ КОНТЕНТА, СОХРАНЁННОГО АДМИНОМ
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const saved = JSON.parse(localStorage.getItem('abode_content') || '{}');
    if (Object.keys(saved).length === 0) return;

    const setText = (selector, value) => {
        if (!value) return;
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
    };

    // ГЛАВНАЯ
    if (document.querySelector('.hero__subtitle')) {
        setText('.hero__subtitle', saved.hero_subtitle);
        setText('.hero__title', saved.hero_title);
        setText('.hero__text', saved.hero_text);
    }

    // О НАС
    if (document.querySelector('.about-block')) {
        setText('.about-block .section__title', saved.about_title);
        const aboutText = document.querySelector('.about-block p');
        if (aboutText && saved.about_text) aboutText.textContent = saved.about_text;
        setText('.quote__text', saved.quote_text);
    }

    // ДОСТАВКА
    if (document.querySelector('.hero__title') && document.querySelector('.hero__title').textContent === 'Доставка') {
        setText('.hero__text', saved.delivery_text);
    }

    // КОНТАКТЫ (телефон, email, адрес)
    if (saved.contacts_phone) {
        document.querySelectorAll('a[href^="tel:"]').forEach(a => {
            a.textContent = saved.contacts_phone;
            a.href = 'tel:' + saved.contacts_phone.replace(/[^\d+]/g, '');
        });
        document.querySelectorAll('.footer__contacts p').forEach(p => {
            if (p.textContent.includes('📞')) p.textContent = '📞 ' + saved.contacts_phone;
        });
    }
    if (saved.contacts_email) {
        document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
            a.textContent = saved.contacts_email;
            a.href = 'mailto:' + saved.contacts_email;
        });
        document.querySelectorAll('.footer__contacts p').forEach(p => {
            if (p.textContent.includes('✉')) p.textContent = '✉ ' + saved.contacts_email;
        });
    }
    if (saved.contacts_address) {
        document.querySelectorAll('.footer__contacts p').forEach(p => {
            if (p.textContent.includes('📍')) p.textContent = '📍 ' + saved.contacts_address;
        });
    }

    // ФУТЕР
    document.querySelectorAll('.footer__brand .logo__title').forEach(el => {
        if (saved.footer_title) el.textContent = saved.footer_title;
    });
    document.querySelectorAll('.footer__brand .logo__subtitle').forEach(el => {
        if (saved.footer_subtitle) el.textContent = saved.footer_subtitle;
    });
});