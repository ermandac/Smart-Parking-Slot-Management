// Global variables for session management
let warningTimeout;
let logoutTimeout;
let sessionConfig = {
    timeoutMinutes: 30,          // Default 30 minutes
    warningMinutes: 1,           // Default 1 minute warning
    countdownDuration: 30        // Default 30 seconds
};

// Function to update slot status and timestamp
function updateSlotStatus(slotId, isOccupied) {
    const slot = document.getElementById(`slot-${slotId}`);
    if (!slot) return;

    const statusText = slot.querySelector('.status-text');
    const carIcon = slot.querySelector('.car-icon');
    const timestamp = slot.querySelector(`#slot-${slotId}-timestamp`);

    if (isOccupied) {
        statusText.textContent = 'Occupied';
        statusText.className = 'card-text status-text text-danger';
        carIcon.className = 'fas fa-car-side fa-3x car-icon text-primary mb-3';
        timestamp.textContent = new Date().toLocaleTimeString();
    } else {
        statusText.textContent = 'Available';
        statusText.className = 'card-text status-text text-success';
        carIcon.className = 'fas fa-car-side fa-3x car-icon text-muted mb-3';
        timestamp.textContent = '';
    }

    updateParkingStatus();
}

// Function to update overall parking status
function updateParkingStatus() {
    const slots = document.querySelectorAll('.parking-slot');
    const occupiedSlots = Array.from(slots).filter(slot => 
        slot.querySelector('.status-text').textContent === 'Occupied'
    ).length;

    const totalSlotsElement = document.getElementById('total-slots');
    const occupiedSlotsElement = document.getElementById('occupied-slots');
    const availableSlotsElement = document.getElementById('available-slots');

    if (totalSlotsElement) totalSlotsElement.textContent = slots.length;
    if (occupiedSlotsElement) occupiedSlotsElement.textContent = occupiedSlots;
    if (availableSlotsElement) availableSlotsElement.textContent = slots.length - occupiedSlots;
}

// Function to simulate vehicle detection
function simulateVehicleDetection(slotId, isOccupied = true) {
    updateSlotStatus(slotId, isOccupied);
    showToast(`Slot ${slotId} is now ${isOccupied ? 'Occupied' : 'Available'}`);
}

// Function to simulate all slots occupied
function simulateAllOccupied() {
    for (let i = 1; i <= 6; i++) {
        updateSlotStatus(i, true);
    }
    showToast('All slots are now occupied');
}

// Function to simulate all slots available
function simulateAllAvailable() {
    for (let i = 1; i <= 6; i++) {
        updateSlotStatus(i, false);
    }
    showToast('All slots are now available');
}

// Function to show toast notification
function showToast(message) {
    const toast = document.getElementById('liveToast');
    if (!toast) return;

    const toastBody = toast.querySelector('.toast-body');
    if (!toastBody) return;

    toastBody.textContent = message;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
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

// Initialize parking slots grid
function initializeParkingSlots() {
    const grid = document.getElementById('parkingSlotsGrid');
    if (!grid) return;

    grid.innerHTML = ''; // Clear existing slots

    for (let i = 1; i <= 6; i++) {
        const slotHtml = `
            <div class="col-md-4 parking-slot" id="slot-${i}">
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-car-side fa-3x car-icon text-muted mb-3"></i>
                        <h5 class="card-title">Parking Slot ${i}</h5>
                        <p class="card-text status-text text-success">Available</p>
                        <small class="text-muted timestamp d-block mt-2" id="slot-${i}-timestamp"></small>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', slotHtml);
    }

    updateParkingStatus();
}

// Function to handle logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeParkingSlots();
    
    // Fetch config using authenticatedFetch
    authenticatedFetch('/api/config')
        .then(config => {
            // Hide vehicle simulation controls if disabled
            if (!config.showVehicleSimulationControls) {
                const simulationControls = document.querySelector('.vehicle-simulation-controls');
                if (simulationControls) {
                    simulationControls.style.display = 'none';
                }
            }

            // Update session timeout config
            if (config.sessionTimeout) {
                sessionConfig.timeoutMinutes = config.sessionTimeout;
            }
            if (config.gracePeriod) {
                sessionConfig.countdownDuration = config.gracePeriod;
            }
        })
        .catch(error => {
            console.error('Config fetch error:', error);
            // Optionally show a more specific error message
            showToast('Failed to load configuration');
        });
});
