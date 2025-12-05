const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database.js');
const { TIKET_CONFIG } = require('../../utils/helpers.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-panel') // <--- Pastikan namanya ini
        .setDescription('Panel Admin (Role & Stok).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const roles = db.prepare('SELECT * FROM role_aktif').all();
        let roleOptions = [];
        for (const r of roles.slice(0, 20)) {
            const member = await interaction.guild.members.fetch(r.user_id).catch(() => null);
            roleOptions.push({
                label: member ? member.user.username : `User Left (${r.user_id})`,
                description: `ID: ${r.role_id} | Exp: <t:${r.expires_at}:R>`,
                value: r.role_id.toString()
            });
        }
        
        const stockOptions = Object.keys(TIKET_CONFIG).map(k => ({
            label: `Atur: ${TIKET_CONFIG[k].label}`,
            value: k
        }));

        const rows = [];
        if (roleOptions.length > 0) {
            rows.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('adm_sel_role').setPlaceholder('Kelola User / Role Aktif...').addOptions(roleOptions)
            ));
        }
        
        rows.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('adm_sel_stok').setPlaceholder('Kelola Stok & Harga...').addOptions(stockOptions)
        ));
        
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('stk_Date').setLabel('📅 Set Tanggal Restock').setStyle(ButtonStyle.Secondary)
        ));

        await interaction.editReply({ 
            content: `**Panel Admin V6.0**\nRole Aktif: ${roles.length}\nSilakan pilih menu di bawah:`, 
            components: rows 
        });
    }
};