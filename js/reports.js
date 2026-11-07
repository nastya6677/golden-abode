/* =========================================================
   ОТЧЁТ ПО ТОВАРАМ: выгрузка в Word (.docx) и Excel (.xlsx)
   Файлы формируются прямо в браузере, сервер не нужен.
   ========================================================= */

const REPORT_SHOP = 'Золотая обитель';

const CATEGORY_NAMES = {
    statue: 'Статуэтки',
    attr: 'Атрибутика',
    beads: 'Четки и браслеты',
    thanka: 'Ткани и картины',
    textile: 'Текстиль',
    souvenir: 'Сувениры',
    books: 'Книги',
    custom: 'Прочее'
};

const BASE_PRODUCT_LIST = [
    { id: 1,  title: 'Статуэтка Будды Шакьямуни (бронза, 12 см)',  price: 4990,  category: 'statue',   img: 'img/prod-buddha.jpg' },
    { id: 2,  title: 'Поющая чаша ручной работы (18 см)',          price: 7490,  category: 'attr',     img: 'img/prod-bowl.jpg' },
    { id: 3,  title: 'Буддийские четки (мала) из сандала',         price: 2490,  category: 'beads',    img: 'img/prod-beads.jpg' },
    { id: 4,  title: 'Тханка «Белая Тара» (ручная работа)',        price: 12900, category: 'thanka',   img: 'img/prod-thanka.jpg' },
    { id: 5,  title: 'Этнический сувенир (калмыцкий оберег)',      price: 1290,  category: 'souvenir', img: 'img/prod-souvenir.jpg' },
    { id: 6,  title: 'Колокольчик ритуальный (бронза, 10 см)',     price: 5490,  category: 'attr',     img: 'img/prod-bell.jpg' },
    { id: 7,  title: 'Браслет из бирюзы (натуральный камень)',     price: 3990,  category: 'beads',    img: 'img/prod-bracelet.jpg' },
    { id: 8,  title: 'Молитвенный барабан (металл, 15 см)',        price: 6990,  category: 'attr',     img: 'img/prod-drum.jpg' },
    { id: 9,  title: 'Масляная лампа (бронза, 8 см)',              price: 2990,  category: 'attr',     img: 'img/prod-lamp.jpg' },
    { id: 10, title: 'Ритуальный барабан (дерево, 12 см)',         price: 4490,  category: 'attr',     img: 'img/prod-drum-small.jpg' },
    { id: 11, title: 'Оберег «Дунгур» (ручная работа)',            price: 1990,  category: 'souvenir', img: 'img/prod-dungur.jpg' },
    { id: 12, title: 'Благовония тибетские (набор, 20 палочек)',   price: 1490,  category: 'attr',     img: 'img/prod-incense.jpg' }
];

/** Все товары: базовые + добавленные админом, с признаком видимости */
function getAllProducts() {
    const hidden = JSON.parse(localStorage.getItem('abode_hidden_products') || '[]');
    const custom = JSON.parse(localStorage.getItem('abode_custom_products') || '[]');
    return [...BASE_PRODUCT_LIST, ...custom].map(p => ({
        id: p.id,
        title: p.title,
        price: Number(p.price) || 0,
        category: p.category || 'custom',
        categoryName: CATEGORY_NAMES[p.category] || CATEGORY_NAMES.custom,
        img: p.img,
        visible: !hidden.includes(p.id)
    }));
}

function getReportProducts() {
    const sel = document.getElementById('reportScope');
    const onlyVisible = sel && sel.value === 'visible';
    const list = getAllProducts();
    return onlyVisible ? list.filter(p => p.visible) : list;
}

function formatRub(n) {
    return Number(n).toLocaleString('ru-RU').replace(/\u00A0/g, '\u00A0') + '\u00A0₽';
}

function reportStats(list) {
    const prices = list.map(p => p.price);
    const sum = prices.reduce((a, b) => a + b, 0);
    return {
        count: list.length,
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
        avg: prices.length ? Math.round(sum / prices.length) : 0
    };
}

