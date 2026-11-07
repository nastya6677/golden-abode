/* =========================================================
   УСЛОВИЯ ВОЗВРАТА — модальное окно
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

    /* HTML модального окна */
    const modalHTML = `
        <div class="return-modal" id="returnModal">
            <div class="return-modal__overlay" data-return-close></div>
            <div class="return-modal__box">
                <button class="return-modal__close" aria-label="Закрыть" data-return-close>✕</button>
                <h3 class="return-modal__title">Условия возврата</h3>
                <div class="return-modal__content">
                    <p><strong>1. Общие положения</strong></p>
                    <p>Возврат товара возможен в течение <strong>14 дней</strong> с момента получения заказа, если товар не был в использовании, сохранил товарный вид, потребительские свойства, а также документ, подтверждающий факт и условия покупки.</p>

                    <p><strong>2. Возврат товара надлежащего качества</strong></p>
                    <p>Покупатель вправе отказаться от товара надлежащего качества, не подошедшего по форме, габаритам, фасону, расцветке или комплектации, в течение 14 дней с момента получения. Возврат денежных средств осуществляется в течение 10 дней с момента получения возврата.</p>

                    <p><strong>3. Возврат товара ненадлежащего качества</strong></p>
                    <p>В случае обнаружения дефектов товара покупатель вправе потребовать замену, соразмерное уменьшение цены или возврат денежных средств. Для этого необходимо связаться с нами по телефону <strong>+7 (999) 123-45-67</strong> или по e-mail <strong>info@golden-abode.ru</strong>.</p>

                    <p><strong>4. Как оформить возврат</strong></p>
                    <p>Для оформления возврата необходимо:</p>
                    <ul>
                        <li>Связаться с нами по телефону или e-mail</li>
                        <li>Заполнить заявление на возврат</li>
                        <li>Отправить товар обратно по адресу: г. Элиста, ул. Ленина, 12</li>
                        <li>После получения товара мы вернём денежные средства удобным для вас способом</li>
                    </ul>

                    <p><strong>5. Возврат денежных средств</strong></p>
                    <p>Денежные средства возвращаются тем же способом, которым была произведена оплата, в течение 10 календарных дней с момента получения возврата товара.</p>

                    <p style="margin-top: 24px; font-size: 13px; color: #999;">Если у вас остались вопросы — позвоните нам по телефону +7 (999) 123-45-67 или напишите на info@golden-abode.ru</p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('returnModal');

    /* Открытие окна */
    document.querySelectorAll('[data-return-open]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    });

    /* Закрытие окна */
    document.querySelectorAll('[data-return-close]').forEach(el => {
        el.addEventListener('click', () => {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    /* Закрытие по Esc */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    });
});