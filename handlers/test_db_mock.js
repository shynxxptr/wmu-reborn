
module.exports = {
    prepare: (query) => {
        return {
            get: (...args) => {
                if (query.includes('SELECT * FROM user_economy')) return { uang_jajan: 1000000, luck_boost: 0 };
                if (query.includes('SELECT uang_jajan FROM user_economy')) return { uang_jajan: 1000000 };
                return null;
            },
            run: (...args) => { },
            all: () => []
        };
    },
    addJackpot: () => { },
    getJackpot: () => 0,
    resetJackpot: () => { }
};
