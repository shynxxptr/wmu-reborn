# 🏫 Warung Mang Ujang : Reborn Bot

Bot ekonomi Discord dengan berbagai game dan fitur seru untuk komunitas sekolah.

---

## 🚀 QUICK START

### **Untuk User Baru:**
1. Ketik `!cekdompet` di Discord
2. Akunmu akan otomatis dibuat
3. Mulai kerja dengan `!bantujualan` atau main game dengan `!cf 1000`
4. Baca panduan lengkap: [USER_GUIDE_NEW_PLAYERS.md](./USER_GUIDE_NEW_PLAYERS.md)

### **Untuk Developer/Admin:**
1. Install dependencies: `npm install`
2. Setup `.env` file (lihat `.env.example`)
3. Run: `node index.js` atau `pm2 start index.js`
4. Baca deployment guide: [VPS_DEPLOYMENT_CHECKLIST.md](./VPS_DEPLOYMENT_CHECKLIST.md)

---

## 📋 FEATURES

### **🎮 Games:**
- 🪙 Coinflip (dengan streak system)
- 🎰 Slots (dengan timing mechanic)
- 📈 Crash/Saham (dengan warning system)
- 💣 Minesweeper (dengan combo system)
- 🧮 Math Game (dengan difficulty scaling)
- 🎰 BigSlot (5x6 grid dengan free spins)
- 🃏 Blackjack

### **💰 Economy:**
- 💼 Job system (ojek, ojol, tukang, dll)
- 🏦 Banking system (deposit, withdraw, loan)
- 💎 Luxury items shop
- 🏫 Geng system (school gang)
- 📊 Statistics & achievements
- 🎯 Daily challenges

### **📊 Social:**
- 🏆 Leaderboard (richest, combo, streak, win rate)
- 👥 Geng system dengan shared bank
- 🎖️ Achievement system
- 📈 Progress tracking

---

## 🛠️ SETUP

### **Requirements:**
- Node.js 18+
- Discord Bot Token
- SQLite (auto-created)

### **Installation:**
```bash
npm install
```

### **Configuration:**
1. Copy `.env.example` ke `.env`
2. Isi `BOT_TOKEN` dan config lainnya
3. Run: `node index.js`

### **PM2 (Production):**
```bash
pm2 start index.js --name "warung-bot"
pm2 save
pm2 startup
```

---

## 📚 DOCUMENTATION

- [USER_GUIDE_NEW_PLAYERS.md](./USER_GUIDE_NEW_PLAYERS.md) - Panduan untuk user baru
- [VPS_DEPLOYMENT_CHECKLIST.md](./VPS_DEPLOYMENT_CHECKLIST.md) - Deployment guide
- [GAME_VISUAL_ENHANCEMENTS.md](./GAME_VISUAL_ENHANCEMENTS.md) - Visual features
- [FINAL_BUG_FIXES.md](./FINAL_BUG_FIXES.md) - Bug fixes

---

## ⚙️ ENVIRONMENT VARIABLES

```env
BOT_TOKEN=your_bot_token
CLIENT_ID=your_client_id
ADMIN_PASSWORD=your_password
SESSION_SECRET=random_secret
PORT=2560
NODE_ENV=production
```

---

## 🎯 COMMANDS

### **Economy:**
- `!cekdompet` - Cek saldo
- `!bantujualan` / `!nyapulapangan` / `!pungutsampah` / dll - Kerja
- `!bank` - Banking

### **Games:**
- `!cf <amount>` - Coinflip
- `!slots <amount>` - Slots
- `!saham <amount>` - Crash
- `!bom <amount>` - Minesweeper
- `!math <amount>` - Math Game
- `!bigslot <amount>` - BigSlot
- `!bj <amount>` - Blackjack

### **Stats:**
- `!pencapaian` - Statistics
- `!achievements` - Achievements
- `!claim` - Claim rewards
- `!challenge` - Daily challenges

### **Luxury & Geng:**
- `!luxury` - Luxury shop
- `!buffs` - Active buffs
- `!geng create <nama>` - Buat geng
- `!geng info` - Info geng

---

## 📊 STATISTICS

- ✅ All games balanced (40-45% win rate, 85-90% RTP)
- ✅ Max bet: 10,000,000
- ✅ Wealth limiter system (rungkad)
- ✅ Achievement system
- ✅ Daily challenges
- ✅ Visual enhancements

---

## 🔒 SECURITY

- ✅ Input validation
- ✅ Rate limiting
- ✅ Error handling
- ✅ SQL injection protection
- ✅ XSS protection

---

## 📝 LICENSE

ISC

---

**Version:** 2.4 (Production Ready)
**Last Updated:** Sekarang

