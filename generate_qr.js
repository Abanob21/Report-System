const QRCode = require('qrcode');
const fs = require('fs');

const baseURL = 'http://localhost:3000/car/';
const carIDs = ['CAR001', 'CAR002', 'CAR003'];

if (!fs.existsSync('./public/qr')) fs.mkdirSync('./public/qr', { recursive: true });

carIDs.forEach(id => {
    QRCode.toFile(`public/qr/${id}.png`, baseURL + id, function (err) {
        if (err) throw err;
        console.log(`QR Code generated for ${id}`);
    });
});