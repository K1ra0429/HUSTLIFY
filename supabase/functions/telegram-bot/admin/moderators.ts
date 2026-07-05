// Moderators section: only super-admins (ADMIN_TELEGRAM_IDS) can add/remove
// moderators. A moderator gets bot admin access + a login/password pair for
// the separate web admin panel. When the moderator's Telegram account sends
// /start, index.ts delivers those credentials via DM (see deliverCredentialsIfPending).
import { deleteAndSend, tg } from "../_shared/tg.ts";
import { supabase, writeAuditLog } from "../_shared/db.ts";
import { isSuperAdmin, hashPassword } from "../_shared/auth.ts";
import { setSession, clearSession } from "../_shared/session.ts";

function backRow() {
  return [{ text: "← Меню", callback_data: "a:menu" }];
}

export async function showModeratorsMenu(chatId: number, msgId: number | undefined, fromId: number) {
  const { data } = await supabase
    .from("moderators")
    .select("id, telegram_id, login, role, delivered, created_at")
    .order("created_at", { ascending: false });

  const lines = ["🛡 <b>Модераторы</b>", ""];
  if (!data || data.length === 0) {
    lines.push("Пока никого не добавили.");
  } else {
    for (const m of data) {
      const status = m.delivered ? "✅ доставлено" : "⏳ ждём /start от него";
      lines.push(`• <b>${m.login}</b> (роль: ${m.role}) — tg id ${m.telegram_id} — ${status}`);
    }
  }

  const rows: any[] = [];
  if (isSuperAdmin(fromId)) {
    rows.push([{ text: "➕ Добавить модератора", callback_data: "a:mod:new" }]);
    for (const m of data ?? []) {
      if (m.role !== "superadmin") {
        rows.push([{ text: `🗑 Удалить ${m.login}`, callback_data: `a:mod:d:${m.id}` }]);
      }
    }
  }
  rows.push(backRow());

  await deleteAndSend(chatId, msgId, {
    text: lines.join("\n"),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows },
  });
}

export async function startAddModerator(chatId: number, msgId: number | undefined, fromId: number) {
  if (!isSuperAdmin(fromId)) return;
  await setSession(fromId, "mod:new:id");
  await deleteAndSend(chatId, msgId, {
    text: "🛡 <b>Новый модератор</b>\n\nШаг 1/3. Пришлите Telegram ID человека (число).\nУзнать свой ID можно, например, у бота @userinfobot.",
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [backRow()] },
  });
}

// Called from index.ts's handleAdminText while the user's session state
// starts with "mod:new". Returns true once it has consumed the message.
export async function handleAddModeratorStep(
  chatId: number,
  fromId: number,
  state: string,
  payload: Record<string, unknown>,
  text: string,
): Promise<void> {
  const step = state.split(":")[2]; // id | login | password

  if (step === "id") {
    const id = Number(text.trim());
    if (!id || !Number.isFinite(id)) {
      await tg("sendMessage", { chat_id: chatId, text: "❌ Это не похоже на Telegram ID. Пришлите число." });
      return;
    }
    await setSession(fromId, "mod:new:login", { telegram_id: id });
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Шаг 2/3. Придумайте логин для входа на сайт (латиница/цифры, без пробелов).",
    });
    return;
  }

  if (step === "login") {
    const login = text.trim();
    if (login.length < 3 || /\s/.test(login)) {
      await tg("sendMessage", { chat_id: chatId, text: "❌ Логин должен быть от 3 символов и без пробелов. Попробуйте ещё раз." });
      return;
    }
    const { data: taken } = await supabase.from("moderators").select("id").eq("login", login).maybeSingle();
    if (taken) {
      await tg("sendMessage", { chat_id: chatId, text: "❌ Такой логин уже занят, придумайте другой." });
      return;
    }
    await setSession(fromId, "mod:new:password", { ...payload, login });
    await tg("sendMessage", { chat_id: chatId, text: "Шаг 3/3. Придумайте пароль (минимум 4 символа)." });
    return;
  }

  if (step === "password") {
    const password = text.trim();
    if (password.length < 4) {
      await tg("sendMessage", { chat_id: chatId, text: "❌ Пароль слишком короткий, минимум 4 символа." });
      return;
    }
    const telegramId = Number(payload.telegram_id);
    const login = String(payload.login);
    const password_hash = await hashPassword(password);

    const { error } = await supabase.from("moderators").insert({
      telegram_id: telegramId,
      login,
      password_hash,
      pending_password: password,
      role: "moderator",
      added_by: fromId,
      delivered: false,
    });

    await clearSession(fromId);

    if (error) {
      await tg("sendMessage", { chat_id: chatId, text: `❌ Не удалось сохранить: ${error.message}` });
      return;
    }

    await writeAuditLog(fromId, "moderator.add", login, { telegram_id: telegramId });

    await tg("sendMessage", {
      chat_id: chatId,
      text:
        `✅ Модератор добавлен.\n\n` +
        `Логин: <b>${login}</b>\nПароль: <b>${password}</b>\n\n` +
        `Как только этот человек нажмёт /start в этом боте, он автоматически получит эти данные для входа на сайт-админку.`,
      parse_mode: "HTML",
    });
  }
}

export async function deleteModerator(chatId: number, msgId: number | undefined, fromId: number, id: string) {
  if (!isSuperAdmin(fromId)) return;
  const { data: mod } = await supabase.from("moderators").select("login").eq("id", id).maybeSingle();
  await supabase.from("moderators").delete().eq("id", id);
  await writeAuditLog(fromId, "moderator.delete", mod?.login ?? id, {});
  await showModeratorsMenu(chatId, msgId, fromId);
}

// Called on every /start. If this Telegram account is a moderator whose
// credentials haven't been delivered yet, DM them the login/password once.
export async function deliverCredentialsIfPending(chatId: number, telegramId: number) {
  const { data } = await supabase
    .from("moderators")
    .select("id, login, pending_password, delivered")
    .eq("telegram_id", telegramId)
    .eq("delivered", false)
    .maybeSingle();
  if (!data) return;

  await tg("sendMessage", {
    chat_id: chatId,
    text:
      `🛡 Вам выдан доступ модератора.\n\n` +
      `Данные для входа в веб-админку:\n` +
      `Логин: <b>${data.login}</b>\n` +
      `Пароль: <b>${data.pending_password ?? "—"}</b>\n\n` +
      `Сохраните их — повторно бот пароль не пришлёт. В самом боте вам теперь доступна команда /admin.`,
    parse_mode: "HTML",
  });
  // Wipe the plaintext copy now that it's been delivered — only the hash remains.
  await supabase.from("moderators").update({ delivered: true, pending_password: null }).eq("id", data.id);
}