function reportDateStr() {
    return new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function reportFileStamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* =========================================================
   WORD
   ========================================================= */
async function exportProductsWord() {
    if (typeof docx === 'undefined') { alert('Не загружена библиотека для Word (js/vendor/docx.iife.js).'); return; }
    const list = getReportProducts();
    if (!list.length) { alert('Нет товаров для отчёта'); return; }

    const {
        Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
        BorderStyle, ShadingType, Footer, Header, PageNumber, VerticalAlign, TabStopType
    } = docx;

    const FONT = 'Arial';
    const INK = '222222';
    const GREY = '666666';
    const HEAD_FILL = '2B2B2B';
    const ZEBRA = 'F3F3F3';
    const LINE = 'BFBFBF';

    const widths = [700, 3938, 2100, 1500, 1400]; // сумма 9638 = A4 минус поля 2 см
    const TABLE_W = widths.reduce((a, b) => a + b, 0);
    const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: LINE };
    const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

    const run = (text, o = {}) => new TextRun({ text: String(text), font: FONT, size: 20, color: INK, ...o });

    const cell = (text, i, { header = false, zebra = false, align = AlignmentType.LEFT, bold = false } = {}) =>
        new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            borders,
            verticalAlign: VerticalAlign.CENTER,
            shading: header
                ? { type: ShadingType.CLEAR, fill: HEAD_FILL, color: 'auto' }
                : zebra ? { type: ShadingType.CLEAR, fill: ZEBRA, color: 'auto' } : undefined,
            margins: { top: 70, bottom: 70, left: 110, right: 110 },
            children: [new Paragraph({
                alignment: align,
                children: [run(text, header ? { bold: true, color: 'FFFFFF', size: 19 } : { bold })]
            })]
        });

    const headRow = new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
            cell('№', 0, { header: true, align: AlignmentType.CENTER }),
            cell('Наименование', 1, { header: true }),
            cell('Категория', 2, { header: true }),
            cell('Цена, ₽', 3, { header: true, align: AlignmentType.RIGHT }),
            cell('Статус', 4, { header: true, align: AlignmentType.CENTER })
        ]
    });

    const dataRows = list.map((p, idx) => {
        const z = idx % 2 === 1;
        return new TableRow({
            cantSplit: true,
            children: [
                cell(idx + 1, 0, { zebra: z, align: AlignmentType.CENTER }),
                cell(p.title, 1, { zebra: z }),
                cell(p.categoryName, 2, { zebra: z }),
                cell(p.price.toLocaleString('ru-RU'), 3, { zebra: z, align: AlignmentType.RIGHT, bold: true }),
                cell(p.visible ? 'В продаже' : 'Скрыт', 4, { zebra: z, align: AlignmentType.CENTER })
            ]
        });
    });

    const st = reportStats(list);
    const sumRows = [
        ['Количество позиций', st.count.toLocaleString('ru-RU')],
        ['Минимальная цена', formatRub(st.min)],
        ['Максимальная цена', formatRub(st.max)],
        ['Средняя цена', formatRub(st.avg)]
    ];
    const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const lineB = { style: BorderStyle.SINGLE, size: 4, color: LINE };
    const sumW = [3400, 2200];
    const summary = new Table({
        width: { size: 5600, type: WidthType.DXA },
        columnWidths: sumW,
        rows: sumRows.map(([k, v]) => new TableRow({
            cantSplit: true,
            children: [
                new TableCell({
                    width: { size: sumW[0], type: WidthType.DXA },
                    borders: { top: noB, left: noB, right: noB, bottom: lineB },
                    margins: { top: 50, bottom: 50, left: 0, right: 100 },
                    children: [new Paragraph({ children: [run(k, { color: GREY })] })]
                }),
                new TableCell({
                    width: { size: sumW[1], type: WidthType.DXA },
                    borders: { top: noB, left: noB, right: noB, bottom: lineB },
                    margins: { top: 50, bottom: 50, left: 100, right: 0 },
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(v, { bold: true })] })]
                })
            ]
        }))
    });

    const scopeText = (document.getElementById('reportScope') || {}).value === 'visible'
        ? 'Только товары, отображаемые на сайте' : 'Все товары каталога';

    const doc = new Document({
        creator: REPORT_SHOP,
        title: 'Отчёт по товарам',
        styles: { default: { document: { run: { font: FONT, size: 20, color: INK } } } },
        sections: [{
            properties: {
                page: {
                    size: { width: 11906, height: 16838 },
                    margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }
                }
            },
            headers: {
                default: new Header({
                    children: [new Paragraph({
                        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
                        children: [run(REPORT_SHOP.toUpperCase(), { size: 16, color: GREY, characterSpacing: 40 })]
                    })]
                })
            },
            footers: {
                default: new Footer({
                    children: [new Paragraph({
                        tabStops: [{ type: TabStopType.RIGHT, position: TABLE_W }],
                        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
                        children: [
                            run('Отчёт по товарам · ' + reportDateStr(), { size: 16, color: GREY }),
                            new TextRun({ text: '\tСтраница ', font: FONT, size: 16, color: GREY }),
                            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY }),
                            new TextRun({ text: ' из ', font: FONT, size: 16, color: GREY }),
                            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY })
                        ]
                    })]
                })
            },
            children: [
                new Paragraph({
                    spacing: { before: 120, after: 60 },
                    children: [run('ОТЧЁТ ПО ТОВАРАМ', { size: 36, bold: true, characterSpacing: 30 })]
                }),
                new Paragraph({
                    spacing: { after: 40 },
                    children: [run('Перечень товаров и их стоимость', { size: 22, color: GREY })]
                }),
                new Paragraph({
                    spacing: { after: 280 },
                    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: HEAD_FILL, space: 8 } },
                    children: [
                        run('Дата формирования: ', { color: GREY }), run(reportDateStr()),
                        run('     Выборка: ', { color: GREY }), run(scopeText)
                    ]
                }),
                new Table({
                    width: { size: TABLE_W, type: WidthType.DXA },
                    columnWidths: widths,
                    rows: [headRow, ...dataRows]
                }),
                new Paragraph({ spacing: { before: 320, after: 120 }, keepNext: true, children: [run('Итоги', { bold: true, size: 24 })] }),
                summary,
                new Paragraph({
                    spacing: { before: 700 },
                    keepNext: true,
                    tabStops: [{ type: TabStopType.LEFT, position: 4200 }, { type: TabStopType.LEFT, position: 6200 }],
                    children: [
                        run('Ответственный: ____________________'),
                        run('\t'),
                        run('Подпись: _______________')
                    ]
                })
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `products_report_${reportFileStamp()}.docx`);
    if (typeof showToast === 'function') showToast('Отчёт Word сформирован');
}

