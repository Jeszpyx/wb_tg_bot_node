import {Bot, type Context, InputFile, NextFunction, session, SessionFlavor} from "grammy";
import {admins, BOT_TOKEN, welcomeAndHelpText} from "./constants";
import {addKey, getBarcode, mainKeyboard, processKey} from "./keyboards";
import {conversations, createConversation,} from "@grammyjs/conversations";
import {addProductConv, getBarcodesPdf, processExcel} from "./conversations";
import {FileAdapter} from "@grammyjs/storage-file";
import {SessionData, TMyBotContext, TProduct} from "./types";
import {dbService} from "./services/db.service";
import {buildProductsMessage} from "./helpers";
import {join} from "node:path";
import PDFMerger from "pdf-merger-js";
import {unlink} from "node:fs/promises";


function initialSession(): SessionData {
    return {selected: [], currentPage: 1};
}

const bot = new Bot<TMyBotContext & SessionFlavor<SessionData>>(BOT_TOKEN);

bot.use(session({initial: initialSession}));
bot.use(conversations({
    storage: new FileAdapter({dirName: "convo-data"}),
}));
bot.command("cancel", async (ctx) => {
    try {
        await ctx.conversation.exit(Object.keys(ctx.conversation.active())[0]);
        await ctx.reply(`✅ Действие успешно прервано.`, {reply_markup: mainKeyboard});
    } catch (e) {
        await ctx.reply(`❌ Ошибка при отмене действия:\n${e}`, {reply_markup: mainKeyboard});
    }

});
bot.use(createConversation(addProductConv));
bot.use(createConversation(processExcel));
bot.use(createConversation(getBarcodesPdf));


// Only handle commands in private chats.
const pm = bot.chatType("private");

const authMiddleware = async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id
    if (ctx.from?.is_bot || !userId || !admins.includes(userId)) {
        await ctx.reply('Извините, но у вас нет доступа к боту...')
        return
    }
    await next()
}

pm.use(authMiddleware)

pm.command("start", async (ctx): Promise<void> => {
    await ctx.conversation.exit(Object.keys(ctx.conversation.active())[0]);
    const name = ctx.from.username || ctx.from.first_name || "гость";
    await ctx.reply(`Добро пожаловать, ${name}\nДля получения описания функций бота нажмите на /help`, {reply_markup: mainKeyboard});
});

pm.command("help", async (ctx): Promise<void> => {
    await ctx.reply(
        welcomeAndHelpText,
        {reply_markup: mainKeyboard, parse_mode: "HTML"}
    );
});

pm.command("keyboard", async (ctx): Promise<void> => {
    await ctx.reply("Клавиатура ✅", {
        reply_markup: mainKeyboard
    });
});

pm.hears(getBarcode, async (ctx): Promise<void> => {
    await ctx.conversation.enter(getBarcodesPdf.name);
})


pm.hears(addKey, async (ctx): Promise<void> => {
    await ctx.conversation.enter(addProductConv.name);
})

pm.hears(processKey, async (ctx): Promise<void> => {
    await ctx.conversation.enter(processExcel.name);
})

// ==== обработка страниц ====
bot.callbackQuery(/^page:(\d+)$/, async (ctx) => {
    const page = Number(ctx.match[1]);
    ctx.session.currentPage = page;

    const products = await dbService.getAllTitles();
    const {text, reply_markup} = buildProductsMessage(products, page, ctx.session.selected);

    await ctx.editMessageText(text, {reply_markup});
    await ctx.answerCallbackQuery();
});

// ==== обработка выбора товара ====
bot.callbackQuery(/^product:(.+)$/, async (ctx) => {
    const title = ctx.match[1];

    // toggle выбор
    const i = ctx.session.selected.indexOf(title);
    if (i === -1) {
        ctx.session.selected.push(title);
    } else {
        ctx.session.selected.splice(i, 1);
    }

    const products = await dbService.getAllTitles();
    const page = ctx.session.currentPage || 1;

    const {text, reply_markup} = buildProductsMessage(products, page, ctx.session.selected);

    await ctx.editMessageText(text, {reply_markup});
    await ctx.answerCallbackQuery();
});

bot.callbackQuery("get-selection", async (ctx) => {
    try {
        const selected = ctx.session.selected;

        if (!selected.length) {
            await ctx.answerCallbackQuery({text: "❌ Список пуст!", show_alert: true});
            return;
        }

        const foundProducts: TProduct[] = [];

        for (const article of selected) {
            const product = await dbService.findOneByArticle(article);
            foundProducts.push(product!);
        }

        const savePath = join(dbService.outputPath, `${selected.join('_+_')}.pdf`)
        const merger = new PDFMerger();
        for (const p of foundProducts) {
            await merger.add(join(dbService.pdfPath, p.pdfPath));
        }

        await merger.save(savePath);
        await ctx.replyWithDocument(new InputFile(savePath), {reply_markup: mainKeyboard});

        try {
            await ctx.deleteMessage();
        } catch (err) {
            console.warn("Не удалось удалить сообщение:", err);
        }

        ctx.session.selected = []
        ctx.session.currentPage = 1
        await unlink(savePath)
        await ctx.answerCallbackQuery();

    } catch (e) {
        await ctx.answerCallbackQuery({
            text: `Произошла ошибка при получении списка в pdf:\n${JSON.stringify(e)}`,
        });
    }
});

// обработка сброса выбора
bot.callbackQuery("clear-selection", async (ctx) => {
    ctx.session.selected = []; // очистили список
    const products = await dbService.getAllTitles();
    const page = 1; // после сброса кидаем на первую страницу


    const {text, reply_markup} = buildProductsMessage(
        products,
        page,
        ctx.session.selected
    );

    await ctx.editMessageText(text, {
        reply_markup,
    });

    await ctx.answerCallbackQuery({
        text: "✅ Список очищен",
        show_alert: false,
    });
});

const main = async (): Promise<void> => {
    await bot.api.setMyCommands([
        {command: "start", description: "Перезапустить бота"},
        {command: "help", description: "Получить описание бота"},
        {command: "keyboard", description: "Открыть клавиатуру"},
        {command: "cancel", description: "Отменить действие"},
    ]);
    bot.start();
}

main()