import {Keyboard} from "grammy";

export const addKey = '🛍️ Добавить товар'
export const processKey = '📊 Обработать Excel'

export const mainKeyboard = new Keyboard()
    .text(addKey).row()
    .text(processKey).row()
    .resized();