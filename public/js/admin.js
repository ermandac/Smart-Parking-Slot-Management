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
    
    // Fetch config and initialize
    fetch('/api/config', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
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
        console.error('Error fetching config:', error);
    });
});
