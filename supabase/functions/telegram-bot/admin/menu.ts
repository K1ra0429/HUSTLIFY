import { tg, deleteAndSend } from "../_shared/tg.ts";
import { clearSession } from "../_shared/session.ts";
import { PREMIUM_EMOJI, withEmojiIcon, tgEmoji } from "../_shared/premium_emoji.ts";

// Inline keyboard layout matching the reference screenshot.
// callback_data uses a tiny "a:<section>" scheme so we never approach the
// 64-byte limit even when section names grow.
export function adminMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        withEmojiIcon({ text: " Товары", callback_data: "a:p"}, PREMIUM_EMOJI[57]), // 58
        withEmojiIcon({ text: " Категории", callback_data: "a:c" },PREMIUM_EMOJI[56] ) //57
      ],
      [
         withEmojiIcon({ text: " Заказы", callback_data: "a:o" }, PREMIUM_EMOJI[55]),
         withEmojiIcon({ text: " Пользователи", callback_data: "a:u" }, PREMIUM_EMOJI[51]),
      ],
      [
         withEmojiIcon({ text: " Проекты", callback_data: "a:pr" }, PREMIUM_EMOJI[61]),
         withEmojiIcon({ text: " Статистика", callback_data: "a:st" }, PREMIUM_EMOJI[52]),
      ],
      [
         withEmojiIcon({ text: " Промокоды", callback_data: "a:pc" }, PREMIUM_EMOJI[53]),
         withEmojiIcon({ text: " Склад", callback_data: "a:inv" }, PREMIUM_EMOJI[64]),
      ],
      [
         withEmojiIcon({ text: " Логи", callback_data: "a:lg" }, PREMIUM_EMOJI[64]),
         withEmojiIcon({ text: " Настройки", callback_data: "a:se" }, PREMIUM_EMOJI[59]),
      ],
      [
        withEmojiIcon({ text: " Рассылка", callback_data: "a:bc" }, PREMIUM_EMOJI[63]),
        withEmojiIcon({ text: " Отзывы", callback_data: "a:rv" }, PREMIUM_EMOJI[63]),
      ],
      [
        withEmojiIcon({ text: " Авто-заказы", callback_data: "a:ao" }, PREMIUM_EMOJI[60]),
         withEmojiIcon({ text: " Заявки СБП", callback_data: "a:sbp" }, PREMIUM_EMOJI[50]),
      ],
      [
         withEmojiIcon({ text: " Модераторы", callback_data: "a:mod" }, PREMIUM_EMOJI[54]),
      ],
    ],
  };
}

export async function sendAdminMenu(chatId: number, telegramId: number, replaceMsgId?: number) {
  await clearSession(telegramId);
  const text = `${tgEmoji(PREMIUM_EMOJI[50], "")} <b>Админ-панель</b>\n\nВыберите раздел:`;
  await deleteAndSend(
    chatId,
    replaceMsgId,
    {
      text,
      parse_mode: "HTML",
      reply_markup: adminMenuKeyboard(),
    },
  );
}

export async function notImplementedStub(chatId: number, msgId: number | undefined, section: string) {
  await deleteAndSend(chatId, msgId, {
    text: `🚧 Раздел <b>${section}</b> в разработке.`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "← Назад", callback_data: "a:menu" }]],
    },
  });
}
