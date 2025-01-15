document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

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

            console.log('Response Status:', response.status);
            console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

            // Log raw response for debugging
            const responseText = await response.text();
            console.log('Raw Response:', responseText);

            // Try parsing the response
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parsing Error:', parseError);
                console.error('Unparseable Response:', responseText);
                errorMessage.textContent = 'Server response error';
                errorMessage.classList.remove('d-none');
                return;
            }

            // Check response status and handle different scenarios
            if (!response.ok) {
                // Handle login error
                const errorMsg = data.message || data.error || 'Login failed';
                console.error('Login Error:', errorMsg);
                errorMessage.textContent = errorMsg;
                errorMessage.classList.remove('d-none');
                return;
            }

            // Validate response data
            if (!data.token || !data.user) {
                errorMessage.textContent = 'Invalid server response';
                errorMessage.classList.remove('d-none');
                return;
            }

            // Safely store token and user data
            localStorage.setItem('token', data.token);
            
            // Serialize user data carefully
            const userToStore = {
                id: data.user.id,
                username: data.user.username,
                role: data.user.role,
                email: data.user.email
            };
            localStorage.setItem('user', JSON.stringify(userToStore));

            // Redirect based on user role
            switch(data.user.role) {
                case 'admin':
                    window.location.href = '/admin.html';
                    break;
                case 'staff':
                    window.location.href = '/dashboard.html';
                    break;
                default:
                    // Fallback redirect
                    window.location.href = '/';
            }

        } catch (error) {
            console.error('Login request error:', error);
            errorMessage.textContent = 'Network error. Please try again.';
            errorMessage.classList.remove('d-none');
        }
    });

    // Optional: Clear error message when user starts typing
    ['username', 'password'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            errorMessage.style.display = 'none';
        });
    });
});
