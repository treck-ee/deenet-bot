import 'dotenv/config';
import express from 'express';
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const app = express();
app.use(express.json());

console.log('✅ Токен загружен:', process.env.BOT_TOKEN ? 'Да' : 'Нет');

// ------------------- НАСТРОЙКИ -------------------
const GAMES_CHANNEL_LINK = 'https://max.ru/join/zTl2L5Vf9uO5fyxtiwSiAJtVPTRD2Gn_OnUpKDOkRYM';
const TECH_CHANNEL_LINK = 'https://max.ru/join/ВАША_ССЫЛКА_НА_TECH';
const CONSTRUCTION_CHANNEL_LINK = 'https://max.ru/join/ВАША_ССЫЛКА_НА_CONSTRUCTION';

const GAMES_DISCUSSION_LINK = 'https://max.ru/join/ССЫЛКА_НА_ЧАТ_ОБСУЖДЕНИЯ_GAMES';
const TECH_DISCUSSION_LINK = 'https://max.ru/join/ССЫЛКА_НА_ЧАТ_ОБСУЖДЕНИЯ_TECH';

const GAMES_CHANNEL_ID = 0;
const TECH_CHANNEL_ID = 0;
// ------------------------------------------------

const bot = new Bot(process.env.BOT_TOKEN!);

// ========== ОСНОВНОЙ ОБРАБОТЧИК СООБЩЕНИЙ ==========
bot.on('message_created', async (ctx) => {
  const msg = ctx.message as any;
  const chat = ctx.chat as any;
  const user = ctx.user as any;

  console.log('🔍 Диагностика:');
  console.log('  text:', msg?.body?.text);
  console.log('  chat_id:', chat?.chat_id);
  console.log('  user_id:', user?.user_id);

  // Ответ на /start
  if (msg?.body?.text === '/start') {
    console.log('🚀 Отправка меню пользователю', user?.user_id);
    const kb = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('🎮 DeeNet Games', 'menu_games')],
      [Keyboard.button.callback('💻 DeeNet Tech', 'menu_tech')],
      [Keyboard.button.callback('🏗️ DeeNet construction', 'menu_construction')],
    ]);

    if (chat?.chat_id) {
      await ctx.reply('👋 Добро пожаловать!', { keyboard: kb } as any);
    } else if (user?.user_id) {
      await bot.api.sendMessageToUser(user.user_id, '👋 Добро пожаловать!', { keyboard: kb } as any);
    } else {
      console.error('❌ Нет chat_id и user_id');
    }
    return;
  }

  // Эхо на другие сообщения
  if (chat?.chat_id) {
    await ctx.reply(`Получено: "${msg?.body?.text}"`);
  } else if (user?.user_id) {
    await bot.api.sendMessageToUser(user.user_id, `Получено: "${msg?.body?.text}"`);
  }
});

// ---------- ОБРАБОТЧИКИ КНОПОК (АКТИВНЫ) ----------
bot.action('menu_games', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.link('📢 Перейти в канал', GAMES_CHANNEL_LINK)],
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
    [Keyboard.button.callback('🎮 DeeNet Games', 'menu_games')],
    [Keyboard.button.callback('💻 DeeNet Tech', 'menu_tech')],
    [Keyboard.button.callback('🏗️ DeeNet construction', 'menu_construction')],
  ]);
  await ctx.reply('👋 Главное меню:', { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

// ---------- ПОДБОР БЮДЖЕТА ----------
bot.action('budget_start', async (ctx) => {
  (ctx as any).session = { step: 'budget' };
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

  let recommendation = '';
  if (budget === '50000') {
    recommendation = '💡 Сборка: i3-12100F / GTX 1650 / 16 ГБ / SSD 512 ГБ';
  } else if (budget === '100000') {
    recommendation = '💡 Сборка: Ryzen 5 5600 / RTX 4060 / 32 ГБ / SSD 1 ТБ';
  } else {
    recommendation = '💡 Сборка: i5-13600KF / RTX 4070 / 32 ГБ DDR5 / SSD 1 ТБ';
  }

  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🔄 Подобрать ещё раз', 'budget_start')],
    [Keyboard.button.callback('🔙 В Tech меню', 'menu_tech')],
  ]);
  await ctx.reply(recommendation, { keyboard: kb } as any);
  await (ctx as any).answerCallback({});
});

// ---------- АВТОКОММЕНТАРИИ (если заданы ID каналов) ----------
bot.on('message_created', async (ctx) => {
  const chat = ctx.chat as any;
  if (!chat || chat.type !== 'channel') return;

  let link = '';
  if (chat.chat_id === GAMES_CHANNEL_ID) link = GAMES_DISCUSSION_LINK;
  else if (chat.chat_id === TECH_CHANNEL_ID) link = TECH_DISCUSSION_LINK;
  if (!link) return;

  const kb = Keyboard.inlineKeyboard([[Keyboard.button.link('💬 Комментарии', link)]]);
  await ctx.api.sendMessageToChat(chat.chat_id, 'Обсудить этот пост 👇', { keyboard: kb } as any);
});

// ---------- ВЕБХУК ЭНДПОИНТ ----------
app.post('/webhook', async (req, res) => {
  console.log('📨 Webhook received');
  try {
    // @ts-ignore
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error('❌ handleUpdate error:', err);
  }
  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('DeeNet Bot is running'));

// ---------- УСТАНОВКА ВЕБХУКА ----------
async function setupWebhook() {
  const token = process.env.BOT_TOKEN;
  const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
  if (!token || !webhookUrl) return;
  const body = JSON.stringify({
    url: webhookUrl,
    update_types: ['message_created', 'bot_started', 'message_callback'],
  });
  try {
    const response = await fetch('https://platform-api.max.ru/subscriptions', {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body,
    });
    const data = await response.json();
    console.log(response.ok ? '✅ Вебхук установлен' : '❌ Ошибка вебхука:', data);
  } catch (err) {
    console.error('❌ Сетевая ошибка вебхука:', err);
  }
}

// ---------- ЗАПУСК ----------
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Express server on port ${PORT}`);
  setupWebhook().catch(console.error);
});