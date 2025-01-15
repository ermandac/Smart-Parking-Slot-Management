const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const VehicleControlsConfig = {
    // Determine if vehicle simulation controls should be visible
    isVisible: process.env.SHOW_VEHICLE_SIMULATION_CONTROLS === 'true',

    // Method to check visibility
    shouldShowControls() {
        console.log('Vehicle Simulation Controls Visibility:', this.isVisible);
        return this.isVisible;
    }
};

module.exports = VehicleControlsConfig;
