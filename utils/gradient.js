const { PNG } = require('pngjs');

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return { r, g, b };
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function generateLinearGradient(startHex, endHex, width = 256, height = 256) {
    const c1 = hexToRgb(startHex);
    const c2 = hexToRgb(endHex);
    const png = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const t = x / (width - 1);
            const r = lerp(c1.r, c2.r, t);
            const g = lerp(c1.g, c2.g, t);
            const b = lerp(c1.b, c2.b, t);
            const idx = (width * y + x) << 2;
            png.data[idx] = r;
            png.data[idx + 1] = g;
            png.data[idx + 2] = b;
            png.data[idx + 3] = 255;
        }
    }
    const buffer = PNG.sync.write(png);
    return `data:image/png;base64,${buffer.toString('base64')}`;
}

module.exports = { generateLinearGradient };