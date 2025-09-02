import {InlineKeyboard, Keyboard} from "grammy";

export const getBarcode = '🏷️ Получить штрихкод'
export const addKey = '🛍️ Добавить товар'
export const processKey = '📊 Обработать Excel'

export const mainKeyboard = new Keyboard()
    .text(processKey).row()
    .text(addKey).row()
    .text(getBarcode).row()
    .resized()
    .oneTime()

