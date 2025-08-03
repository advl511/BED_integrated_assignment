document.addEventListener('DOMContentLoaded', function() {
    const signinForm = document.querySelector('form');
    
    if (signinForm) {
        signinForm.addEventListener('submit', handleSignin);
    }
});

async function handleSignin(event) {
    event.preventDefault();

    const usernameOrEmail = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!usernameOrEmail || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    try {
        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Signing in...';
        submitButton.disabled = true;
        
        // Determine if input is email or username
        const isEmail = usernameOrEmail.includes('@');
        const requestBody = {
            password: password
        };
        
        if (isEmail) {
            requestBody.email = usernameOrEmail;
        } else {
            requestBody.username = usernameOrEmail;
        }
        
        console.log('Login request body:', requestBody);
        
        // Make API call to backend
        const response = await fetch('http://localhost:3000/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('Login successful, received data:', data);
            
            // Clear any existing localStorage data first
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('email');
            localStorage.removeItem('auth_token');
            
            // Set new user data in localStorage
            if (data.user) {
                localStorage.setItem('user_id', data.user.user_id.toString());
                localStorage.setItem('username', data.user.username);
                localStorage.setItem('email', data.user.email);
                console.log('Set localStorage:', {
                    user_id: data.user.user_id,
                    username: data.user.username,
                    email: data.user.email
                });
            }
            
            // Store token in localStorage if provided (for Live Server)
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                console.log('Token stored in localStorage for Live Server');
            }
            
            showSuccess('Login successful! Redirecting...');
            
            // Reduce the timeout to make redirect faster
            setTimeout(() => {
                console.log('Attempting redirect to home.html');
                console.log('Current localStorage after login:', {
                    user_id: localStorage.getItem('user_id'),
                    username: localStorage.getItem('username'),
                    email: localStorage.getItem('email')
                });
                // Redirect to home page
                window.location.href = 'home.html';
            }, 500);  // Reduced from 1000ms to 500ms
            
        } else {
            showError(data.error || 'Login failed');
        }
        
    } catch (error) {
        console.error('Error during signin:', error);
        showError('Network error. Please try again.');
    } finally {
        // Reset button state
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

function showError(message) {
    removeExistingMessages();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background-color: #fee;
        border: 1px solid #fcc;
        color: #c66;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 10px;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    const form = document.querySelector('form');
    form.parentNode.insertBefore(errorDiv, form);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function showSuccess(message) {
    removeExistingMessages();
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        background-color: #efe;
        border: 1px solid #cfc;
        color: #6c6;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 10px;
        text-align: center;
    `;
    successDiv.textContent = message;
    
    const form = document.querySelector('form');
    form.parentNode.insertBefore(successDiv, form);
}

function removeExistingMessages() {
    const existingMessages = document.querySelectorAll('.error-message, .success-message');
    existingMessages.forEach(msg => {
        if (msg.parentNode) {
            msg.parentNode.removeChild(msg);
        }
    });
}
