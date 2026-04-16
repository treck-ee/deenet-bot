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

// ========== ДИАГНОСТИЧЕСКИЙ ОБРАБОТЧИК (ОТВЕЧАЕТ НА ВСЁ) ==========
bot.on('message_created', async (ctx) => {
  const msg = ctx.message as any;
  const chat = ctx.chat as any;
  const user = ctx.user as any;

  console.log('🔍 Диагностика:');
  console.log('  text:', msg?.body?.text);
  console.log('  chat_id:', chat?.chat_id);
  console.log('  user_id:', user?.user_id);

  // Обрабатываем /start вручную
  if (msg?.body?.text === '/start') {
    console.log('⚠️ Ручная обработка /start');
    const kb = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('🎮 DeeNet Games', 'menu_games')],
      [Keyboard.button.callback('💻 DeeNet Tech', 'menu_tech')],
      [Keyboard.button.callback('🏗️ DeeNet construction', 'menu_construction')],
    ]);
    await ctx.reply('👋 Добро пожаловать! (ручной режим)', { keyboard: kb } as any);
    return;
  }

  // На любое другое сообщение отвечаем эхом
  await ctx.reply(`Получено: "${msg?.body?.text}"`);
});

// ---------- Остальные обработчики (пока не активны, но их можно вернуть) ----------
// ... (здесь могут быть menu_games, menu_tech и т.д., они будут работать после отладки)

// ---------- ВЕБХУК ЭНДПОИНТ ----------
app.post('/webhook', async (req, res) => {
  console.log('📨 Webhook received');
  try {
    // @ts-ignore — метод приватный, но работает
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