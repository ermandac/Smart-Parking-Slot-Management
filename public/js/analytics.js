// Initialize charts
let occupancyChart;

// Initialize selected period
let selectedPeriod = 'day';

// Update analytics based on selected period
function updateAnalytics(period) {
    // Map select options to server-expected values
    const periodMap = {
        'daily': 'day',
        'weekly': 'week',
        'monthly': 'month'
    };

    selectedPeriod = periodMap[period] || 'day';
    fetchAnalyticsData();
}

// Utility function to handle fetch requests with authentication
async function authenticatedFetch(url, options = {}) {
    // Retrieve token from secure storage
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.token) {
        // No valid session, redirect to login
        window.location.href = '/login.html';
        throw new Error('No active session');
    }

    // Merge default options with provided options
    const fetchOptions = {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await fetch(url, fetchOptions);

        // Check for unauthorized or token-related errors
        if (response.status === 401 || response.status === 403) {
            // Clear session and redirect to login
            localStorage.removeItem('session');
            window.location.href = '/login.html';
            throw new Error('Unauthorized access');
        }

        // Check for other non-OK responses
        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.response = { 
                status: response.status, 
                data: errorText 
            };
            throw error;
        }

        return response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        
        // Show user-friendly error toast
        showToast(`Error: ${error.message}`);
        
        // Rethrow to allow further error handling
        throw error;
    }
}

// Fetch analytics data with improved error handling
async function fetchAnalyticsData() {
    try {
        const data = await authenticatedFetch(`/api/analytics/${selectedPeriod}`);
        
        // Update dashboard with fetched data
        updateDashboard(data);
    } catch (error) {
        console.error('Failed to fetch analytics:', error);
        showToast('Failed to load analytics data');
    }
}

// Update dashboard with data
function updateDashboard(data) {
    updateKPICards(data);
    // Removed updateCharts(data);
}

// Update KPI cards with analytics data
function updateKPICards(data) {
    const elements = {
        totalVehicles: document.getElementById('totalVehicles'),
        avgDuration: document.getElementById('avgDuration'),
        occupancyRate: document.getElementById('occupancyRate'),
        peakHour: document.getElementById('peakHour'),
        peakHourOccupancy: document.getElementById('peakHourOccupancy')
    };

    if (elements.totalVehicles) {
        elements.totalVehicles.textContent = data.totalVehicles || 0;
    }
    if (elements.avgDuration) {
        elements.avgDuration.textContent = `${Math.round(data.avgDuration || 0)} min`;
    }
    if (elements.occupancyRate) {
        elements.occupancyRate.textContent = `${Math.round(data.occupancyRate || 0)}%`;
    }
    if (elements.peakHour) {
        // Format peak hour display
        elements.peakHour.textContent = data.peakHour || '--:--';
    }
    if (elements.peakHourOccupancy) {
        // Display number of vehicles during peak hour
        elements.peakHourOccupancy.textContent = `${data.peakHourVehicles || 0} vehicles`;
    }

    // Update the occupancy timeline chart
    if (data.occupancyTimeline) {
        updateOccupancyChart(data.occupancyTimeline);
    }
}

// Utility function to format time to 12-hour format
function formatTo12Hour(timeStr) {
    if (!timeStr || timeStr === '--:--') return '--:--';
    
    // If it's already in 12-hour format, return as is
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    
    const [hours] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for midnight
    return `${hour12}:00 ${period}`;
}

// Update occupancy timeline chart
function updateOccupancyChart(data) {
    const ctx = document.getElementById('occupancyChart')?.getContext('2d');
    if (!ctx) return;

    if (occupancyChart) {
        occupancyChart.destroy();
    }

    // Ensure values don't exceed 100%
    const values = data.values.map(value => Math.min(value, 100));

    occupancyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Occupancy Rate',
                data: values,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 10,
                    right: 25,
                    top: 25,
                    bottom: 10
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12,
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 12
                        },
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 13
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return `Occupancy: ${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
}

// Function to show toast
function showToast(message, type = 'error') {
    const toast = document.getElementById('liveToast');
    if (!toast) {
        console.warn('Toast element not found');
        return;
    }

    const toastBody = toast.querySelector('.toast-body');
    if (!toastBody) {
        console.warn('Toast body not found');
        return;
    }

    toastBody.textContent = message;
    
    // Add type-specific styling if needed
    toast.classList.remove('bg-danger', 'bg-warning', 'bg-success');
    toast.classList.add(type === 'error' ? 'bg-danger' : 
                         type === 'warning' ? 'bg-warning' : 
                         'bg-success');
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Initialize analytics when time period changes
document.getElementById('timePeriodSelect')?.addEventListener('change', (e) => {
    updateAnalytics(e.target.value);
});

// Initialize analytics on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with daily data
    updateAnalytics('daily');
});
