Security Management System
A comprehensive web application for managing vehicle inspections, generating QR codes for quick access, and maintaining security reports. Features include:

QR Code Integration: Unique QR codes for each vehicle unit

Digital Checklists: Vehicle condition and maintenance tracking

Reporting System: Hourly security reports and incident documentation

Admin Dashboard: Centralized data management with CSV storage

Image Upload: Damage documentation with photo evidence

Built with Node.js, Express, EJS, and Multer. Data persists in CSV files for easy access and portability.

🚀 Installation
Prerequisites
Node.js (v14+)

npm (v6+)

Quick Start

Main Interface: http://localhost:3000

Admin Dashboard: http://localhost:3000/admin (Password: admin123)

Optional: External Access
Install ngrok

bash
npm install -g ngrok
Expose local server

bash
ngrok http 3000
Use the provided ngrok URL to access remotely

🛠️ Features
QR code generation for 200+ vehicle units

Digital inspection forms with image upload

Real-time reporting system

CSV data storage (car_data.csv, report_data.csv, incident_data.csv)

Responsive admin dashboard

🔍 Usage
Scan vehicle QR code or visit /car?unit=CAR001

Submit inspection details through web forms

Access admin dashboard for reports:

Vehicle inspection history

Hourly security logs

Incident reports

📝 Notes
Data persists in CSV files in root directory

Uploaded images stored in public/uploads/

QR codes auto-generated in public/qr/ on server start

Server restart required for new QR code generation
