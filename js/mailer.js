/* =========================================================
   ОТПРАВКА ПИСЕМ (сервис EmailJS, работает прямо из браузера)
   Чтобы письма реально уходили на почту, заполните три значения
   ниже (инструкция – в файле НАСТРОЙКА_ПОЧТЫ.md). Пока значения
   пустые, сайт работает в демонстрационном режиме.
   ========================================================= */
window.MAIL_CONFIG = {
       serviceId: 'service_bb1flfq',
       templateId: 'template_g9lsspo',
       publicKey: 'mEcx0mffQ6yHtShkI'
   };

function getMailConfig() {
    const c = window.MAIL_CONFIG;
    if (c && c.serviceId && c.templateId && c.publicKey) return c;
    try {
        const s = JSON.parse(localStorage.getItem('abode_mail_config') || '{}');
        if (s.serviceId && s.templateId && s.publicKey) return s;
    } catch (e) { /* нет настроек */ }
    return null;
}

function mailConfigured() {
    return !!getMailConfig();
}

async function sendResetEmail({ toEmail, toName, link, minutes }) {
    const c = getMailConfig();
    if (!c) throw new Error('mail not configured');
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: c.serviceId,
            template_id: c.templateId,
            user_id: c.publicKey,
            template_params: {
                to_email: toEmail,
                to_name: toName || 'покупатель',
                reset_link: link,
                expires_min: minutes,
                site_name: 'Золотая обитель'
            }
        })
    });
    if (!response.ok) throw new Error('mail failed: ' + (await response.text()));
}
