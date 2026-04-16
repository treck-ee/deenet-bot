import 'dotenv/config';
import express from 'express';
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const app = express();
app.use(express.json());

console.log('✅ Токен загружен:', process.env.BOT_TOKEN ? 'Да' : 'Нет');

// ------------------- НАСТРОЙКИ (замените на свои реальные значения) -------------------
const GAMES_CHANNEL_LINK = 'https://max.ru/join/zTl2L5Vf9uO5fyxtiwSiAJtVPTRD2Gn_OnUpKDOkRYM';
const TECH_CHANNEL_LINK = 'https://max.ru/join/ВАША_ССЫЛКА_НА_TECH';
const CONSTRUCTION_CHANNEL_LINK = 'https://max.ru/join/ВАША_ССЫЛКА_НА_CONSTRUCTION';

const GAMES_DISCUSSION_LINK = 'https://max.ru/join/ССЫЛКА_НА_ЧАТ_ОБСУЖДЕНИЯ_GAMES';
const TECH_DISCUSSION_LINK = 'https://max.ru/join/ССЫЛКА_НА_ЧАТ_ОБСУЖДЕНИЯ_TECH';

// ID каналов для автокомментариев (узнать можно через логи)
const GAMES_CHANNEL_ID = 0;
const TECH_CHANNEL_ID = 0;
// --------------------------------------------------------------------------------

const bot = new Bot(process.env.BOT_TOKEN!);

// Хранилище сессий (для подбора бюджета)
const sessions = new Map<number, any>();

bot.use(async (ctx, next) => {
  const userId = ctx.user?.user_id;
  if (userId) {
    (ctx as any).session = sessions.get(userId) || {};
  }
  await next();
  if (userId) {
    sessions.set(userId, (ctx as any).session);
  }
});

// ---------- Единый обработчик входящих сообщений ----------
bot.on('message_created', async (ctx) => {
  const msg = ctx.message as any;
  const chat = ctx.chat as any;
  const user = ctx.user as any;

  // 1. Если сообщение из канала — отправляем кнопку «Комментарии»
  if (chat?.type === 'channel') {
    let discussionLink = '';
    if (chat.chat_id === GAMES_CHANNEL_ID) discussionLink = GAMES_DISCUSSION_LINK;
    else if (chat.chat_id === TECH_CHANNEL_ID) discussionLink = TECH_DISCUSSION_LINK;
    if (discussionLink) {
      const kb = Keyboard.inlineKeyboard([[Keyboard.button.link('💬 Комментарии', discussionLink)]]);
      await ctx.api.sendMessageToChat(chat.chat_id, 'Обсудить этот пост 👇', { keyboard: kb } as any);
    }
    return;
  }

  // 2. Команда /start в личных сообщениях
  if (msg?.body?.text === '/start') {
    const kb = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('🎮 DeeNet Games (скидки на игры)', 'menu_games')],
      [Keyboard.button.callback('💻 DeeNet Tech (скидки на ПК и комплектующие)', 'menu_tech')],
      [Keyboard.button.callback('🏗️ DeeNet construction (объекты и подряды)', 'menu_construction')],
    ]);

    const text = '👋 Добро пожаловать в DeeNet! Выберите раздел:';
    if (chat?.chat_id) {
      await ctx.reply(text, { keyboard: kb } as any);
    } else if (user?.user_id) {
      await bot.api.sendMessageToUser(user.user_id, text, { keyboard: kb } as any);
    }
    return;
  }

  // 3. Любое другое сообщение — эхо (можно убрать или заменить)
  const echoText = `Вы написали: "${msg?.body?.text}"`;
  if (chat?.chat_id) {
    await ctx.reply(echoText);
  } else if (user?.user_id) {
    await bot.api.sendMessageToUser(user.user_id, echoText);
  }
});

