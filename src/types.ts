import type {ConversationFlavor} from "@grammyjs/conversations";
import type {Context} from "grammy";


export type TMyBotContext =ConversationFlavor<Context>

export type TProduct = {
    article: string;
    pdfPath: string;
}