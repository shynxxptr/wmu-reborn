const missionHandler = require('../../handlers/missionHandler.js');

module.exports = {
    data: {
        name: '!misi',
        description: 'Cek atau klaim misi harian',
    },
    async execute(message, args) {
        await missionHandler.handleMission(message, '!misi', args);
    }
};
