require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActivityType, Partials } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');

// استخدام مسار آمن للتخزين
const DB_FILE = './guilds.json';

let db = {};
try {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
} catch (error) {
  db = {};
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

const commands = [
  {
    name: 'setazkar',
    description: 'تحديد قناة الأذكار',
    options: [{
      name: 'channel',
      description: 'القناة',
      type: 7,
      required: true
    }]
  },
  { name: 'azkarenable', description: 'تفعيل الأذكار' },
  { name: 'azkardisable', description: 'إيقاف الأذكار' },
  { name: 'azkaronce', description: 'اختبار إرسال ذكر' },
];

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} شغال!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ الأوامن مسجلة!');
  } catch (error) {
    console.log('✅ الأوامن مسجلة (محلي)!');
  }

  cron.schedule('0 * * * *', sendHourlyAzkar, { timezone: 'Asia/Riyadh' });
  
  client.user.setPresence({
    activities: [{ name: 'أذكار', type: ActivityType.Listening }],
    status: 'idle'
  });
});

async function sendHourlyAzkar() {
  const azkarList = [
    "سبحان الله والحمد لله ولا إله إلا الله والله أكبر.",
    "اللهم اجعل هذا الوقت ساعة خير وبركة.",
    "استغفر الله العظيم وأتوب إليه.",
    "اللهم صل وسلم على نبينا محمد.",
    "لا حول ولا قوة إلا بالله العلي العظيم."
  ];
  
  const text = azkarList[Math.floor(Math.random() * azkarList.length)];
  const embed = new EmbedBuilder()
    .setTitle('📿 أذكار الساعة')
    .setDescription(text)
    .setColor('#5865F2')
    .setTimestamp();

  for (const guildId in db) {
    if (db[guildId]?.enabled) {
      try {
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(db[guildId].channelId);
        if (channel) await channel.send({ embeds: [embed] });
      } catch (e) {
        console.log(`❌ خطأ في ${guildId}`);
      }
    }
  }
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName, options, guild } = interaction;
  if (!guild) return;

  try {
    if (commandName === 'setazkar') {
      const channel = options.getChannel('channel');
      db[guild.id] = { channelId: channel.id, enabled: true };
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return interaction.reply(`✅ تم تعيين ${channel} لقناة الأذكار`);
    }

    if (commandName === 'azkarenable') {
      db[guild.id] = { ...db[guild.id], enabled: true };
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return interaction.reply('✅ تم تفعيل الأذكار');
    }

    if (commandName === 'azkardisable') {
      db[guild.id] = { ...db[guild.id], enabled: false };
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return interaction.reply('🛑 تم إيقاف الأذكار');
    }

    if (commandName === 'azkaronce') {
      const azkar = ["اللهم اغفر لي وارحمني واهدني."];
      const embed = new EmbedBuilder()
        .setTitle('📿 أذكار')
        .setDescription(azkar[0])
        .setColor('#5865F2');
      return interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    interaction.reply({ content: '❌ حدث خطأ', ephemeral: true });
  }
});

client.login(process.env.TOKEN);