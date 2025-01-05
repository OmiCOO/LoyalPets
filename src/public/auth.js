// Handle login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            window.location.href = '/index.html';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error logging in');
    }
});

// Handle signup
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            window.location.href = '/index.html';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error signing up');
    }
}); 