/* =========================================================
   EXCEL: свой минимальный генератор .xlsx (без внешних библиотек)
   ========================================================= */
const _crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = _crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

/** ZIP без сжатия: files = [{ name, data: string }] */
function buildZip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    const u16 = n => [n & 255, (n >>> 8) & 255];
    const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

    files.forEach(f => {
        const nameB = enc.encode(f.name);
        const dataB = enc.encode(f.data);
        const crc = crc32(dataB);
        const local = new Uint8Array([
            0x50, 0x4B, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
            ...u32(crc), ...u32(dataB.length), ...u32(dataB.length), ...u16(nameB.length), ...u16(0)
        ]);
        chunks.push(local, nameB, dataB);
        central.push({ nameB, crc, size: dataB.length, offset });
        offset += local.length + nameB.length + dataB.length;
    });

    const cdStart = offset;
    central.forEach(c => {
        const hdr = new Uint8Array([
            0x50, 0x4B, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
            ...u32(c.crc), ...u32(c.size), ...u32(c.size), ...u16(c.nameB.length), ...u16(0), ...u16(0),
            ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)
        ]);
        chunks.push(hdr, c.nameB);
        offset += hdr.length + c.nameB.length;
    });
    const cdSize = offset - cdStart;
    chunks.push(new Uint8Array([
        0x50, 0x4B, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length),
        ...u32(cdSize), ...u32(cdStart), ...u16(0)
    ]));
    return new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function xmlEsc(s) {
    return String(s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]));
}

