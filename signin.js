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
            // No localStorage - token is handled server-side via cookies/session
            showSuccess('Login successful! Redirecting...');
            
            setTimeout(() => {
                // need change url
                window.location.href = '/dashboard.html';
            }, 1000);
            
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
