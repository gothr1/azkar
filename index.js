require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');

const DB_FILE = './guilds.json';
const TASBEH_DB_FILE = './tasbeh_db.json';

// قواعد البيانات
let db = {
  guilds: {}
};
let tasbehDb = {
  users: {}
};

// تحميل قواعد البيانات
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (error) {
    console.log('إنشاء قاعدة بيانات جديدة للأذكار');
  }
}

if (fs.existsSync(TASBEH_DB_FILE)) {
  try {
    tasbehDb = JSON.parse(fs.readFileSync(TASBEH_DB_FILE, 'utf8'));
  } catch (error) {
    console.log('إنشاء قاعدة بيانات جديدة للتسبيح');
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// جميع الأوامر المدمجة
const commands = [
  // أوامر الأذكار التلقائية
  {
    name: 'setazkar',
    description: 'تحديد قناة الأذكار التلقائية'
  },
  {
    name: 'azkarenable',
    description: 'تفعيل الأذكار التلقائية'
  },
  {
    name: 'azkardisable', 
    description: 'إيقاف الأذكار التلقائية'
  },
  {
    name: 'azkaronce',
    description: 'إرسال ذكر الآن'
  },
  
  // أوامر التسبيح اليدوي
  {
    name: 'تسبيح',
    description: 'بدء جلسة التسبيح اليدوي'
  },
  {
    name: 'تصنيف',
    description: 'عرض أفضل المسبحين'
  },
  {
    name: 'تسبيحي',
    description: 'عرض عدد تسبيحاتك'
  },
  
  // أمر المساعدة
  {
    name: 'help',
    description: 'عرض جميع أوامر البوت'
  }
];

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} شغال!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ تم تسجيل ${commands.length} أمر!`);
  } catch (error) {
    console.log('❌ خطأ في تسجيل الأوامر:', error);
  }

  // جدولة الأذكار التلقائية كل 30 دقيقة
  cron.schedule('*/30 * * * *', sendAutoAzkar, { timezone: 'Asia/Riyadh' });
  console.log('⏰ تم جدولة الأذكار التلقائية كل 30 دقيقة');

  client.user.setPresence({
    activities: [{
      name: 'الأذكار والتسبيح 📿',
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/discord'
    }]
  });
});

// إنشاء أزرار التسبيح
function createTasbehButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('tasbeh_subhan')
        .setLabel('سبحان الله')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('tasbeh_alhamd')
        .setLabel('الحمد لله')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('tasbeh_allahuakbar')
        .setLabel('الله أكبر')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('tasbeh_astaghfir')
        .setLabel('أستغفر الله')
        .setStyle(ButtonStyle.Secondary)
    );
}

// وظيفة الأذكار التلقائية
async function sendAutoAzkar() {
  console.log('🕒 إرسال الأذكار التلقائية...');
  
  const azkarList = [
    "سبحان الله والحمد لله ولا إله إلا الله والله أكبر.",
    "اللهم اجعل هذا الوقت ساعة خير وبركة.",
    "استغفر الله العظيم وأتوب إليه.",
    "اللهم صل وسلم على نبينا محمد.",
    "لا حول ولا قوة إلا بالله العلي العظيم.",
    "سبحان الله وبحمده، سبحان الله العظيم.",
    "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم."
  ];
  
  const text = azkarList[Math.floor(Math.random() * azkarList.length)];
  const embed = new EmbedBuilder()
    .setTitle('📿 أذكار نصف الساعة')
    .setDescription(text)
    .setColor('#5865F2')
    .setTimestamp();

  let sentCount = 0;

  for (const guildId in db.guilds) {
    if (db.guilds[guildId]?.enabled && db.guilds[guildId]?.channelId) {
      try {
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(db.guilds[guildId].channelId);
        if (channel) {
          await channel.send({ embeds: [embed] });
          sentCount++;
        }
      } catch (e) {
        console.log(`❌ خطأ في إرسال الأذكار لـ ${guildId}`);
      }
    }
  }
  
  console.log(`✅ تم إرسال ${sentCount} ذكر تلقائي`);
}

// معالجة جميع الأوامر
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName, user, options, guild } = interaction;

    // 🔊 أوامر الأذكار التلقائية
    if (commandName === 'setazkar') {
      const channel = options.getChannel('channel');
      if (!db.guilds[guild.id]) db.guilds[guild.id] = {};
      db.guilds[guild.id].channelId = channel.id;
      db.guilds[guild.id].enabled = true;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return interaction.reply(`✅ تم تعيين ${channel} لقناة الأذكار التلقائية`);
    }

    if (commandName === 'azkarenable') {
      if (!db.guilds[guild.id]) db.guilds[guild.id] = {};
      db.guilds[guild.id].enabled = true;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return interaction.reply('✅ تم تفعيل الأذكار التلقائية كل 30 دقيقة');
    }

    if (commandName === 'azkardisable') {
      if (!db.guilds[guild.id]) db.guilds[guild.id] = {};
      db.guilds[guild.id].enabled = false;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return interaction.reply('🛑 تم إيقاف الأذكار التلقائية');
    }

    if (commandName === 'azkaronce') {
      const azkar = ["اللهم اغفر لي وارحمني واهدني."];
      const embed = new EmbedBuilder()
        .setTitle('📿 أذكار')
        .setDescription(azkar[0])
        .setColor('#5865F2');
      return interaction.reply({ embeds: [embed] });
    }

    // 🎯 أوامر التسبيح اليدوي
    if (commandName === 'تسبيح') {
      if (!tasbehDb.users[user.id]) {
        tasbehDb.users[user.id] = {
          username: user.username,
          count: 0,
          lastTasbeh: Date.now()
        };
      }

      const embed = new EmbedBuilder()
        .setTitle('📿 جلسة التسبيح اليدوي')
        .setDescription('اختر نوع التسبيح:')
        .addFields(
          { name: '🎯 التعليمات', value: 'اضغط على الأزرار للتسبيح\nاستخدم `/تصنيف` لرؤية أفضل المسبحين' },
          { name: '📊 تسبيحاتك', value: `لديك ${tasbehDb.users[user.id].count} تسبيحة` }
        )
        .setColor('#5865F2')
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        components: [createTasbehButtons()]
      });
    }

    if (commandName === 'تصنيف') {
      const topUsers = Object.entries(tasbehDb.users)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10);

      const leaderboard = topUsers.map(([userId, userData], index) => {
        const username = userData.username || 'unknown-user';
        return `**${index + 1}.** ${username} - **${userData.count}** تسبيحة`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🏆 أفضل المسبحين')
        .setDescription(leaderboard || 'لا توجد تسبيحات بعد')
        .setColor('#F1C40F')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'تسبيحي') {
      const userData = tasbehDb.users[user.id] || { count: 0 };
      const embed = new EmbedBuilder()
        .setTitle('📊 إحصائياتك')
        .setDescription(`**${user.username}** لديك **${userData.count}** تسبيحة`)
        .setColor('#00FF00')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // 🆘 أمر المساعدة
    if (commandName === 'help') {
      const helpEmbed = new EmbedBuilder()
        .setTitle('🆘 أوامر بوت الأذكار والتسبيح')
        .setDescription('**جميع أوامر البوت:**')
        .addFields(
          { name: '📖 الأذكار التلقائية', value: '`/setazkar` - تعيين قناة\n`/azkarenable` - تفعيل\n`/azkardisable` - إيقاف\n`/azkaronce` - اختبار' },
          { name: '🎯 التسبيح اليدوي', value: '`/تسبيح` - بدء الجلسة\n`/تصنيف` - أفضل المسبحين\n`/تسبيحي` - إحصائياتك' },
          { name: '🆘 المساعدة', value: '`/help` - عرض هذه القائمة' }
        )
        .addFields(
          { name: '🎯 كيف تستخدم البوت؟', value: '**للأذكار التلقائية:**\n1. `/setazkar` لتعيين القناة\n2. `/azkarenable` للتشغيل\n\n**للتسبيح اليدوي:**\n1. `/تسبيح` لبدء الجلسة\n2. اضغط على الأزرار' },
          { name: '📝 ملاحظات', value: '- الأذكار تطلع كل 30 دقيقة تلقائياً\n- التسبيح اليدوي يحفظ إحصائياتك\n- البوت يدعم النظامين معاً' }
        )
        .setColor('#9B59B6')
        .setFooter({ text: 'بوت الأذكار والتسبيح - ذكر الله يزيد الإيمان' })
        .setTimestamp();

      await interaction.reply({ embeds: [helpEmbed] });
    }

    // حفظ قواعد البيانات
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    fs.writeFileSync(TASBEH_DB_FILE, JSON.stringify(tasbehDb, null, 2));
  }

  // معالجة أزرار التسبيح
  if (interaction.isButton()) {
    const { customId, user } = interaction;

    if (!tasbehDb.users[user.id]) {
      tasbehDb.users[user.id] = {
        username: user.username,
        count: 0,
        lastTasbeh: Date.now()
      };
    }

    // زيادة العداد
    tasbehDb.users[user.id].count++;
    tasbehDb.users[user.id].lastTasbeh = Date.now();

    const tasbehMessages = {
      'tasbeh_subhan': 'سبحان الله ✅',
      'tasbeh_alhamd': 'الحمد لله ✅', 
      'tasbeh_allahuakbar': 'الله أكبر ✅',
      'tasbeh_astaghfir': 'أستغفر الله ✅'
    };

    await interaction.reply({
      content: `${tasbehMessages[customId]}\n**${user.username}** الآن لديك **${tasbehDb.users[user.id].count}** تسبيحة`,
      ephemeral: true
    });

    // حفظ قاعدة البيانات
    fs.writeFileSync(TASBEH_DB_FILE, JSON.stringify(tasbehDb, null, 2));
  }
});

client.login(process.env.TOKEN);
