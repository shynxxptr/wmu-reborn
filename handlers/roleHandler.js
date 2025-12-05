const { 
    ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ButtonBuilder, ButtonStyle, MessageFlags, UserSelectMenuBuilder, ComponentType, EmbedBuilder
} = require('discord.js');
const axios = require('axios'); // Pastikan axios terinstall

const db = require('../database.js');
const { TIKET_CONFIG, isValidHex } = require('../utils/helpers.js');
const { sendLog, sendDM } = require('../utils/logger.js');

// Helper: Konversi HEX ke Integer
const hexToInt = (hex) => parseInt(hex.replace('#', ''), 16);

module.exports = {
    async handleMenuRole(interaction, client) {
        const userId = interaction.user.id;
        const guild = interaction.guild;

        let finalIcon = null; 

        const safeReply = async (i, payload) => {
            try {
                if (i.replied || i.deferred) await i.editReply(payload);
                else await i.reply(payload);
            } catch (e) { console.log('Reply Error Ignored:', e.message); }
        };

        try {
            // 1. DATA DB
            const roles = db.prepare('SELECT * FROM role_aktif WHERE user_id = ?').all(userId);
            const tikets = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jumlah > 0').all(userId);
            let options = [];

            if (roles.length < 3) {
                tikets.filter(t => TIKET_CONFIG[t.jenis_tiket]?.type === 'duration').forEach(t => {
                    options.push({ label: `🆕 Buat: ${TIKET_CONFIG[t.jenis_tiket].label}`, description: `Sisa: ${t.jumlah}`, value: `create_${t.jenis_tiket}` });
                });
            }
            const hasUbah = tikets.find(t => t.jenis_tiket === 'kartu_ubah');
            const hasGradAddon = tikets.find(t => t.jenis_tiket === 'tiket_gradasi');

            for (const r of roles) {
                const rObj = guild.roles.cache.get(r.role_id);
                const rName = rObj ? rObj.name : 'Role Hilang';
                const shares = db.prepare('SELECT count(*) as total FROM role_shares WHERE role_id = ?').get(r.role_id);
                
                if (hasUbah) options.push({ label: `✏️ Edit: ${rName}`, value: `edit_${r.role_id}` });
                if (hasGradAddon) options.push({ label: `🌈 Pasang Gradasi: ${rName}`, value: `grad_${r.role_id}` });
                if (5 - shares.total > 0) options.push({ label: `👥 Share: ${rName}`, value: `share_${r.role_id}` });
                if (shares.total > 0) options.push({ label: `🚫 Kick Teman: ${rName}`, value: `unshare_${r.role_id}` });
                options.push({ label: `🗑️ Hapus: ${rName}`, value: `del_${r.role_id}` });
            }

            if (!options.length) return safeReply(interaction, { content: '❌ Tidak ada aksi tersedia.', flags: [MessageFlags.Ephemeral] });

            const rowMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('menu').setPlaceholder('Pilih Aksi...').addOptions(options));
            const rowLink = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Cek Warna').setStyle(ButtonStyle.Link).setURL('https://htmlcolorcodes.com/color-picker/'));

            if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const msg = await interaction.editReply({ content: 'Menu Kelola Role:', components: [rowMenu, rowLink] });

            // LISTENER MENU
            let selection;
            try { selection = await msg.awaitMessageComponent({ filter: i => i.user.id === userId, time: 300000 }); } 
            catch { return safeReply(interaction, { content: 'Waktu habis.', components: [] }); }

            const val = selection.values[0];

            // --- SHARE / KICK / DELETE ---
            if (val.startsWith('share_')) {
                // ... (Logic Share) ...
                const rId = val.split('_')[1];
                const uSel = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId('u').setPlaceholder('Pilih teman...').setMaxValues(1));
                const sMsg = await selection.reply({ content: 'Pilih teman:', components: [uSel], flags: [MessageFlags.Ephemeral], fetchReply: true });
                try {
                    const msgRes = sMsg.resource?.message || sMsg;
                    const fSel = await msgRes.awaitMessageComponent({ filter: i => i.user.id === userId, time: 300000, componentType: ComponentType.UserSelect });
                    await fSel.deferUpdate();
                    const fid = fSel.values[0];
                    if (fid === userId) return fSel.editReply('❌ Gabisa ke diri sendiri.');
                    const exist = db.prepare('SELECT * FROM role_shares WHERE role_id = ? AND friend_id = ?').get(rId, fid);
                    if (exist) return fSel.editReply('❌ Sudah di-share.');
                    const friend = await guild.members.fetch(fid).catch(()=>null);
                    if (friend) {
                        await friend.roles.add(rId).catch(() => { throw new Error('Perm'); });
                        db.prepare('INSERT INTO role_shares (role_id, owner_id, friend_id) VALUES (?, ?, ?)').run(rId, userId, fid);
                        await fSel.editReply(`✅ Berhasil share ke **${friend.user.username}**!`);
                        sendDM(client, fid, `🎉 Kamu diberi akses role oleh **${interaction.user.username}**!`);
                    } else await fSel.editReply('❌ User invalid.');
                } catch (e) { if(e.message?.includes('Perm')) selection.editReply('❌ Bot Missing Permissions.'); }
                return;
            }
            if (val.startsWith('unshare_')) {
                // ... (Logic Kick) ...
                const rId = val.split('_')[1];
                const friends = db.prepare('SELECT * FROM role_shares WHERE role_id = ?').all(rId);
                const fOps = friends.map(f => ({ label: f.friend_id, value: f.friend_id }));
                for(let i=0; i<fOps.length; i++) { const u = await client.users.fetch(fOps[i].value).catch(()=>null); if(u) fOps[i].label = u.username; }
                const kRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('k').setPlaceholder('Pilih teman...').addOptions(fOps));
                const kMsg = await selection.reply({ content: 'Kick siapa?', components: [kRow], flags: [MessageFlags.Ephemeral], fetchReply: true });
                try {
                    const msgRes = kMsg.resource?.message || kMsg;
                    const kSel = await msgRes.awaitMessageComponent({ filter: i => i.user.id === userId, time: 300000 });
                    await kSel.deferUpdate();
                    const kid = kSel.values[0];
                    const mem = await guild.members.fetch(kid).catch(()=>null);
                    if (mem) await mem.roles.remove(rId);
                    db.prepare('DELETE FROM role_shares WHERE role_id = ? AND friend_id = ?').run(rId, kid);
                    await kSel.editReply('✅ Dicabut.');
                } catch { return; }
                return;
            }
            if (val.startsWith('del_')) {
                await selection.update({ content: 'ℹ️ Untuk menghapus role, silakan tunggu expired atau hubungi Admin.', components: [] });
                return;
            }

            // --- MODAL INPUT ---
            let mode = 'edit';
            let isPremium = false;

            if (val.startsWith('create')) {
                mode = 'create';
                if (val.includes('10d') || val.includes('30d')) isPremium = true;
            }
            if (val.startsWith('grad')) mode = 'grad';

            const modal = new ModalBuilder().setCustomId('mod').setTitle(mode === 'grad' ? 'Set Gradasi' : 'Input Data Role');

            if (mode === 'edit' || (mode === 'create' && !isPremium)) {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nama Role').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c').setLabel('Warna HEX').setStyle(TextInputStyle.Short).setPlaceholder('#FF0000').setRequired(true).setMinLength(7).setMaxLength(7))
                );
            }
            
            if ((mode === 'create' && isPremium) || mode === 'grad') {
                if (mode === 'create') {
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nama Role').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)));
                }
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hex1').setLabel('Warna Awal (HEX)').setStyle(TextInputStyle.Short).setPlaceholder('#FF0000').setRequired(true).setMinLength(7).setMaxLength(7)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hex2').setLabel('Warna Akhir (HEX)').setStyle(TextInputStyle.Short).setPlaceholder('#0000FF').setRequired(true).setMinLength(7).setMaxLength(7))
                );
            }

            await selection.showModal(modal);
            let sub; try { sub = await selection.awaitModalSubmit({ filter: i => i.user.id === userId, time: 300000 }); } catch { return; }

            const name = sub.fields.fields.has('n') ? sub.fields.getTextInputValue('n') : null;
            const hex = sub.fields.fields.has('c') ? sub.fields.getTextInputValue('c') : null;
            const gStart = sub.fields.fields.has('hex1') ? sub.fields.getTextInputValue('hex1') : null;
            const gEnd = sub.fields.fields.has('hex2') ? sub.fields.getTextInputValue('hex2') : null;

            if (hex && !isValidHex(hex)) return sub.reply({ content: '❌ Format HEX salah.', flags: [MessageFlags.Ephemeral] });
            if (gStart && (!isValidHex(gStart) || !isValidHex(gEnd))) return sub.reply({ content: '❌ Format HEX Gradasi salah.', flags: [MessageFlags.Ephemeral] });

            await sub.deferReply({ flags: [MessageFlags.Ephemeral] });

            // --- UPLOAD IKON (STRICT LOOP) ---
            if (mode !== 'grad') {
                const canIcon = guild.premiumTier >= 2;
                const iRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('uy').setLabel('Upload Ikon').setStyle(ButtonStyle.Success).setEmoji('🖼️').setDisabled(!canIcon),
                    new ButtonBuilder().setCustomId('un').setLabel('Tanpa Ikon').setStyle(ButtonStyle.Secondary)
                );
                const iMsg = await sub.editReply({ content: `Data ok. ${canIcon ? 'Ingin upload ikon?' : 'Ikon nonaktif (Boost < Lv2).'}`, components: [iRow] });
                
                let iSel; try { iSel = await iMsg.awaitMessageComponent({ filter: x => x.user.id === userId, time: 300000 }); } 
                catch { return sub.editReply({ content: '⏳ Waktu habis. Batal.', components: [] }); }

                if (iSel && iSel.customId === 'uy') {
                    let validImage = false;
                    let attempt = 0;
                    await iSel.update({ content: '📤 **Kirim gambar (PNG/JPG) sekarang.**', components: [] });
                    while (!validImage) {
                        if (attempt >= 5) { await interaction.editReply({ content: '❌ Batal.' }); return; }
                        try {
                            const coll = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 60000, errors: ['time'] });
                            const msgUpload = coll.first();
                            if (msgUpload.content.toLowerCase() === 'batal') { await msgUpload.delete().catch(()=>{}); await interaction.editReply('🚫 Dibatalkan.'); return; }
                            if (msgUpload.attachments.size > 0) {
                                const att = msgUpload.attachments.first();
                                if (att.size > 256000) { await msgUpload.delete().catch(()=>{}); await interaction.editReply({ content: `⚠️ Terlalu Besar (>256KB). Kirim ulang.` }); attempt++; continue; }
                                if (att.contentType && att.contentType.startsWith('image/')) {
                                    try {
                                        const response = await axios.get(att.url, { responseType: 'arraybuffer' });
                                        const base64 = Buffer.from(response.data, 'binary').toString('base64');
                                        const mimeType = att.contentType;
                                        finalIcon = `data:${mimeType};base64,${base64}`;
                                        validImage = true;
                                        await msgUpload.delete().catch(()=>{});
                                        await interaction.editReply({ content: '✅ Gambar diterima! Memproses...' });
                                    } catch { await interaction.editReply({ content: '❌ Gagal download.' }); attempt++; }
                                } else { await msgUpload.delete().catch(()=>{}); await interaction.editReply({ content: '⚠️ Bukan gambar!' }); attempt++; }
                            }
                        } catch { await interaction.editReply('⏳ Timeout.'); return; }
                    }
                } else { await iSel.deferUpdate(); await interaction.editReply({ content: '⏩ Tanpa ikon. Memproses...', components: [] }); }
            }

            // --- EKSEKUSI ---
            const targetPos = guild.members.me.roles.highest.position > 1 ? guild.members.me.roles.highest.position - 1 : 1;

            // A. GRADASI (TIKET ADD-ON) - Auto Apply
            if (mode === 'grad') {
                const rId = val.split('_')[1];
                const ro = guild.roles.cache.get(rId);
                if (!ro) return sub.editReply('❌ Role tidak ditemukan.');

                try {
                    await ro.edit({ 
                        colors: { primaryColor: hexToInt(gStart), secondaryColor: hexToInt(gEnd) } 
                    });
                    db.prepare('UPDATE inventaris SET jumlah = jumlah - 1 WHERE user_id = ? AND jenis_tiket = ?').run(userId, 'tiket_gradasi');
                    await sub.editReply('✅ **Gradasi Otomatis Terpasang!**');
                } catch (err) {
                    // Fallback
                    await ro.edit({ color: hexToInt(gStart) });
                    await sub.editReply('⚠️ **Gradasi Gagal** (Server belum support). Role diubah ke warna awal.');
                }
                return;
            }

            // B. EDIT ROLE
            if (mode === 'edit') {
                const rId = val.split('_')[1];
                const ro = await guild.roles.fetch(rId);
                if (!ro) return sub.editReply('❌ Role tidak ditemukan.');
                
                const editData = { name: name, color: hexToInt(hex) }; // Use int for solid
                if (finalIcon) editData.icon = finalIcon;

                try { await ro.edit(editData); } 
                catch (err) { 
                    if(finalIcon) { delete editData.icon; await ro.edit(editData); await sub.followUp({ content: '⚠️ Gambar ditolak. Edit tanpa ikon.', flags: [MessageFlags.Ephemeral] }); } 
                    else throw err; 
                }

                await ro.setPosition(targetPos).catch(()=>{}); 
                db.prepare('UPDATE inventaris SET jumlah = jumlah - 1 WHERE user_id = ? AND jenis_tiket = ?').run(userId, 'kartu_ubah');
                await sub.editReply({ content: '✅ **Sukses!** Role diedit.', components: [] });
                return;
            }

            // C. CREATE ROLE
            const type = val.split('_')[1];
            const config = TIKET_CONFIG[type];
            const duration = config ? (config.duration || config.sec) : null;
            if (!duration) return sub.editReply('❌ Error durasi.');
            const exp = Math.floor(Date.now()/1000) + duration;

            // Data Object
            let createData = { name: name, permissions: [], reason: 'Bot Role', position: targetPos };
            if (finalIcon) createData.icon = finalIcon;

            if (isPremium) {
                 createData.colors = { primaryColor: hexToInt(gStart), secondaryColor: hexToInt(gEnd) };
            } else {
                 createData.color = hexToInt(hex);
            }

            let ro;
            try { 
                ro = await guild.roles.create(createData); 
            } catch (err) {
                // Fallback
                if (isPremium) { delete createData.colors; createData.color = hexToInt(gStart); }
                if (finalIcon) { delete createData.icon; }
                
                try {
                    ro = await guild.roles.create(createData);
                    await sub.followUp({ content: '⚠️ Role dibuat dengan penyesuaian (Gradasi/Ikon ditolak).', flags: [MessageFlags.Ephemeral] });
                } catch (fatal) { throw fatal; }
            }

            await ro.setPosition(targetPos).catch(()=>{});
            
            const trx = db.transaction(()=>{
                db.prepare('INSERT INTO role_aktif (user_id, guild_id, role_id, expires_at) VALUES (?, ?, ?, ?)').run(userId, guild.id, ro.id, exp);
                db.prepare('UPDATE inventaris SET jumlah = jumlah - 1 WHERE user_id = ? AND jenis_tiket = ?').run(userId, type);
            });
            trx();
            
            await interaction.member.roles.add(ro);
            await sub.editReply({ content: '✅ **Role Berhasil Dibuat!**', components: [] });
            
            sendLog(client, guild.id, 'Created', `${userId} create ${name}`, 'Green');
            sendDM(client, userId, `Role ${name} aktif.`);

        } catch (error) {
            console.log('[Handler Error]', error);
            if (typeof sub !== 'undefined') await sub.editReply({ content: `❌ **ERROR:** ${error.message}`, components: [] }).catch(()=>{});
            else await interaction.editReply({ content: `❌ **ERROR:** ${error.message}`, components: [] }).catch(()=>{});
        }
    },
    // Placeholder agar tidak error di interactionCreate.js
    async handleGradasiRequest(i) { await i.reply({ content: 'Fitur ini sudah otomatis.', flags: [MessageFlags.Ephemeral] }); }
};