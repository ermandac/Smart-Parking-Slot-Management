// Global variables for session management
let warningTimeout;
let logoutTimeout;
let sessionConfig = {
    timeoutMinutes: 30,          // Default 30 minutes
    warningMinutes: 1,           // Default 1 minute warning
    countdownDuration: 30        // Default 30 seconds
};

// Function to update a specific parking slot's status
async function updateSlotStatus(slotId, isOccupied) {
    try {
        console.log(`Attempting to update slot ${slotId} to ${isOccupied ? 'occupied' : 'available'}`);
        
        const response = await authenticatedFetch(`/api/simulate-slot/${slotId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                occupied: isOccupied 
            })
        });

        console.log('Slot update response:', response);

        // Refresh the entire slot status after update
        await fetchParkingSlotStatus();

        // Show success toast
        showToast(`Slot ${slotId} marked as ${isOccupied ? 'Occupied' : 'Available'}`, 
                  isOccupied ? 'warning' : 'success');

        return response;
    } catch (error) {
        console.error(`Failed to update slot ${slotId}:`, error);
        
        // More detailed error handling
        if (error.response) {
            // The request was made and the server responded with a status code
            showToast(`Failed to update slot: ${error.response.data.error || 'Unknown error'}`, 'error');
        } else if (error.request) {
            // The request was made but no response was received
            showToast('No response from server when updating slot', 'error');
        } else {
            // Something happened in setting up the request
            showToast('Error setting up slot update request', 'error');
        }
        
        throw error;
    }
}

// Function to fetch parking slot status
async function fetchParkingSlotStatus() {
    try {
        console.log('Fetching parking slot status');
        const response = await authenticatedFetch('/api/parking-slots');
        
        console.log('Parking slots response:', response);
        const slots = response.slots;

        // Ensure slots exist
        if (!slots || slots.length === 0) {
            console.warn('No parking slots found');
            return;
        }

        // Update each slot's status
        slots.forEach(slot => {
            const slotElement = document.getElementById(`slot-${slot.slotNumber}`);
            if (slotElement) {
                const statusText = slotElement.querySelector('.status-text');
                const carIcon = slotElement.querySelector('.car-icon');
                const timestampElement = slotElement.querySelector('.timestamp');

                // Update status visually
                if (slot.status === 'occupied') {
                    statusText.textContent = 'Occupied';
                    statusText.classList.remove('text-success');
                    statusText.classList.add('text-danger');
                    carIcon.classList.remove('text-muted');
                    carIcon.classList.add('text-danger');
                    
                    // Add timestamp if vehicle details exist
                    if (slot.currentVehicle && slot.currentVehicle.entryTime) {
                        timestampElement.textContent = new Date(slot.currentVehicle.entryTime).toLocaleString();
                    }
                } else {
                    statusText.textContent = 'Available';
                    statusText.classList.remove('text-danger');
                    statusText.classList.add('text-success');
                    carIcon.classList.remove('text-danger');
                    carIcon.classList.add('text-muted');
                    timestampElement.textContent = '';
                }
            }
        });

        // Update overall slot counts
        const totalSlots = slots.length;
        const occupiedSlots = slots.filter(slot => slot.status === 'occupied').length;
        const availableSlots = totalSlots - occupiedSlots;

        // Update dashboard counters
        const totalSlotsElement = document.getElementById('total-slots');
        const occupiedSlotsElement = document.getElementById('occupied-slots');
        const availableSlotsElement = document.getElementById('available-slots');

        if (totalSlotsElement) totalSlotsElement.textContent = totalSlots;
        if (occupiedSlotsElement) occupiedSlotsElement.textContent = occupiedSlots;
        if (availableSlotsElement) availableSlotsElement.textContent = availableSlots;

    } catch (error) {
        console.error('Failed to fetch parking slot status:', error);
        showToast('Failed to load parking slot status', 'error');
    }
}

// Initialize parking slots grid
function initializeParkingSlots() {
    const parkingSlotsGrid = document.getElementById('parkingSlotsGrid');
    
    // Clear existing slots to prevent duplication
    parkingSlotsGrid.innerHTML = '';

    // Create 6 parking slots
    for (let i = 1; i <= 6; i++) {
        const slotElement = document.createElement('div');
        slotElement.className = 'col-md-4 parking-slot';
        slotElement.id = `slot-${i}`;
        
        slotElement.innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <i class="fas fa-car-side fa-3x car-icon text-muted mb-3"></i>
                    <h5 class="card-title">Parking Slot ${i}</h5>
                    <p class="card-text status-text text-success">Available</p>
                    <small class="text-muted timestamp d-block mt-2" id="slot-${i}-timestamp"></small>
                </div>
            </div>
        `;
        
        parkingSlotsGrid.appendChild(slotElement);
    }

    // Fetch initial slot status after initialization
    fetchParkingSlotStatus();
}

// Ensure initialization happens only once
let slotsInitialized = false;

// Function to show toast notification
function showToast(message, type = 'success') {
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

// Function to handle logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Function to simulate vehicle detection
function simulateVehicleDetection(slotId, isOccupied = true) {
    updateSlotStatus(slotId, isOccupied)
        .then(() => {
            showToast(`Slot ${slotId} is now ${isOccupied ? 'Occupied' : 'Available'}`);
        })
        .catch(error => {
            console.error(`Failed to simulate vehicle detection for slot ${slotId}:`, error);
        });
}

// Function to simulate all slots occupied
function simulateAllOccupied() {
    const updatePromises = [];
    for (let i = 1; i <= 6; i++) {
        updatePromises.push(updateSlotStatus(i, true));
    }
    
    Promise.all(updatePromises)
        .then(() => {
            showToast('All slots are now occupied');
        })
        .catch(error => {
            console.error('Failed to occupy all slots:', error);
            showToast('Failed to occupy all slots', 'error');
        });
}

// Function to simulate all slots available
function simulateAllAvailable() {
    const updatePromises = [];
    for (let i = 1; i <= 6; i++) {
        updatePromises.push(updateSlotStatus(i, false));
    }
    
    Promise.all(updatePromises)
        .then(() => {
            showToast('All slots are now available');
        })
        .catch(error => {
            console.error('Failed to make all slots available:', error);
            showToast('Failed to make all slots available', 'error');
        });
}

// Modified document ready event listener
document.addEventListener('DOMContentLoaded', function() {
    if (!slotsInitialized) {
        initializeParkingSlots();
        slotsInitialized = true;
    }
    
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
