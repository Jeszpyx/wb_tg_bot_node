import {InlineKeyboard, Keyboard} from "grammy";

export const getBarcode = '🏷️ Получить штрихкод'
export const addKey = '🛍️ Добавить товар'
export const processKey = '📊 Обработать Excel'

export const mainKeyboard = new Keyboard()
    .text(getBarcode).row()
    .text(addKey).row()
    .text(processKey).row()
    .resized()
    .oneTime()

