const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment');

class ReportService {
    constructor(parkingDatabase) {
        this.db = parkingDatabase;
    }

    // Generate daily parking occupancy report
    generateDailyReport(date = new Date()) {
        const formattedDate = moment(date).format('YYYY-MM-DD');
        
        // Fetch parking data for the specific date
        const parkingData = this.db.getParkingDataByDate(formattedDate);

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
            const hour = moment(entry.timestamp).hour();
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
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5);
    }

    // Generate PDF report
    generatePDFReport(reportData) {
        const doc = new PDFDocument();
        const reportPath = path.join(__dirname, '..', 'reports', `parking_report_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
        
        doc.pipe(fs.createWriteStream(reportPath));

        // PDF Report Design
        doc.fontSize(25).text('Parking Occupancy Report', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12)
           .text(`Report Date: ${moment().format('YYYY-MM-DD HH:mm:ss')}`)
           .moveDown();

        doc.text(`Total Occupancies: ${reportData.totalOccupancies}`);
        doc.text(`Average Occupancy Rate: ${reportData.averageOccupancyRate.toFixed(2)}%`);

        // Peak Hours Section
        doc.moveDown();
        doc.fontSize(15).text('Peak Hours', { underline: true });
        reportData.peakHours.forEach(peak => {
            doc.fontSize(12).text(`Hour ${peak.hour}: ${peak.occupancyCount} occupancies`);
        });

        doc.end();

        return reportPath;
    }

    // Export data to CSV
    exportToCSV(reportData) {
        const csvPath = path.join(__dirname, '..', 'reports', `parking_report_${moment().format('YYYYMMDD_HHmmss')}.csv`);
        
        const csvContent = [
            'Metric,Value',
            `Total Occupancies,${reportData.totalOccupancies}`,
            `Average Occupancy Rate,${reportData.averageOccupancyRate.toFixed(2)}%`
        ].join('\n');

        fs.writeFileSync(csvPath, csvContent);

        return csvPath;
    }
}

module.exports = ReportService;
