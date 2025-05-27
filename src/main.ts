import {Bot, type Context, NextFunction} from "grammy";
import {admins, BOT_TOKEN, welcomeAndHelpText} from "./constants";
import {addKey, mainKeyboard, processKey} from "./keyboards";
import {conversations, createConversation,} from "@grammyjs/conversations";
import {addProductConv, processExcel} from "./conversations";
import {FileAdapter} from "@grammyjs/storage-file";
import {TMyBotContext} from "./types";


const bot = new Bot<TMyBotContext>(BOT_TOKEN);

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

pm.hears(addKey, async (ctx): Promise<void> => {
    await ctx.conversation.enter(addProductConv.name);
})

pm.hears(processKey, async (ctx): Promise<void> => {
    await ctx.conversation.enter(processExcel.name);
})


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