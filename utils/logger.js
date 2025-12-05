const { EmbedBuilder } = require('discord.js');
const { logChannelId } = require('../config.json');

module.exports = {
    async sendLog(client, guildId, title, desc, color = 'Blue') {
        try {
            const channel = client.channels.cache.get(logChannelId);
            if (!channel) return;
            const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setTimestamp();
            await channel.send({ embeds: [embed] });
        } catch (e) { console.error('[LOGGER ERROR]', e.message); }
    },

    async sendDM(client, userId, messageContent) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) await user.send(messageContent).catch(() => {});
        } catch (e) {}
    }
};