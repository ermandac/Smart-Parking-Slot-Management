const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { ParkingLog } = require('../models');

class ReportService {
    constructor() {
        // No need for parkingDatabase parameter
    }

    // Generate daily parking occupancy report
    async generateDailyReport(date = new Date()) {
        const formattedDate = moment(date).format('YYYY-MM-DD');
        
        // Fetch parking data for the specific date using MongoDB
        const parkingData = await ParkingLog.find({
            entryTime: {
                $gte: moment(date).startOf('day').toDate(),
                $lte: moment(date).endOf('day').toDate()
            }
        });

        // Calculate metrics
        const totalSlots = 6;
        const occupancyData = {
            totalOccupancies: parkingData.length,
            averageOccupancyRate: (parkingData.length / totalSlots) * 100,
            peakHours: this.calculatePeakHours(parkingData),
            longestParkingDurations: this.calculateLongestParkings(parkingData)
        };

        return occupancyData;
    }

    // Calculate peak parking hours
    calculatePeakHours(parkingData) {
        const hourlyOccupancy = new Array(24).fill(0);
        
        parkingData.forEach(entry => {
            const hour = moment(entry.entryTime).hour();
            hourlyOccupancy[hour]++;
        });

        const peakHours = hourlyOccupancy.map((count, hour) => ({
            hour,
            occupancyCount: count
        })).sort((a, b) => b.occupancyCount - a.occupancyCount).slice(0, 3);

        return peakHours;
    }

    // Find longest parking durations
    calculateLongestParkings(parkingData) {
        return parkingData
            .sort((a, b) => (b.exitTime ? b.exitTime - b.entryTime : 0) - (a.exitTime ? a.exitTime - a.entryTime : 0))
            .slice(0, 5);
    }

    // Generate PDF report
    async generatePDFReport(date = new Date()) {
        const reportData = await this.generateDailyReport(date);
        
        // Create a new PDF document
        const doc = new PDFDocument();
        const reportPath = path.join(__dirname, '..', 'reports', `parking_report_${moment(date).format('YYYY-MM-DD')}.pdf`);
        
        // Ensure reports directory exists
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        
        // Pipe the PDF to a file
        doc.pipe(fs.createWriteStream(reportPath));

        // PDF Content
        doc.fontSize(16).text(`Parking Occupancy Report - ${moment(date).format('YYYY-MM-DD')}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12)
            .text(`Total Occupancies: ${reportData.totalOccupancies}`)
            .text(`Average Occupancy Rate: ${reportData.averageOccupancyRate.toFixed(2)}%`);

        doc.moveDown();
        doc.text('Peak Hours:');
        reportData.peakHours.forEach(peak => {
            doc.text(`Hour ${peak.hour}: ${peak.occupancyCount} occupancies`);
        });

        doc.moveDown();
        doc.text('Longest Parking Durations:');
        reportData.longestParkingDurations.forEach((parking, index) => {
            const duration = parking.exitTime 
                ? moment.duration(moment(parking.exitTime).diff(moment(parking.entryTime))).humanize()
                : 'Ongoing';
            doc.text(`${index + 1}. Duration: ${duration}`);
        });

        // Finalize the PDF
        doc.end();

        return reportPath;
    }
}

module.exports = ReportService;
