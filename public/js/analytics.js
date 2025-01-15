// Initialize charts
let occupancyChart;
let slotDistributionChart;

// Initialize selected period
let selectedPeriod = 'day';

// Update analytics based on selected period
function updateAnalytics(period) {
    selectedPeriod = period;
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
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
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
    updateCharts(data);
}

// Update KPI cards
function updateKPICards(data) {
    const elements = {
        totalVehicles: document.getElementById('totalVehicles'),
        avgDuration: document.getElementById('avgDuration'),
        occupancyRate: document.getElementById('occupancyRate'),
        peakHour: document.getElementById('peakHour')
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
        elements.peakHour.textContent = data.peakHour || '--:--';
    }
}

// Update charts
function updateCharts(data) {
    updateOccupancyChart(data.occupancyTimeline || { labels: [], values: [] });
    updateDistributionChart(data.slotDistribution || { shortTerm: 0, mediumTerm: 0, longTerm: 0 });
}

// Update occupancy timeline chart
function updateOccupancyChart(data) {
    const canvas = document.getElementById('occupancyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (occupancyChart) {
        occupancyChart.destroy();
    }

    occupancyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Occupied Slots',
                data: data.values || [],
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 6,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Update slot distribution chart
function updateDistributionChart(data) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (slotDistributionChart) {
        slotDistributionChart.destroy();
    }

    slotDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Short Term', 'Medium Term', 'Long Term'],
            datasets: [{
                data: [
                    data.shortTerm || 0,
                    data.mediumTerm || 0,
                    data.longTerm || 0
                ],
                backgroundColor: [
                    '#0d6efd',
                    '#198754',
                    '#ffc107'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Show toast notification
function showToast(message, type = 'error') {
    const toast = document.getElementById('liveToast');
    if (!toast) return;

    const toastBody = toast.querySelector('.toast-body');
    if (!toastBody) return;

    toastBody.textContent = message;
    toast.classList.remove('bg-success', 'bg-danger');
    toast.classList.add(type === 'error' ? 'bg-danger' : 'bg-success');
    
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
    updateAnalytics('day');
});