// ---------- Обработчики callback-кнопок ----------
bot.action('menu_games', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.link('📢 Перейти в канал DeeNet Games', GAMES_CHANNEL_LINK)],
    [Keyboard.button.callback('🔙 Назад', 'menu_back')],
  ]);
  await ctx.reply('🎮 DeeNet Games — скидки на игры.', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

bot.action('menu_tech', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.link('💻 Скидки на ПК и комплектующие', TECH_CHANNEL_LINK)],
    [Keyboard.button.callback('🛠️ Подобрать сборку по бюджету', 'budget_start')],
    [Keyboard.button.callback('🔙 Назад', 'menu_back')],
  ]);
  await ctx.reply('💻 DeeNet Tech — выберите действие:', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

bot.action('menu_construction', async (ctx) => {
  await ctx.reply('🏗️ Раздел находится в разработке.');
  await (ctx as any).answerCallback({});
});

bot.action('menu_back', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🎮 DeeNet Games (скидки на игры)', 'menu_games')],
    [Keyboard.button.callback('💻 DeeNet Tech (скидки на ПК и комплектующие)', 'menu_tech')],
    [Keyboard.button.callback('🏗️ DeeNet construction (объекты и подряды)', 'menu_construction')],
  ]);
  await ctx.reply('👋 Главное меню:', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

// ---------- Подбор сборки ПК по бюджету ----------
bot.action('budget_start', async (ctx) => {
  (ctx as any).session.step = 'choose_budget';
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('💰 до 50 000 ₽', 'budget_50000')],
    [Keyboard.button.callback('💰 50 000 – 100 000 ₽', 'budget_100000')],
    [Keyboard.button.callback('💰 более 100 000 ₽', 'budget_150000')],
    [Keyboard.button.callback('🔙 Назад в Tech', 'menu_tech')],
  ]);
  await ctx.reply('🛠️ Выберите примерный бюджет сборки:', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

bot.action(/budget_(.+)/, async (ctx) => {
  const match = ctx.match as any;
  if (!match) return (ctx as any).answerCallback({});
  const budget = match[1];
  (ctx as any).session.step = undefined;

  let recommendation = '';
  if (budget === '50000') {
    recommendation = '💡 Рекомендуемая сборка:\n- Процессор: Intel Core i3-12100F\n- Видеокарта: GTX 1650\n- ОЗУ: 16 ГБ DDR4\n- SSD: 512 ГБ';
  } else if (budget === '100000') {
    recommendation = '💡 Рекомендуемая сборка:\n- Процессор: AMD Ryzen 5 5600\n- Видеокарта: RTX 4060\n- ОЗУ: 32 ГБ DDR4\n- SSD: 1 ТБ NVMe';
  } else {
    recommendation = '💡 Рекомендуемая сборка:\n- Процессор: Intel Core i5-13600KF\n- Видеокарта: RTX 4070\n- ОЗУ: 32 ГБ DDR5\n- SSD: 1 ТБ NVMe';
  }

  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🔄 Подобрать ещё раз', 'budget_start')],
    [Keyboard.button.callback('🔙 В Tech меню', 'menu_tech')],
  ]);
  await ctx.reply(recommendation, { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

// ---------- Вебхук эндпоинт ----------
app.post('/webhook', async (req, res) => {
  try {
    // @ts-ignore — приватный метод, но работает
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error('❌ handleUpdate error:', err);
  }
  res.sendStatus(200);
});

// Health check для Railway
app.get('/', (req, res) => res.send('DeeNet Bot is running'));

// ---------- Автоматическая установка вебхука при старте ----------
async function setupWebhook() {
  const token = process.env.BOT_TOKEN;
  const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
  if (!token || !webhookUrl) return;

  const body = JSON.stringify({
    url: webhookUrl,
    update_types: ['message_created', 'message_callback'],
  });

  try {
    const response = await fetch('https://platform-api.max.ru/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body,
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Вебхук успешно установлен');
    } else {
      console.error('❌ Ошибка установки вебхука:', data);
    }
  } catch (err) {
    console.error('❌ Сетевая ошибка при установке вебхука:', err);
  }
}

// ---------- Запуск Express сервера ----------
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Express server listening on port ${PORT}`);
  console.log(`📍 Webhook URL: ${process.env.WEBHOOK_URL}/webhook`);
  setupWebhook().catch(console.error);
});