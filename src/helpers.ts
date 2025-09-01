import { InlineKeyboard } from "grammy";

export function buildProductsMessage(
    products: { title: string }[],
    page: number,
    selected: string[]
) {
    const columns = 3; // 3 кнопки в ряд
    const rows = 10;   // 10 рядов
    const perPageCount = columns * rows; // = 30 товаров на страницу

    const totalPages = Math.ceil(products.length / perPageCount);
    const start = (page - 1) * perPageCount;
    const end = start + perPageCount;
    const pageProducts = products.slice(start, end);

    const kb = new InlineKeyboard();

    // товары (по 3 в ряд)
    for (let i = 0; i < pageProducts.length; i++) {
        const product = pageProducts[i];
        const label = selected.includes(product.title)
            ? `✅ ${product.title}`
            : product.title;

        kb.text(label, `product:${product.title}`);

        // каждые 3 кнопки переносим строку
        if ((i + 1) % columns === 0) {
            kb.row();
        }
    }

    // кнопки навигации
    if (page > 1) {
        kb.text("◀️", `page:${page - 1}`);
    }
    kb.text(`Стр. ${page}/${totalPages}`, "noop");
    if (page < totalPages) {
        kb.text("▶️", `page:${page + 1}`);
    }

    // кнопки действий (только если выбран хоть один товар)
    if (selected.length) {
        kb.row()
            .text("📥 Получить", "get-selection")
            .text("♻️ Сброс", "clear-selection");
    }

    // текстовое сообщение
    let text = "🛒 Ваш выбор:\n";
    if (selected.length === 0) {
        text += "— пока пусто —";
    } else {
        text += selected.map(t => `• ${t}`).join("\n");
    }

    return { text, reply_markup: kb };
}
