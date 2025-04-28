const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
const app = express();
const PORT = 3000;

// Configuration
const BASE_URL = 'https://243a-47-152-189-249.ngrok-free.app'; // Your ngrok URL
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// File Upload Setup
const uploadDir = path.join(__dirname, 'public', 'uploads');
const qrDir = path.join(__dirname, 'public', 'qr');
[uploadDir, qrDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5e6 } }).array('unsafeImages[]', 5);

// Generate QR Codes on Startup
(async () => {
  const carIds = Array.from({ length: 200 }, (_, i) => `CAR${String(i + 1).padStart(3, '0')}`);
  console.log('Generating QR codes...');

  for (const unit of carIds) {
    try {
      const url = `${BASE_URL}/car?unit=${encodeURIComponent(unit)}`;
      await QRCode.toFile(
        path.join(qrDir, `${unit}.png`),
        url,
        { width: 300, margin: 2, errorCorrectionLevel: 'H' }
      );
    } catch (err) {
      console.error(`Error generating QR for ${unit}:`, err);
    }
  }
  console.log(`QR codes generated in ${qrDir}`);
})();

// CSV File Management
const csvFiles = {
  car: path.join(__dirname, 'car_data.csv'),
  report: path.join(__dirname, 'report_data.csv'),
  incident: path.join(__dirname, 'incident_data.csv')
};

const csvHeaders = {
  car: 'Time,Car Unit,Driver,Location,Condition,Damage,Maintenance,SafeNext,Mileage,Gas,Shift,Returned,Images',
  report: 'Time,Name,Location,Hour,Status,Notes',
  incident: 'Timestamp,Reporter,Location,PersonsInvolved,IncidentLocation,IncidentTime,Description'
};

// Initialize CSV files
Object.entries(csvFiles).forEach(([name, filePath]) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, csvHeaders[name] + '\n');
  }
});

// Routes
app.get('/', (req, res) => res.render('index'));

// Car Check Form
app.get('/car', (req, res) => {
  const carIds = Array.from({ length: 200 }, (_, i) => `CAR${String(i + 1).padStart(3, '0')}`);
  res.render('form', {
    carIds,
    selectedUnit: req.query.unit,
    error: null,
    conditions: ['Clean Inside', 'Clean Outside', 'Dirty Inside', 'Dirty Outside'],
    maintenanceOptions: ['Drivable', 'Oil Change', 'Tire Change']
  });
});

app.post('/car', (req, res) => {
  upload(req, res, err => {
    const carIds = Array.from({ length: 200 }, (_, i) => `CAR${String(i + 1).padStart(3, '0')}`);
    if (err) return res.render('form', {
      carIds,
      error: err.message,
      conditions: ['Clean Inside', 'Clean Outside', 'Dirty Inside', 'Dirty Outside'],
      maintenanceOptions: ['Drivable', 'Oil Change', 'Tire Change']
    });

    const formData = {
      ...req.body,
      carCondition: [].concat(req.body.carCondition || []).join('; ') || 'None',
      maintenance: [].concat(req.body.maintenance || []).join('; ') || 'None',
      images: (req.files || []).map(f => f.filename).join(';'),
      time: new Date().toLocaleString()
    };

    const csvRow = [
      formData.time,
      formData.carUnitNumber,
      formData.driverName,
      formData.location,
      formData.carCondition,
      formData.damageDescription || 'None',
      formData.maintenance,
      formData.safeForNextShift,
      formData.mileage,
      formData.gasLevel || 'Empty',
      formData.shiftStatus,
      formData.returnedToParking || '',
      formData.images
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');

    fs.appendFileSync(csvFiles.car, csvRow + '\n');
    res.render('confirmation', { error: null, message: 'Car check saved!' });
  });
});

// Hourly Report Routes
app.get('/report', (req, res) => res.render('report'));

app.post('/generate-report', (req, res) => {
  const { name, location, startTime, endTime, status } = req.body;
  if (!name || !location || !startTime || !endTime || !status) {
    return res.status(400).send('All fields required');
  }

  const hours = [];
  let sH = parseInt(startTime.split(':')[0]), eH = parseInt(endTime.split(':')[0]);
  if (eH >= sH) {
    for (let h = sH; h <= eH; h++) hours.push(h);
  } else {
    for (let h = sH; h < 24; h++) hours.push(h);
    for (let h = 0; h <= eH; h++) hours.push(h);
  }

  const rows = hours.map(h => [
    new Date().toLocaleString(),
    name,
    location,
    `${h}:00`,
    status,
    req.body[`notes_${h}`] || ''
  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

  fs.appendFileSync(csvFiles.report, rows.join('\n') + '\n');
  res.render('confirmation', { error: null, message: 'Hourly report saved!' });
});

// Incident Report Routes
app.get('/incident', (req, res) => res.render('incident', { error: null }));

app.post('/incident', (req, res) => {
  const { location, reporterName, personsInvolved, incidentLocation, incidentTime, description } = req.body;
  if (!location || !reporterName || !personsInvolved || !incidentLocation || !incidentTime || !description) {
    return res.render('incident', { error: 'All fields are required' });
  }

  const row = [
    new Date().toLocaleString(),
    reporterName,
    location,
    personsInvolved,
    incidentLocation,
    new Date(incidentTime).toLocaleString(),
    description
  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');

  fs.appendFileSync(csvFiles.incident, row + '\n');
  res.render('confirmation', { error: null, message: 'Incident report saved!' });
});

// Admin Routes
app.get('/admin', (req, res) => res.render('admin-login', { error: null }));

app.post('/admin', (req, res) => {
  if (req.body.password !== 'admin123') {
    return res.render('admin-login', { error: 'Wrong password' });
  }

  // In the admin route handler
  const parseCsv = (filePath, minCols) => {
    try {
      return fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .slice(1)
        .filter(line => line.trim().length > 5)
        .map(line =>
          line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(cell => cell.replace(/^"|"$/g, '').trim()) // Add this line
            .slice(0, minCols)
        )
        .filter(cells => cells.length >= minCols);
    } catch (err) {
      return [];
    }
  };
  
  const data = {
    carRecords: parseCsv(csvFiles.car, 13).map(c => ({
      timestamp: c[0],
      carUnitNumber: c[1],
      driverName: c[2],
      location: c[3],
      carCondition: c[4],
      damageDescription: c[5],
      maintenanceNeeds: c[6],
      safeForNextShift: c[7],
      mileage: c[8],
      gasLevel: c[9],
      shiftStatus: c[10],
      returnedToParking: c[11],
      imagePaths: c[12]?.split(';') || []
    })),
    rptRecords: parseCsv(csvFiles.report, 6).map(c => ({
      timestamp: c[0],
      name: c[1],
      location: c[2],
      reportHour: c[3],
      status: c[4],
      notes: c[5]
    })),
    incidentRecords: parseCsv(csvFiles.incident, 7).map(c => ({
      timestamp: c[0],
      reporter: c[1],
      location: c[2],
      personsInvolved: c[3],
      incidentLocation: c[4],
      incidentTime: c[5],
      description: c[6]
    }))
  };

  res.render('admin', {
    carRecords: data.carRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    rptRecords: data.rptRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    incidentRecords: data.incidentRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`QR codes available at: ${BASE_URL}/qr/CAR001.png`);
});