import 'dotenv/config';
import express from 'express';
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const app = express();
app.use(express.json());

console.log('✅ Токен загружен:', process.env.BOT_TOKEN ? 'Да' : 'Нет');

// ------------------- НАСТРОЙКИ (замените на свои) -------------------
const GAMES_CHANNEL_LINK = 'https://max.ru/join/zTl2L5Vf9uO5fyxtiwSiAJtVPTRD2Gn_OnUpKDOkRYM';
const TECH_CHANNEL_LINK = 'https://max.ru/join/ВАША_ССЫЛКА_НА_TECH';
const CONSTRUCTION_CHANNEL_LINK = 'https://max.ru/join/ВАША_ССЫЛКА_НА_CONSTRUCTION';

const GAMES_DISCUSSION_LINK = 'https://max.ru/join/ССЫЛКА_НА_ЧАТ_ОБСУЖДЕНИЯ_GAMES';
const TECH_DISCUSSION_LINK = 'https://max.ru/join/ССЫЛКА_НА_ЧАТ_ОБСУЖДЕНИЯ_TECH';

const GAMES_CHANNEL_ID = 0;
const TECH_CHANNEL_ID = 0;
// -------------------------------------------------------------------

const bot = new Bot(process.env.BOT_TOKEN!);

// Хранилище сессий
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

// ---------- Автокомментарии ----------
bot.on('message_created', async (ctx) => {
  const chat = ctx.chat as any;
  const message = ctx.message;
  if (!chat || chat.type !== 'channel' || !message) return;

  let link = '';
  if (chat.chat_id === GAMES_CHANNEL_ID) link = GAMES_DISCUSSION_LINK;
  else if (chat.chat_id === TECH_CHANNEL_ID) link = TECH_DISCUSSION_LINK;
  if (!link) return;

  const kb = Keyboard.inlineKeyboard([[Keyboard.button.link('💬 Комментарии', link)]]);
  await ctx.api.sendMessageToChat(chat.chat_id, 'Обсудить этот пост 👇', { keyboard: kb } as any);
});

// ---------- /start ----------
bot.command('start', async (ctx) => {
  console.log('🚀 Обработчик /start вызван!');
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🎮 DeeNet Games', 'menu_games')],
    [Keyboard.button.callback('💻 DeeNet Tech', 'menu_tech')],
    [Keyboard.button.callback('🏗️ DeeNet construction', 'menu_construction')],
  ]);
  await ctx.reply('👋 Добро пожаловать!', { keyboard: kb } as any);
});

// ---------- Меню Games ----------
bot.action('menu_games', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.link('📢 Перейти в канал', GAMES_CHANNEL_LINK)],
    [Keyboard.button.callback('🔙 Назад', 'menu_back')],
  ]);
  await ctx.reply('🎮 DeeNet Games', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

// ---------- Меню Tech ----------
bot.action('menu_tech', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.link('💻 Скидки на ПК', TECH_CHANNEL_LINK)],
    [Keyboard.button.callback('🛠️ Подобрать сборку', 'budget_start')],
    [Keyboard.button.callback('🔙 Назад', 'menu_back')],
  ]);
  await ctx.reply('💻 DeeNet Tech', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

bot.action('menu_construction', async (ctx) => {
  await ctx.reply('🏗️ В разработке');
  await (ctx as any).answerCallback({});
});

bot.action('menu_back', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🎮 DeeNet Games', 'menu_games')],
    [Keyboard.button.callback('💻 DeeNet Tech', 'menu_tech')],
    [Keyboard.button.callback('🏗️ DeeNet construction', 'menu_construction')],
  ]);
  await ctx.reply('Главное меню', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

// ---------- Подбор бюджета ----------
bot.action('budget_start', async (ctx) => {
  (ctx as any).session.step = 'budget';
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('💰 до 50 000 ₽', 'budget_50000')],
    [Keyboard.button.callback('💰 50–100 тыс ₽', 'budget_100000')],
    [Keyboard.button.callback('💰 >100 тыс ₽', 'budget_150000')],
    [Keyboard.button.callback('🔙 Назад', 'menu_tech')],
  ]);
  await ctx.reply('Выберите бюджет:', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

bot.action(/budget_(.+)/, async (ctx) => {
  const match = ctx.match as any;
  if (!match) return (ctx as any).answerCallback({});
  const budget = match[1];
  (ctx as any).session.step = undefined;

  let msg = '';
  if (budget === '50000') msg = '💡 Сборка: i3-12100F / GTX 1650 / 16 ГБ';
  else if (budget === '100000') msg = '💡 Сборка: Ryzen 5 5600 / RTX 4060 / 32 ГБ';
  else msg = '💡 Сборка: i5-13600KF / RTX 4070 / 32 ГБ DDR5';

  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🔄 Ещё раз', 'budget_start')],
    [Keyboard.button.callback('🔙 В Tech', 'menu_tech')],
  ]);
  await ctx.reply(msg, { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

// ---------- ВЕБХУК ЭНДПОИНТ С ПОДРОБНЫМ ЛОГИРОВАНИЕМ ----------
app.post('/webhook', async (req, res) => {
  console.log('📨 Webhook received');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  try {
    // @ts-ignore - приватный метод, но работает
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error('❌ handleUpdate error:', err);
  }
  res.sendStatus(200);
});

// Health check
app.get('/', (req, res) => res.send('DeeNet Bot is running'));

// ---------- АВТОМАТИЧЕСКАЯ УСТАНОВКА ВЕБХУКА ----------
async function setupWebhook() {
  const token = process.env.BOT_TOKEN;
  const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;

  if (!token || !webhookUrl) {
    console.error('❌ BOT_TOKEN или WEBHOOK_URL не заданы');
    return;
  }

  const body = JSON.stringify({
    url: webhookUrl,
    update_types: ['message_created', 'bot_started', 'message_callback'],
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
      console.log('✅ Вебхук успешно установлен:', data);
    } else {
      console.error('❌ Ошибка установки вебхука:', data);
    }
  } catch (err) {
    console.error('❌ Сетевая ошибка при установке вебхука:', err);
  }
}

// ---------- ЗАПУСК СЕРВЕРА ----------
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Express server listening on port ${PORT}`);
  console.log(`📍 Webhook URL: ${process.env.WEBHOOK_URL}/webhook`);
  setupWebhook().catch(console.error);
});

// ⚠️ bot.start() не вызываем, чтобы не мешать вебхуку.
// Библиотека будет работать только через handleUpdate.