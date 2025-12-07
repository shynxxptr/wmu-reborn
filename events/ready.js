const { Events } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice'); // Import Library Voice
const db = require('../database.js');
const { sendLog, sendDM } = require('../utils/logger.js');
const { updateLiveReport } = require('../handlers/adminHandler.js'); // Import Live Report
const { voiceChannelId } = require('../config.json'); // Import ID Voice

// Definisi Durasi (Detik)
const TIME_24H = 86400;
const TIME_12H = 43200;
const TIME_1H = 3600;
const TIME_30M = 1800;
const TIME_5M = 300;

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`🚀 [BOT ONLINE] Logged in as ${client.user.tag}`);

        // 1. INITIALIZE LIVE REPORT (Update tampilan stok saat bot nyala)
        updateLiveReport(client);

        // 2. JOIN VOICE CHANNEL (24/7)
        if (voiceChannelId) {
            try {
                const channel = client.channels.cache.get(voiceChannelId);
                if (channel) {
                    joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                        selfDeaf: true, // Bot otomatis deafen biar hemat bandwidth
                        selfMute: false
                    });
                    console.log(`🎧 [VOICE] Berhasil masuk ke channel: ${channel.name}`);
                } else {
                    console.warn('⚠️ [VOICE] Channel ID tidak ditemukan/Bot tidak punya akses.');
                }
            } catch (error) {
                console.error('❌ [VOICE ERROR]', error);
            }
        }

        // 3. SCHEDULER (Cek Setiap 1 Menit)
        setInterval(async () => {
            const now = Math.floor(Date.now() / 1000);

            // Ambil semua role aktif
            const activeRoles = db.prepare('SELECT * FROM role_aktif').all();

            for (const r of activeRoles) {
                try {
                    const guild = await client.guilds.fetch(r.guild_id).catch(() => null);
                    if (!guild) continue;

                    // Cek Role di Discord (Self-Healing)
                    const discordRole = await guild.roles.fetch(r.role_id).catch(() => null);

                    // A. SELF HEALING: Jika role dihapus manual/hilang
                    if (!discordRole) {
                        db.prepare('DELETE FROM role_aktif WHERE id = ?').run(r.id);
                        db.prepare('DELETE FROM role_shares WHERE role_id = ?').run(r.role_id);
                        console.log(`[AUTO-CLEAN] Role ID ${r.role_id} hilang dari server.`);
                        continue;
                    }

                    // Hitung Sisa Waktu
                    const sisaWaktu = r.expires_at - now;
                    const roleName = discordRole.name;

                    // B. LOGIKA PERINGATAN (WARNING SYSTEM)
                    let msg = null;
                    let nextLevel = r.warning_sent;

                    // 5 MENIT (URGENT)
                    if (r.warning_sent < 5 && sisaWaktu <= TIME_5M && sisaWaktu > 0) {
                        msg = `🚨 **URGENT: Sisa 5 Menit!**\nRole **"${roleName}"** akan dihapus permanen dalam 5 menit.\n\n⚡ **Segera Perpanjang!**\nSilakan hubungi Owner/Admin sekarang untuk membeli **Perpanjang Harian** agar role tidak hilang.`;
                        nextLevel = 5;
                    }
                    // 30 MENIT
                    else if (r.warning_sent < 4 && sisaWaktu <= TIME_30M && sisaWaktu > TIME_5M) {
                        msg = `⚠️ **Peringatan: 30 Menit Lagi**\nRole **"${roleName}"** akan habis dalam 30 menit.\n\nIngin lanjut pakai? Segera hubungi Owner untuk membeli **Perpanjang Harian**.`;
                        nextLevel = 4;
                    }
                    // 1 JAM
                    else if (r.warning_sent < 3 && sisaWaktu <= TIME_1H && sisaWaktu > TIME_30M) {
                        msg = `⚠️ **Peringatan: 1 Jam Lagi**\nRole **"${roleName}"** tersisa 1 jam.\nSiapkan perpanjangan jika masih ingin menggunakannya.`;
                        nextLevel = 3;
                    }
                    // 12 JAM
                    else if (r.warning_sent < 2 && sisaWaktu <= TIME_12H && sisaWaktu > TIME_1H) {
                        msg = `⏰ **Pengingat: 12 Jam Lagi**\nRole **"${roleName}"** tersisa 12 jam.`;
                        nextLevel = 2;
                    }
                    // 24 JAM
                    else if (r.warning_sent < 1 && sisaWaktu <= TIME_24H && sisaWaktu > TIME_12H) {
                        msg = `📅 **Pengingat: 1 Hari Lagi**\nRole **"${roleName}"** akan habis dalam kurang dari 24 jam.`;
                        nextLevel = 1;
                    }

                    // Eksekusi Kirim DM & Update Level
                    if (msg && nextLevel > r.warning_sent) {
                        await sendDM(client, r.user_id, msg);
                        db.prepare('UPDATE role_aktif SET warning_sent = ? WHERE id = ?').run(nextLevel, r.id);
                        console.log(`[NOTIF] Warning level ${nextLevel} dikirim ke user ${r.user_id}`);
                    }

                    // C. EXPIRED HANDLING (Waktu Habis)
                    if (sisaWaktu <= 0) {
                        try {
                            await discordRole.delete('Role Expired (Auto)');
                        } catch (e) {
                            console.error(`⚠️ [AUTO-CLEAN] Gagal hapus role ${roleName} (${r.role_id}): ${e.message}`);
                            await sendLog(client, r.guild_id, '⚠️ Role Delete Failed', `Bot tidak punya izin menghapus role: ${roleName}\nHarap hapus manual.`, 'Red');
                        }

                        db.prepare('DELETE FROM role_aktif WHERE id = ?').run(r.id);
                        db.prepare('DELETE FROM role_shares WHERE role_id = ?').run(r.role_id);

                        await sendLog(client, r.guild_id, '⏰ Role Expired', `Role: ${roleName}\nUser ID: ${r.user_id}`, 'Grey');
                        await sendDM(client, r.user_id, `⏰ **Role Expired**\nMasa aktif role **"${roleName}"** telah habis dan dihapus otomatis.`);
                    }

                } catch (err) {
                    console.error(`[SCHEDULER ERROR] ID ${r.id}:`, err.message);
                }
            }
        }, 60000); // Loop setiap 60 detik (1 Menit)
    },
};