import 'dotenv/config';
import express from 'express';
import { Bot, Keyboard } from '@maxhub/max-bot-api';

const app = express();
app.use(express.json());

console.log('✅ Токен загружен:', process.env.BOT_TOKEN ? 'Да' : 'Нет');

// ------------------- НАСТРОЙКИ -------------------
const GAMES_CHANNEL_LINK = 'https://max.ru/join/zTl2L5Vf9uO5fyxtiwSiAJtVPTRD2Gn_OnUpKDOkRYM';
const TECH_CHANNEL_LINK = 'https://max.ru/join/N2b38v9Gme1vpQcPOL9zNpHZoX2OUfL4eZdD4Oqdadg';
const CONSTRUCTION_CHANNEL_LINK = 'https://max.ru/join/ВАША_ССЫЛКА_НА_CONSTRUCTION';

const GAMES_DISCUSSION_LINK = 'https://max.ru/join/vdLr4H5-M3AF-kPXLO2nKk-Jnw8RISTB-vUO2PR0i3s';
const TECH_DISCUSSION_LINK = 'https://max.ru/join/cXYvTqGKjbsqixKPf6L3zT8wzF7V2vp3ul68E66gfqw';

const GAMES_CHANNEL_ID = -73273754116277;
const TECH_CHANNEL_ID = -73413069693109;
// ------------------------------------------------

const bot = new Bot(process.env.BOT_TOKEN!);

bot.api.setMyCommands([
  { name: 'start', description: 'Главное меню' },
]);

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

// ---------- Первый вход пользователя (bot_started) ----------
bot.on('bot_started', async (ctx) => {
  const user = ctx.user as any;
  const chat = ctx.chat as any;
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🎮 DeeNet Games', 'menu_games')],
    [Keyboard.button.callback('💻 DeeNet Tech', 'menu_tech')],
    [Keyboard.button.callback('🏗️ DeeNet Construction', 'menu_construction')],
  ]);
  const replyText = '👋 Добро пожаловать в DeeNet! Выберите раздел:';

  if (chat?.chat_id) {
    await ctx.reply(replyText, { attachments: [kb] });
  } else if (user?.user_id) {
    await bot.api.sendMessageToUser(user.user_id, replyText, { attachments: [kb] });
  }
});

// ---------- Сообщения ----------
bot.on('message_created', async (ctx) => {
  const msg = ctx.message as any;
  const chat = ctx.chat as any;
  const user = ctx.user as any;
  const text = msg?.body?.text;

  const recipient = msg?.recipient;
  const chatId = chat?.chat_id || recipient?.chat_id;
  const chatType = chat?.type || recipient?.chat_type;

  console.log('📌 Chat ID:', chatId, '| Type:', chatType);

  // Автокомментарии в канале
  if (chatType === 'channel') {
    let link = '';
    if (chatId === GAMES_CHANNEL_ID) link = GAMES_DISCUSSION_LINK;
    else if (chatId === TECH_CHANNEL_ID) link = TECH_DISCUSSION_LINK;
    if (link) {
      const kb = Keyboard.inlineKeyboard([
        [Keyboard.button.link('💬 Комментарии', link)],
      ]);
      await ctx.reply('Обсудить это 👇', { attachments: [kb] });
    }
    return;
  }

  if (text === '/start') {
  const description = `
 🎮 *DeeNet Games* — (🎁 Скидки, Раздачи, Новинки, Халява)
 
 💻 *DeeNet Tech* — (🛒 Скидки на ПК и комплектующие)
 
 🏗️ *DeeNet Construction* — (🏢 Объекты и подряды)
  `;
  
  // Отправляем описание (Markdown)
  if (chatId) {
    await ctx.reply(description, { format: 'markdown' });
  } else if (user?.user_id) {
    await bot.api.sendMessageToUser(user.user_id, description, { format: 'markdown' });
  }

  // Клавиатура с кнопками
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🎮 DeeNet Games', 'menu_games')],
    [Keyboard.button.callback('💻 DeeNet Tech', 'menu_tech')],
    [Keyboard.button.callback('🏗️ DeeNet Construction', 'menu_construction')],
  ]);

  const replyText = 'Выберите раздел:';
  if (chatId) {
    await ctx.reply(replyText, { attachments: [kb] });
  } else if (user?.user_id) {
    await bot.api.sendMessageToUser(user.user_id, replyText, { attachments: [kb] });
  }
  return;
  }
});

// ---------- Callback'и ----------
bot.action('menu_games', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.link('📢 Перейти в канал DeeNet Games', GAMES_CHANNEL_LINK)],
    [Keyboard.button.callback('🔙 Назад', 'menu_back')],
  ]);
  await ctx.reply('🎮 DeeNet Games — скидки на игры.', { attachments: [kb] });
  await ctx.answerOnCallback({ notification: '🎮 DeeNet Games' });
});

bot.action('menu_tech', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.link('💻 Скидки на ПК и комплектующие', TECH_CHANNEL_LINK)],
    [Keyboard.button.callback('🛠️ Подобрать сборку по бюджету', 'budget_start')],
    [Keyboard.button.callback('🔙 Назад', 'menu_back')],
  ]);
  await ctx.reply('💻 DeeNet Tech — выберите действие:', { attachments: [kb] });
  await ctx.answerOnCallback({ notification: '💻 DeeNet Tech' });
});

bot.action('menu_construction', async (ctx) => {
  await ctx.reply('🏗️ Раздел находится в разработке.');
  await ctx.answerOnCallback({ notification: '🏗️ В разработке' });
});

bot.action('menu_back', async (ctx) => {
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🎮 DeeNet Games', 'menu_games')],
    [Keyboard.button.callback('💻 DeeNet Tech', 'menu_tech')],
    [Keyboard.button.callback('🏗️ DeeNet Construction', 'menu_construction')],
  ]);
  await ctx.reply('👋 Главное меню:', { attachments: [kb] });
  await ctx.answerOnCallback({ notification: 'Главное меню' });
});

// ---------- Подбор бюджета ----------
bot.action('budget_start', async (ctx) => {
  (ctx as any).session.step = 'choose_budget';
  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('💰 до 50 000 ₽', 'budget_50000')],
    [Keyboard.button.callback('💰 50 000 – 100 000 ₽', 'budget_100000')],
    [Keyboard.button.callback('💰 более 100 000 ₽', 'budget_150000')],
    [Keyboard.button.callback('🔙 Назад в Tech', 'menu_tech')],
  ]);
  await ctx.reply('🛠️ Выберите примерный бюджет сборки:', { attachments: [kb] });
  await ctx.answerOnCallback({ notification: 'Выбор бюджета' });
});

bot.action(/budget_(.+)/, async (ctx) => {
  const match = ctx.match;
  if (!match) return ctx.answerOnCallback({ notification: 'Ошибка' });
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
  await ctx.reply(recommendation, { attachments: [kb] });
  await ctx.answerOnCallback({ notification: `Бюджет: ${budget}` });
});

// ---------- Вебхук ----------
app.post('/webhook', async (req, res) => {
  try {
    // @ts-ignore
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error('❌ handleUpdate error:', err);
  }
  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('DeeNet Bot is running'));

// ---------- Установка вебхука (ДОБАВЛЕН bot_started) ----------
async function setupWebhook() {
  const token = process.env.BOT_TOKEN;
  const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
  if (!token || !webhookUrl) return;

  const body = JSON.stringify({
    url: webhookUrl,
    update_types: ['message_created', 'message_callback', 'bot_started'], // ← добавили bot_started
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

// ---------- Запуск ----------
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Express server on port ${PORT}`);
  setupWebhook().catch(console.error);
});