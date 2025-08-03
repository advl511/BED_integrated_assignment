document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    const signupForm = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    
    console.log('Elements found:', {
        signupForm: !!signupForm,
        emailInput: !!emailInput,
        usernameInput: !!usernameInput
    });
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // email validation
    if (emailInput) {
        emailInput.addEventListener('blur', checkEmailAvailability);
        emailInput.addEventListener('input', clearEmailValidation);
        console.log('Email event listeners added');
    }
    
    if (usernameInput) {
        usernameInput.addEventListener('blur', checkUsernameAvailability);
        usernameInput.addEventListener('input', clearUsernameValidation);
        console.log('Username event listeners added');
    }
});

async function handleSignup(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!username || !email || !password || !confirmPassword) {
        showError("All fields are required!");
        return;
    }

    if (password !== confirmPassword) {
        showError("Passwords do not match!");
        return;
    }

    try {
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Creating Account...';
        submitButton.disabled = true;

        const res = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ 
                username, 
                email, 
                password, 
                confirmPassword 
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            // Store token in localStorage if provided (for Live Server)
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_id', data.user.user_id);
                localStorage.setItem('username', data.user.username);
                localStorage.setItem('email', data.user.email);
                console.log('✅ Token stored in localStorage for Live Server');
            }
            
            showSuccess(data.message);
            e.target.reset();
            
            setTimeout(() => {
                window.location.href = 'signin.html';
            }, 2000);
        } else {
            showError(data.error || 'Signup failed');
        }
    } catch (err) {
        console.error('Signup error:', err);
        showError('Network error. Please try again.');
    } finally {
        const submitButton = e.target.querySelector('button[type="submit"]');
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

//Email availabiliity check
async function checkEmailAvailability() {
    const email = document.getElementById('email').value.trim();
    const validationDiv = document.getElementById('email-validation');
    
    if (!email || !isValidEmail(email)) {
        validationDiv.textContent = '';
        return;
    }
    
    try {
        validationDiv.textContent = 'Checking...';
        validationDiv.className = 'validation-message checking';
        
        const response = await fetch(`http://localhost:3000/api/users/check-email/${encodeURIComponent(email)}`, {
            credentials: 'include' // Include cookies
        });
        const data = await response.json();
        
        if (response.ok) {
            if (data.exists) {
                validationDiv.textContent = 'Email already exists';
                validationDiv.className = 'validation-message error';
            } else {
                validationDiv.textContent = 'Email available';
                validationDiv.className = 'validation-message success';
            }
        } else {
            validationDiv.textContent = 'Error checking email';
            validationDiv.className = 'validation-message error';
        }
    } catch (error) {
        console.error('Error checking email:', error);
        validationDiv.textContent = 'Error checking email';
        validationDiv.className = 'validation-message error';
    }
}

// Username availability check
async function checkUsernameAvailability() {
    console.log('checkUsernameAvailability called');
    const username = document.getElementById('username').value.trim();
    const validationDiv = document.getElementById('username-validation');
    
    console.log('Username:', username);
    console.log('Validation div:', validationDiv);
    
    if (!username) {
        validationDiv.textContent = '';
        console.log('Username empty, skipping check');
        return;
    }
    
    try {
        validationDiv.textContent = 'Checking...';
        validationDiv.className = 'validation-message checking';
        
        const url = `http://localhost:3000/api/users/check-username/${encodeURIComponent(username)}`;
        console.log('Making request to:', url);
        
        const response = await fetch(url, {
            credentials: 'include' // Include cookies
        });
        const data = await response.json();
        
        console.log('Response status:', response.status);
        console.log('Response data:', data);
        
        if (response.ok) {
            if (data.exists) {
                validationDiv.textContent = '❌ Username already taken';
                validationDiv.className = 'validation-message error';
            } else {
                validationDiv.textContent = '✅ Username available';
                validationDiv.className = 'validation-message success';
            }
        } else {
            validationDiv.textContent = 'Error checking username';
            validationDiv.className = 'validation-message error';
        }
    } catch (error) {
        console.error('Error checking username:', error);
        validationDiv.textContent = 'Error checking username';
        validationDiv.className = 'validation-message error';
    }
}

// clears validation messages when user types
function clearEmailValidation() {
    const validationDiv = document.getElementById('email-validation');
    validationDiv.textContent = '';
    validationDiv.className = 'validation-message';
}

function clearUsernameValidation() {
    const validationDiv = document.getElementById('username-validation');
    validationDiv.textContent = '';
    validationDiv.className = 'validation-message';
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}