const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

async function generateCard(khodamName, rarity) {
    // 1. Setup Paths
    const safeName = khodamName.toLowerCase().replace(/ /g, '_');
    const framePath = path.join(__dirname, `../assets/khodam/frames/${rarity.toLowerCase().replace(/ /g, '_')}.png`);
    const imagePath = path.join(__dirname, `../assets/khodam/images/${safeName}.png`);

    // 2. Load Frame (Base)
    // If frame doesn't exist, fallback to Normal or return null? 
    // For now, assume frames exist as we generated them.
    if (!fs.existsSync(framePath)) {
        console.error(`Frame not found: ${framePath}`);
        return null;
    }
    const frame = await loadImage(framePath);

    // 3. Create Canvas
    // 3. Create Canvas
    const canvas = createCanvas(frame.width, frame.height);
    const ctx = canvas.getContext('2d');

    // 4. Draw Frame (Layer 1 - Background)
    ctx.drawImage(frame, 0, 0, frame.width, frame.height);

    // 5. Draw Khodam Image (Layer 2 - Foreground)
    if (fs.existsSync(imagePath)) {
        const image = await loadImage(imagePath);

        // Position: Center Horizontal, slightly above center Vertical
        // Assuming the "Art Box" is roughly in the upper middle.
        const targetWidth = frame.width * 0.55; // 55% of card width
        const targetHeight = targetWidth; // Square
        const x = (frame.width - targetWidth) / 2;
        const y = (frame.height * 0.2); // 20% from top

        // Draw Image
        ctx.drawImage(image, x, y, targetWidth, targetHeight);

        // Add Border to Image
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, targetWidth, targetHeight);

        ctx.strokeStyle = '#FFD700'; // Gold inner border
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, targetWidth, targetHeight);
    }

    return canvas.toBuffer();

    // Wait, if we draw frame last and it's opaque, it covers the image.
    // If we draw frame first, the image is on top.
    // Let's draw Frame first, then Image on top.
    // To make it look "integrated", maybe add a simple border or shadow to the image?

    // REVISED STRATEGY:
    // 1. Draw Frame (Background)
    // 2. Draw Image (Centered, slightly smaller)

    // Note: If the generated "Frame" already has text/art, drawing over it might look messy.
    // But this is the best we can do without precise templates.

    return canvas.toBuffer();
}

module.exports = { generateCard };
