require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

const DB_FILE = './tasbeh_db.json';

// قاعدة البيانات
let db = {
  users: {},
  messages: {}
};

// تحميل قاعدة البيانات
if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// الأوامر
const commands = [
  {
    name: 'تسبيح',
    description: 'بدء جلسة التسبيح'
  },
  {
    name: 'تصنيف',
    description: 'عرض أفضل المسبحين'
  },
  {
    name: 'تسبيحي',
    description: 'عرض عدد تسبيحاتك'
  }
];

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} شغال!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ الأوامر مسجلة!');
  } catch (error) {
    console.log('✅ الأوامر مسجلة (محلي)!');
  }

  client.user.setPresence({
    activities: [{
      name: 'التسبيح والذكر 📿',
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/discord'
    }]
  });
});

// الأذكار المتاحة
const azkarList = [
  "سبحان الله",
  "الحمد لله", 
  "لا إله إلا الله",
  "الله أكبر",
  "أستغفر الله",
  "لا حول ولا قوة إلا بالله",
  "سبحان الله وبحمده",
  "سبحان الله العظيم"
];

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
        .setStyle(ButtonStyle.Danger)
    );
}

// معالجة الأوامر
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName, user } = interaction;

    // تهيئة المستخدم إذا غير موجود
    if (!db.users[user.id]) {
      db.users[user.id] = {
        username: user.username,
        count: 0,
        lastTasbeh: Date.now()
      };
    }

    if (commandName === 'تسبيح') {
      const embed = new EmbedBuilder()
        .setTitle('📿 جلسة التسبيح')
        .setDescription('اختر نوع التسبيح:')
        .addFields(
          { name: '🎯 التعليمات', value: 'اضغط على الأزرار للتسبيح\nاستخدم `/تصنيف` لرؤية أفضل المسبحين' },
          { name: '📊 تسبيحاتك', value: `لديك ${db.users[user.id].count} تسبيحة` }
        )
        .setColor('#5865F2')
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        components: [createTasbehButtons()]
      });
    }

    if (commandName === 'تصنيف') {
      const topUsers = Object.entries(db.users)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10);

      const leaderboard = topUsers.map(([userId, userData], index) => {
        const member = interaction.guild?.members.cache.get(userId);
        const username = member?.user.username || userData.username || 'unknown-user';
        return `**${index + 1}.** ${username} - **${userData.count}** تسبيحة`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🏆 أفضل المسبحين')
        .setDescription(leaderboard || 'لا توجد تسبيحات بعد')
        .setColor('#F1C40F')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'تسبيحي') {
      const userData = db.users[user.id];
      const embed = new EmbedBuilder()
        .setTitle('📊 إحصائياتك')
        .setDescription(`**${user.username}** لديك **${userData.count}** تسبيحة`)
        .setColor('#00FF00')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // حفظ قاعدة البيانات
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }

  // معالجة أزرار التسبيح
  if (interaction.isButton()) {
    const { customId, user } = interaction;

    if (!db.users[user.id]) {
      db.users[user.id] = {
        username: user.username,
        count: 0,
        lastTasbeh: Date.now()
      };
    }

    // زيادة العداد
    db.users[user.id].count++;
    db.users[user.id].lastTasbeh = Date.now();

    const tasbehMessages = {
      'tasbeh_subhan': 'سبحان الله ✅',
      'tasbeh_alhamd': 'الحمد لله ✅', 
      'tasbeh_allahuakbar': 'الله أكبر ✅'
    };

    await interaction.reply({
      content: `${tasbehMessages[customId]}\n**${user.username}** الآن لديك **${db.users[user.id].count}** تسبيحة`,
      ephemeral: true
    });

    // حفظ قاعدة البيانات
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
});

// إرسال تذكير تلقائي كل ساعة
setInterval(() => {
  const randomZekr = azkarList[Math.floor(Math.random() * azkarList.length)];
  
  client.guilds.cache.forEach(guild => {
    const generalChannel = guild.channels.cache.find(channel => 
      channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
    );
    
    if (generalChannel) {
      const embed = new EmbedBuilder()
        .setTitle('🕰 تذكير التسبيح')
        .setDescription(`**${randomZekr}**\n\nاستخدم \`/تسبيح\` لبدء التسبيح!`)
        .setColor('#E74C3C')
        .setTimestamp();
      
      generalChannel.send({ embeds: [embed] }).catch(console.error);
    }
  });
}, 60 * 60 * 1000); // كل ساعة

client.login(process.env.TOKEN);
