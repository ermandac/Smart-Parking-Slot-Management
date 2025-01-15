// Utility function to log messages
function logMessage(message, type = 'info') {
    const logOutput = document.getElementById('log-output');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}\n`;
    logOutput.textContent += logEntry;
    logOutput.scrollTop = logOutput.scrollHeight;
}

// Send command to Arduino
function sendCommand(command) {
    fetch('/api/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: command })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            logMessage(data.error, 'error');
        } else {
            logMessage(`Sent: ${command}, Response: ${data.response}`);
        }
    })
    .catch(error => {
        logMessage(error.toString(), 'error');
    });
}

// Send custom command
function sendCustomCommand() {
    const commandInput = document.getElementById('custom-command');
    const command = commandInput.value.trim();
    
    if (command) {
        sendCommand(command);
        commandInput.value = ''; // Clear input
    } else {
        logMessage('Please enter a command', 'warning');
    }
}

// Parking Slot Management Frontend Logic

const TOTAL_SLOTS = 10;

// Utility function to update connection status
function updateConnectionStatus() {
    fetch('/api/status')
    .then(response => response.json())
    .then(data => {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (data.connected) {
                statusElement.className = 'badge bg-success d-block py-2';
                statusElement.innerHTML = `
                    <i class="fas fa-check-circle me-2"></i>Arduino Connected 
                    <small class="ms-2">(${data.port})</small>
                `;
            } else {
                statusElement.className = 'badge bg-danger d-block py-2';
                statusElement.innerHTML = `
                    <i class="fas fa-times-circle me-2"></i>Arduino Disconnected
                `;
            }
        } else {
            console.warn('Connection status element not found');
        }
    })
    .catch(error => {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.className = 'badge bg-warning d-block py-2';
            statusElement.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>Connection Error
            `;
        } else {
            console.warn('Connection status element not found');
        }
    });
}

// Global variables for connection status
let isSensorConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// Update sensor connection status
function updateSensorConnectionStatus() {
    const sensorStatusIcon = document.getElementById('sensor-status-icon');
    const sensorStatusText = document.getElementById('sensor-status-text');

    if (isSensorConnected) {
        sensorStatusIcon.className = 'sensor-status-icon sensor-connected';
        sensorStatusText.textContent = 'Connected';
    } else if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        sensorStatusIcon.className = 'sensor-status-icon sensor-warning';
        sensorStatusText.textContent = 'Connection Failed';
    } else {
        sensorStatusIcon.className = 'sensor-status-icon sensor-disconnected';
        sensorStatusText.textContent = 'Disconnected';
    }
}

// Global variables to control refresh
let isAutoRefreshEnabled = false;
let autoRefreshInterval = null;
const REFRESH_INTERVAL = 30000; // 30 seconds

// Fetch and update parking slot status
function updateParkingStatus() {
    // Check if elements exist before trying to manipulate them
    const totalSlotsEl = document.getElementById('total-slots');
    const occupiedSlotsEl = document.getElementById('occupied-slots');
    const availableSlotsEl = document.getElementById('available-slots');
    const parkingLayout = document.getElementById('parking-layout');

    // If any critical elements are missing, log an error and return
    if (!totalSlotsEl || !occupiedSlotsEl || !availableSlotsEl || !parkingLayout) {
        console.error('One or more critical DOM elements are missing');
        return;
    }

    fetch('/api/parking-status')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Parking status data:', data);
        
        // Update summary statistics
        totalSlotsEl.textContent = data.totalSlots;
        occupiedSlotsEl.textContent = data.occupiedSlots;
        availableSlotsEl.textContent = data.availableSlots;

        // Clear existing content
        parkingLayout.innerHTML = '';

        // Update parking layout
        data.slots.forEach(slot => {
            // Create parking slot column
            const slotColumn = document.createElement('div');
            slotColumn.className = 'col-md-4 col-sm-6';

            // Create parking slot element
            const slotElement = document.createElement('div');
            slotElement.id = `slot-${slot.id}`;
            slotElement.className = `parking-slot text-center ${slot.occupied ? 'occupied' : ''}`;
            
            // Create slot content
            slotElement.innerHTML = `
                <h5>Slot ${slot.id}</h5>
                <i class="fas fa-car-alt car-icon ${slot.occupied ? 'text-danger' : 'text-muted'}"></i>
                <p class="status-text">${slot.occupied ? 'Occupied' : 'Available'}</p>
            `;

            // Append to layout
            slotColumn.appendChild(slotElement);
            parkingLayout.appendChild(slotColumn);
        });
    })
    .catch(error => {
        console.error('Error fetching parking status:', error);
        showToast('Error', 'Failed to update parking status', 'danger');
        
        // Update UI to show error state
        totalSlotsEl.textContent = 'Error';
        occupiedSlotsEl.textContent = 'Error';
        availableSlotsEl.textContent = 'Error';
    });
}

