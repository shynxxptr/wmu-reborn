module.exports = {
    MAX_ROLE_SLOTS: 3,

    TIKET_CONFIG: {
        // PASTIKAN KATA KUNCINYA ADALAH 'duration'
        '1d': { label: 'Tiket 1 Hari', duration: 86400, type: 'duration' },
        '3d': { label: 'Tiket 3 Hari', duration: 259200, type: 'duration' },
        '7d': { label: 'Tiket 7 Hari', duration: 604800, type: 'duration' },
        '10d': { label: 'Tiket 10 Hari (Premium)', duration: 864000, type: 'duration' },
        '30d': { label: 'Tiket 30 Hari (Premium)', duration: 2592000, type: 'duration' },
        'kartu_ubah': { label: 'Kartu Ubah Role', duration: 0, type: 'utility' },
        'tiket_gradasi': { label: 'Tiket Request Gradasi', duration: 0, type: 'utility' }
    },

    isValidHex: (color) => /^#[0-9A-Fa-f]{6}$/.test(color),

    parseDuration: (str) => {
        const regex = /(\d+)(d|h|m)/g;
        let totalSeconds = 0;
        let match;
        while ((match = regex.exec(str)) !== null) {
            const num = parseInt(match[1]);
            const unit = match[2];
            if (unit === 'd') totalSeconds += num * 86400;
            else if (unit === 'h') totalSeconds += num * 3600;
            else if (unit === 'm') totalSeconds += num * 60;
        }
        return totalSeconds;
    },

    formatMoney: (amount) => {
        if (amount >= 1000000000000) return (amount / 1000000000000).toFixed(1) + 'T';
        if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'M';
        if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'jt';
        if (amount >= 1000) return (amount / 1000).toFixed(1) + 'k';
        return amount.toString();
    }
};