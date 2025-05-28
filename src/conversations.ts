import {Conversation} from "@grammyjs/conversations";
import {Document, File} from '@grammyjs/types'
import {Context, InputFile} from "grammy";
import {downloadService} from "./services/download.service";
import {dbService} from "./services/db.service";
import {mainKeyboard} from "./keyboards";
import {read, utils} from "xlsx";
import {TProduct} from "./types";
import PDFMerger from "pdf-merger-js";
import {join} from "node:path";
import {unlink} from "node:fs/promises";

async function waitForPdf(conversation: Conversation, ctx: Context): Promise<Document> {
    const pdf: Document = await conversation.form.document({})
    if (pdf.mime_type !== 'application/pdf') {
        await ctx.reply('❌ Ошибка загрузки файла\n📌 Файл должен быть в формате PDF!')
        return waitForPdf(conversation, ctx); // Рекурсивный вызов
    }
    return pdf
}

async function waitForXlsx(conversation: Conversation, ctx: Context): Promise<Document> {
    const xlsx: Document = await conversation.form.document({})
    if (xlsx.mime_type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        await ctx.reply('❌ Ошибка загрузки файла\n📌 Файл должен быть в формате XLSX!')
        return waitForXlsx(conversation, ctx); // Рекурсивный вызов
    }
    return xlsx
}

export async function addProductConv(conversation: Conversation, ctx: Context) {
    try {
        await ctx.reply("Введите артикул товара.\nИли отмените операцию через /cancel", {reply_markup: {remove_keyboard: true}});
        const article = await conversation.form.text()
        const isExists = await dbService.findOneByArticle(article)
        if (isExists) {
            await ctx.reply(`⚠️ Такой артикул уже есть.\nЗарузите PDF для обновления или отмените операцию через /cancel`);
        } else {
            await ctx.reply(`Теперь загрузите PDF файл.`);
        }
        const pdf = await waitForPdf(conversation, ctx);
        const fileInfo: File = await ctx.api.getFile(pdf.file_id)
        if (!fileInfo.file_path) {
            throw new Error('Не удается найти путь к файлу на серверах Telegram.')
        }
        const fileBuffer = await downloadService.download(fileInfo.file_path)
        if (!fileBuffer) {
            throw new Error('Не удалось скачать файл с серверов Telegram.')
        }
        const result = await dbService.save(article, fileBuffer)
        if (!result) {
            throw new Error('Не удалось сохранить файл и\\или обновить БД.')
        }
        await ctx.reply(`✅ Товар ${article} ${isExists ? 'обновлён' : 'добавлен'} успешно.`, {reply_markup: mainKeyboard});
    } catch (e) {
        await ctx.reply(`❌ Действие отменено из-за ошибки:\n${e}`, {reply_markup: mainKeyboard})
        await conversation.halt()
    }
}

export async function processExcel(conversation: Conversation, ctx: Context) {
    try {
        await ctx.reply("Загрузите Excel файл.\nИли отмените операцию через /cancel", {reply_markup: {remove_keyboard: true}});
        const xlsx = await waitForXlsx(conversation, ctx);
        const fileInfo: File = await ctx.api.getFile(xlsx.file_id)
        if (!fileInfo.file_path) {
            throw new Error('Не удается найти путь к файлу на серверах Telegram.')
        }
        const fileBuffer = await downloadService.download(fileInfo.file_path)
        if (!fileBuffer) {
            throw new Error('Не удалось скачать файл с серверов Telegram.')
        }
        const workbook = read(fileBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const articles: string[] = [];

        for (let row = 5; ; row++) {
            const cellAddress = utils.encode_cell({r: row, c: 6}); // G = 6
            const cell = worksheet[cellAddress];
            if (!cell) break;
            articles.push(cell.v); // Берём значение ячейки (.v), а не весь объект
        }

        const foundProducts: TProduct[] = [];
        const notFoundArticles: string[] = [];

        for (const article of articles) {
            const product = await dbService.findOneByArticle(article);

            if (product) {
                foundProducts.push(product);
            } else {
                notFoundArticles.push(article);
            }
        }

        if (notFoundArticles.length) {
            // const message = "not found"
            //     await ctx.reply(message, {parse_mode: 'Markdown', reply_markup: mainKeyboard});
            //     await conversation.halt()
            const htmlList = `<b>🔴 Не найдено артикулов: ${notFoundArticles.length}</b>
                                <ul>
                                ${notFoundArticles.map(article => `<li>${article}</li>`).join('\n')}
                              </ul>`;

            await ctx.reply(htmlList, {
                parse_mode: 'HTML',
                reply_markup: mainKeyboard
            });
            await conversation.halt();
        }

        const savePath = join(dbService.outputPath, `${Date.now()}.pdf`)
        const merger = new PDFMerger();
        for (const p of foundProducts) {
            await merger.add(join(dbService.pdfPath, p.pdfPath));
        }

        await merger.save(savePath);
        await ctx.replyWithDocument(new InputFile(savePath), {reply_markup: mainKeyboard});

        await unlink(savePath)
    } catch (e) {
        await ctx.reply(`❌ Действие отменено из-за ошибки:\n${e}`, {reply_markup: mainKeyboard});
        await conversation.halt()
    }
}