// Function to show toast notifications
function showToast(title, message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white bg-${type} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');

    // Create toast content
    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong><br>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Add toast to container
    toastContainer.appendChild(toastElement);

    // Initialize and show toast
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Function to simulate vehicle detection
function simulateVehicleDetection(slotId, detected = true) {
    console.log(`Simulating vehicle ${detected ? 'detection' : 'removal'} for slot ${slotId}`);

    fetch('/api/simulate-vehicle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ 
            slotId: parseInt(slotId),
            detected: detected
        })
    })
    .then(response => {
        console.log('Vehicle simulation response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        // If response is not OK, try to parse error details
        if (!response.ok) {
            return response.text().then(errorText => {
                console.error('Error response text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            });
        }

        // Parse JSON for successful responses
        return response.json();
    })
    .then(data => {
        console.log('Vehicle simulation successful:', data);
        
        // Update counts immediately
        const totalSlotsEl = document.getElementById('total-slots');
        const occupiedSlotsEl = document.getElementById('occupied-slots');
        const availableSlotsEl = document.getElementById('available-slots');
        const parkingLayout = document.getElementById('parking-layout');

        // Update statistics
        if (totalSlotsEl) totalSlotsEl.textContent = data.totalSlots;
        if (occupiedSlotsEl) occupiedSlotsEl.textContent = data.occupiedSlots;
        if (availableSlotsEl) availableSlotsEl.textContent = data.availableSlots;

        // Clear existing content
        if (parkingLayout) parkingLayout.innerHTML = '';

        // Update parking layout immediately using allSlots
        data.allSlots.forEach(slot => {
            // Create parking slot column
            const slotColumn = document.createElement('div');
            slotColumn.className = 'col-md-4 col-sm-6';

            // Create parking slot element
            const slotElement = document.createElement('div');
            slotElement.id = `slot-${slot.id}`;
            slotElement.className = `parking-slot text-center ${slot.occupied ? 'occupied' : ''}`;
            
            // Create slot content
            slotElement.innerHTML = `
                <h5>Slot ${slot.id}</h5>
                <i class="fas fa-car-alt car-icon ${slot.occupied ? 'text-danger' : 'text-muted'}"></i>
                <p class="status-text">${slot.occupied ? 'Occupied' : 'Available'}</p>
            `;

            // Append to layout
            slotColumn.appendChild(slotElement);
            parkingLayout.appendChild(slotColumn);
        });
        
        // Show simulation message
        showToast('Vehicle Simulation', 
            `Slot ${slotId} ${detected ? 'vehicle detected' : 'slot cleared'}`, 
            detected ? 'warning' : 'info'
        );
    })
    .catch(error => {
        console.error('Error in vehicle simulation:', error);
        showToast('Error', error.message, 'danger');
    });
}

// Function to simulate all slots being occupied
function simulateAllOccupied() {
    console.log('Simulating all slots as occupied');
    
    // Create an array of promises for each slot
    const simulationPromises = [];
    for (let slotId = 1; slotId <= 6; slotId++) {
        simulationPromises.push(
            new Promise((resolve, reject) => {
                fetch('/api/simulate-vehicle', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        slotId: slotId,
                        detected: true
                    })
                })
                .then(response => response.json())
                .then(resolve)
                .catch(reject);
            })
        );
    }

    // Wait for all simulations to complete
    Promise.all(simulationPromises)
        .then(results => {
            console.log('All slots simulation complete', results);
            
            // Refresh the parking layout with the last result
            const lastResult = results[results.length - 1];
            updateParkingLayout(lastResult);
            
            // Show toast notification
            showToast('Vehicle Simulation', 'All slots marked as occupied', 'warning');
        })
        .catch(error => {
            console.error('Error simulating all slots:', error);
            showToast('Error', 'Failed to simulate all slots', 'danger');
        });
}

