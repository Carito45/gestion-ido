document.addEventListener('DOMContentLoaded', () => {
    // Verificar si ya está autenticado al cargar la página de login
    if (window.location.pathname.includes('login.html')) {
        const token = localStorage.getItem('token');
        if (token) {
            // Ya tiene token, redirigir al dashboard
            window.location.href = '/pages/dashboard.html';
            return;
        }
    }

    // Manejar el formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            const submitButton = loginForm.querySelector('button[type="submit"]');
            
            // Deshabilitar botón y mostrar loading
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="loading"></span> Iniciando sesión...';
            errorMessage.style.display = 'none';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Guardar token y usuario en localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('usuario', JSON.stringify(data.usuario));
                    
                    // Mostrar mensaje de éxito
                    errorMessage.style.display = 'block';
                    errorMessage.style.color = '#10b981';
                    errorMessage.textContent = '✓ Inicio de sesión exitoso. Redirigiendo...';
                    
                    // Redirigir al dashboard
                    setTimeout(() => {
                        window.location.href = '/pages/dashboard.html';
                    }, 500);
                } else {
                    // Error de autenticación
                    errorMessage.textContent = data.error || 'Credenciales inválidas.';
                    errorMessage.style.display = 'block';
                    errorMessage.style.color = '#ef4444';
                    
                    submitButton.disabled = false;
                    submitButton.textContent = 'Entrar';
                }
            } catch (error) {
                console.error('Error de conexión:', error);
                errorMessage.textContent = 'Error al conectar con el servidor.';
                errorMessage.style.display = 'block';
                errorMessage.style.color = '#ef4444';
                
                submitButton.disabled = false;
                submitButton.textContent = 'Entrar';
            }
        });
    }
});