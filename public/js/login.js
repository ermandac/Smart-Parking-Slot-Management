// Enhanced Session Management
document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    const checkExistingSession = () => {
        const session = JSON.parse(localStorage.getItem('session'));

        // Don't auto-login if we just logged out
        if (sessionStorage.getItem('justLoggedOut')) {
            sessionStorage.removeItem('justLoggedOut');
            return;
        }

        if (session) {
            const tokenExpiry = new Date(session.expiry);

            if (tokenExpiry > new Date()) {
                // Validate token with backend
                fetch('/api/validate-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.token}`
                    },
                    body: JSON.stringify({ token: session.token })
                })
                .then(response => {
                    if (response.ok) {
                        // Token is valid, redirect to appropriate page
                        switch(session.user.role) {
                            case 'admin':
                                window.location.href = '/admin.html';
                                break;
                            case 'staff':
                                window.location.href = '/dashboard.html';
                                break;
                            default:
                                window.location.href = '/';
                        }
                    } else {
                        // Token is invalid, clear session
                        clearSession();
                    }
                })
                .catch(() => {
                    // Network error or validation failed
                    clearSession();
                });
            } else {
                // Token has expired, clear session
                clearSession();
            }
        }
    };

    // Clear session data
    const clearSession = () => {
        localStorage.removeItem('session');
        sessionStorage.clear();
        sessionStorage.setItem('justLoggedOut', 'true');
    };

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Reset error message
            errorMessage.textContent = '';
            errorMessage.classList.add('d-none');

            // Get form values
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            // Validate inputs
            if (!username || !password) {
                errorMessage.textContent = 'Please enter both username and password';
                errorMessage.classList.remove('d-none');
                return;
            }

            try {
                // Send login request
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        username: username, 
                        password: password 
                    })
                });

                // Try parsing the response
                const data = await response.json();

                // Check response status and handle different scenarios
                if (!response.ok) {
                    // Handle login error
                    const errorMsg = data.message || data.error || 'Login failed';
                    console.error('Login Error:', errorMsg);
                    errorMessage.textContent = errorMsg;
                    errorMessage.classList.remove('d-none');
                    return;
                }

                // Store session data
                const session = {
                    token: data.token,
                    user: data.user,
                    expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
                };
                localStorage.setItem('session', JSON.stringify(session));
                sessionStorage.removeItem('justLoggedOut'); // Clear logout flag on successful login

                // Redirect based on user role
                switch(data.user.role) {
                    case 'admin':
                        window.location.href = '/admin.html';
                        break;
                    case 'staff':
                        window.location.href = '/dashboard.html';
                        break;
                    default:
                        window.location.href = '/';
                }

            } catch (error) {
                console.error('Login Error:', error);
                errorMessage.textContent = 'An error occurred during login. Please try again.';
                errorMessage.classList.remove('d-none');
            }
        });
    }

    // Check session on page load
    checkExistingSession();
});
