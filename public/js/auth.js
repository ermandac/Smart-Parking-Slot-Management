// Authentication and Session Management

// Function to handle logout
async function logout() {
    try {
        // Clear all session data
        localStorage.removeItem('session');
        sessionStorage.clear();
        
        // Set the logout flag to prevent auto-login
        sessionStorage.setItem('justLoggedOut', 'true');
        
        // Force page reload and clear history
        window.location.replace('/login.html');
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error during logout. Please try again.');
    }
}

// Function to check if user is logged in
function checkAuth() {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.token) {
        window.location.replace('/login.html');
        return false;
    }
    return true;
}

// Add auth check on page load
document.addEventListener('DOMContentLoaded', checkAuth);
