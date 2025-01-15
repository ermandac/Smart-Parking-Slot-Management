// Shared functionality across pages

// Function to handle logout
async function logout() {
    try {
        // Clear all session data
        localStorage.removeItem('session');
        sessionStorage.clear();
        // Set the logout flag to prevent auto-login
        sessionStorage.setItem('justLoggedOut', 'true');

        // Redirect to login page and ensure the page reloads
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
        // No valid session, redirect to login
        window.location.replace('/login.html');
        return false;
    }
    return true;
}

// Add auth check on page load
document.addEventListener('DOMContentLoaded', checkAuth);
