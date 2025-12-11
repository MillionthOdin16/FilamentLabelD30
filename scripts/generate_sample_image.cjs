
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 800;
const height = 600;
const canvas = createCanvas(width, height);
const context = canvas.getContext('2d');

// Background
context.fillStyle = '#333';
context.fillRect(0, 0, width, height);

// Label
context.fillStyle = '#fff';
context.fillRect(100, 100, 600, 400);

// Text
context.fillStyle = '#000';
context.font = 'bold 60px Arial';
context.fillText('OVERTURE', 150, 200);

context.font = '40px Arial';
context.fillText('PLA Professional', 150, 280);
context.fillText('Color: Red', 150, 340);
context.fillText('Nozzle: 200-220°C', 150, 400);
context.fillText('Bed: 50-60°C', 150, 460);

const buffer = canvas.toBuffer('image/png');
const filepath = path.join(__dirname, '../tests/fixtures/sample_spool.png');
fs.writeFileSync(filepath, buffer);
console.log('Generated sample_spool.png');
