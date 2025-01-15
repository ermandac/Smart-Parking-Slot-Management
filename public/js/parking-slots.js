// Fetch and update parking slot status
async function fetchParkingSlotStatus() {
    try {
        console.log('Attempting to fetch parking slot status');
        
        const response = await authenticatedFetch('/api/parking-slots');
        console.log('Parking slots response:', response);
        
        const slots = response.slots;
        console.log('Received slots:', slots);

        if (!slots || slots.length === 0) {
            console.warn('No parking slots found');
            showToast('No parking slots available', 'warning');
            return;
        }

        // Update each slot's status in the UI
        slots.forEach(slot => {
            console.log(`Processing slot ${slot.slotNumber}:`, slot);
            
            const slotElement = document.getElementById(`slot-${slot.slotNumber}`);
            if (slotElement) {
                const statusText = slotElement.querySelector('.status-text');
                const carIcon = slotElement.querySelector('.car-icon');
                const timestampElement = slotElement.querySelector('.timestamp');

                // Update status
                if (slot.status === 'occupied') {
                    statusText.textContent = 'Occupied';
                    statusText.classList.remove('text-success');
                    statusText.classList.add('text-danger');
                    carIcon.classList.remove('text-muted');
                    carIcon.classList.add('text-danger');
                } else {
                    statusText.textContent = 'Available';
                    statusText.classList.remove('text-danger');
                    statusText.classList.add('text-success');
                    carIcon.classList.remove('text-danger');
                    carIcon.classList.add('text-muted');
                }

                // Update timestamp
                if (slot.currentVehicle && slot.currentVehicle.entryTime) {
                    timestampElement.textContent = new Date(slot.currentVehicle.entryTime).toLocaleString();
                } else {
                    timestampElement.textContent = '';
                }
            } else {
                console.warn(`No element found for slot ${slot.slotNumber}`);
            }
        });

        // Update overall slot counts
        const totalSlots = slots.length;
        const occupiedSlots = slots.filter(slot => slot.status === 'occupied').length;
        const availableSlots = totalSlots - occupiedSlots;

        console.log('Slot counts:', { totalSlots, occupiedSlots, availableSlots });

        document.getElementById('total-slots').textContent = totalSlots;
        document.getElementById('occupied-slots').textContent = occupiedSlots;
        document.getElementById('available-slots').textContent = availableSlots;

    } catch (error) {
        console.error('Failed to fetch parking slot status:', error);
        
        // More detailed error handling
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('Error response:', error.response);
            showToast(`Failed to load parking slots: ${error.response.data.error}`, 'error');
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
            showToast('No response from server when fetching parking slots', 'error');
        } else {
            // Something happened in setting up the request
            console.error('Error setting up request:', error.message);
            showToast('Error setting up parking slot request', 'error');
        }
    }
}

// Add event listener to fetch slots when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, fetching parking slot status');
    fetchParkingSlotStatus();
});