function exportProductsExcel() {
    const list = getReportProducts();
    if (!list.length) { alert('Нет товаров для отчёта'); return; }

    const st = reportStats(list);
    const scopeText = (document.getElementById('reportScope') || {}).value === 'visible'
        ? 'Только товары, отображаемые на сайте' : 'Все товары каталога';

    const sheetName = 'Товары';
    const HEAD_ROW = 5;
    const first = HEAD_ROW + 1;
    const last = HEAD_ROW + list.length;

    // Стили (индексы cellXfs):
    // 0 обычный | 1 заголовок отчёта | 2 серый подзаголовок | 3 шапка таблицы
    // 4 текст | 5 по центру | 6 цена | 7 текст (зебра) | 8 центр (зебра) | 9 цена (зебра)
    // 10 подпись итога | 11 значение итога (число) | 12 значение итога (цена)
    const S = { title: 1, sub: 2, head: 3, txt: 4, ctr: 5, price: 6, txtZ: 7, ctrZ: 8, priceZ: 9, sumL: 10, sumN: 11, sumP: 12 };

    const t = (ref, text, s) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(text)}</t></is></c>`;
    const n = (ref, num, s, formula) => `<c r="${ref}" s="${s}">${formula ? `<f>${formula}</f>` : ''}<v>${num}</v></c>`;

    const rows = [];
    rows.push(`<row r="1" ht="28" customHeight="1">${t('A1', 'ОТЧЁТ ПО ТОВАРАМ', S.title)}</row>`);
    rows.push(`<row r="2">${t('A2', REPORT_SHOP + ' — перечень товаров и их стоимость', S.sub)}</row>`);
    rows.push(`<row r="3">${t('A3', 'Дата формирования: ' + reportDateStr() + '   ·   Выборка: ' + scopeText, S.sub)}</row>`);
    rows.push(`<row r="${HEAD_ROW}" ht="24" customHeight="1">${
        ['№', 'Наименование', 'Категория', 'Цена, ₽', 'Статус'].map((h, i) => t('ABCDE'[i] + HEAD_ROW, h, S.head)).join('')
    }</row>`);

    list.forEach((p, i) => {
        const r = first + i;
        const z = i % 2 === 1;
        rows.push(`<row r="${r}" ht="20" customHeight="1">${
            n('A' + r, i + 1, z ? S.ctrZ : S.ctr) +
            t('B' + r, p.title, z ? S.txtZ : S.txt) +
            t('C' + r, p.categoryName, z ? S.txtZ : S.txt) +
            n('D' + r, p.price, z ? S.priceZ : S.price) +
            t('E' + r, p.visible ? 'В продаже' : 'Скрыт', z ? S.ctrZ : S.ctr)
        }</row>`);
    });

    let r = last + 2;
    rows.push(`<row r="${r}">${t('B' + r, 'Итоги', S.title)}</row>`);
    const sums = [
        ['Количество позиций', st.count, S.sumN, `COUNTA(B${first}:B${last})`],
        ['Минимальная цена', st.min, S.sumP, `MIN(D${first}:D${last})`],
        ['Максимальная цена', st.max, S.sumP, `MAX(D${first}:D${last})`],
        ['Средняя цена', st.avg, S.sumP, `ROUND(AVERAGE(D${first}:D${last}),0)`]
    ];
    sums.forEach(([label, val, style, f]) => {
        r++;
        rows.push(`<row r="${r}">${t('B' + r, label, S.sumL)}${t('C' + r, '', S.sumL)}${n('D' + r, val, style, f)}</row>`);
    });
    const lastRow = r;

    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:E${lastRow}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${HEAD_ROW}" topLeftCell="A${HEAD_ROW + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${HEAD_ROW + 1}" sqref="A${HEAD_ROW + 1}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols><col min="1" max="1" width="7" customWidth="1"/><col min="2" max="2" width="54" customWidth="1"/><col min="3" max="3" width="22" customWidth="1"/><col min="4" max="4" width="16" customWidth="1"/><col min="5" max="5" width="14" customWidth="1"/></cols>
<sheetData>${rows.join('')}</sheetData>
<autoFilter ref="A${HEAD_ROW}:E${last}"/>
<mergeCells count="3"><mergeCell ref="A1:E1"/><mergeCell ref="A2:E2"/><mergeCell ref="A3:E3"/></mergeCells>
<printOptions horizontalCentered="1"/>
<pageMargins left="0.6" right="0.6" top="0.8" bottom="0.8" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;L${xmlEsc(REPORT_SHOP)}&amp;CСтраница &amp;P из &amp;N&amp;R&amp;D</oddFooter></headerFooter>
</worksheet>`;

    const thin = c => `<left style="thin"><color rgb="FF${c}"/></left><right style="thin"><color rgb="FF${c}"/></right><top style="thin"><color rgb="FF${c}"/></top><bottom style="thin"><color rgb="FF${c}"/></bottom>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0\\ &quot;₽&quot;"/></numFmts>
<fonts count="5">
<font><sz val="11"/><color rgb="FF222222"/><name val="Arial"/></font>
<font><b/><sz val="16"/><color rgb="FF222222"/><name val="Arial"/></font>
<font><sz val="10"/><color rgb="FF666666"/><name val="Arial"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
<font><b/><sz val="11"/><color rgb="FF222222"/><name val="Arial"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF2B2B2B"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F3F3"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>${thin('BFBFBF')}<diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="3" fontId="4" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" indent="1"/></xf>
<xf numFmtId="164" fontId="4" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" indent="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>
<definedNames>
<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${sheetName}!$A$${HEAD_ROW}:$E$${last}</definedName>
<definedName name="_xlnm.Print_Titles" localSheetId="0">${sheetName}!$${HEAD_ROW}:$${HEAD_ROW}</definedName>
</definedNames>
</workbook>`;

    const files = [
        { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
        { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
        { name: 'xl/workbook.xml', data: workbook },
        { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
        { name: 'xl/styles.xml', data: styles },
        { name: 'xl/worksheets/sheet1.xml', data: sheet }
    ];

    downloadBlob(buildZip(files), `products_report_${reportFileStamp()}.xlsx`);
    if (typeof showToast === 'function') showToast('Отчёт Excel сформирован');
}