// Function to simulate all slots being cleared
function simulateAllClear() {
    console.log('Simulating all slots as clear');
    
    // Create an array of promises for each slot
    const simulationPromises = [];
    for (let slotId = 1; slotId <= 6; slotId++) {
        simulationPromises.push(
            new Promise((resolve, reject) => {
                fetch('/api/simulate-vehicle', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        slotId: slotId,
                        detected: false
                    })
                })
                .then(response => response.json())
                .then(resolve)
                .catch(reject);
            })
        );
    }

    // Wait for all simulations to complete
    Promise.all(simulationPromises)
        .then(results => {
            console.log('All slots cleared', results);
            
            // Refresh the parking layout with the last result
            const lastResult = results[results.length - 1];
            updateParkingLayout(lastResult);
            
            // Show toast notification
            showToast('Vehicle Simulation', 'All slots marked as clear', 'info');
        })
        .catch(error => {
            console.error('Error clearing all slots:', error);
            showToast('Error', 'Failed to clear all slots', 'danger');
        });
}

// Helper function to update parking layout
function updateParkingLayout(data) {
    // Update counts immediately
    const totalSlotsEl = document.getElementById('total-slots');
    const occupiedSlotsEl = document.getElementById('occupied-slots');
    const availableSlotsEl = document.getElementById('available-slots');
    const parkingLayout = document.getElementById('parking-layout');

    // Update statistics
    if (totalSlotsEl) totalSlotsEl.textContent = data.totalSlots;
    if (occupiedSlotsEl) occupiedSlotsEl.textContent = data.occupiedSlots;
    if (availableSlotsEl) availableSlotsEl.textContent = data.availableSlots;

    // Clear existing content
    if (parkingLayout) parkingLayout.innerHTML = '';

    // Update parking layout immediately using allSlots
    data.allSlots.forEach(slot => {
        // Create parking slot column
        const slotColumn = document.createElement('div');
        slotColumn.className = 'col-md-4 col-sm-6';

        // Create parking slot element
        const slotElement = document.createElement('div');
        slotElement.id = `slot-${slot.id}`;
        slotElement.className = `parking-slot text-center ${slot.occupied ? 'occupied' : ''}`;
        
        // Create slot content
        slotElement.innerHTML = `
            <h5>Slot ${slot.id}</h5>
            <i class="fas fa-car-alt car-icon ${slot.occupied ? 'text-danger' : 'text-muted'}"></i>
            <p class="status-text">${slot.occupied ? 'Occupied' : 'Available'}</p>
        `;

        // Append to layout
        slotColumn.appendChild(slotElement);
        parkingLayout.appendChild(slotColumn);
    });
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Initial update
    updateParkingStatus();

    // Setup refresh controls
    const refreshControls = document.getElementById('refresh-controls');
    if (refreshControls) {
        const manualRefreshBtn = document.createElement('button');
        manualRefreshBtn.className = 'btn btn-primary me-2';
        manualRefreshBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh Now';
        manualRefreshBtn.onclick = updateParkingStatus;

        const autoRefreshBtn = document.createElement('button');
        autoRefreshBtn.className = 'btn btn-secondary';
        autoRefreshBtn.innerHTML = '<i class="fas fa-clock me-2"></i>Auto Refresh';
        
        let autoRefreshInterval = null;
        
        autoRefreshBtn.onclick = () => {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
                autoRefreshBtn.classList.remove('btn-success');
                autoRefreshBtn.classList.add('btn-secondary');
                showToast('Auto Refresh', 'Auto refresh disabled');
            } else {
                autoRefreshInterval = setInterval(updateParkingStatus, 30000); // 30 seconds
                autoRefreshBtn.classList.remove('btn-secondary');
                autoRefreshBtn.classList.add('btn-success');
                showToast('Auto Refresh', 'Auto refresh enabled (30s)');
            }
        };

        refreshControls.appendChild(manualRefreshBtn);
        refreshControls.appendChild(autoRefreshBtn);
    }

    // Check Arduino connection status
    function updateArduinoStatus() {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        fetch('/api/arduino-status')
            .then(response => {
                // Handle both successful and error responses
                if (!response.ok) {
                    // Treat non-200 responses as an error
                    return response.json().then(errorData => {
                        throw new Error(errorData.error || 'Unknown Arduino status error');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.connected) {
                    statusElement.className = 'badge bg-success d-block py-2';
                    statusElement.innerHTML = `<i class="fas fa-plug me-2"></i>Connected (${data.port || 'Unknown Port'})`;
                } else {
                    statusElement.className = 'badge bg-danger d-block py-2';
                    statusElement.innerHTML = '<i class="fas fa-times-circle me-2"></i>Disconnected';
                }
            })
            .catch(error => {
                console.error('Arduino status check failed:', error);
                statusElement.className = 'badge bg-warning d-block py-2';
                statusElement.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>Error: ${error.message}`;
            });
    }

    // Initial Arduino status check
    updateArduinoStatus();
    
    // Check Arduino status every 10 seconds
    setInterval(updateArduinoStatus, 10000);
});
