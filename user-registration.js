document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('user-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const messageContainer = document.getElementById('message-container');
    const messageText = document.getElementById('message-text');

    // Función para mostrar un mensaje al usuario
    const showMessage = (message, type) => {
        messageText.textContent = message;
        messageContainer.className = `mt-4 message-box block p-4 rounded-lg text-white ${type}`;
        messageContainer.style.display = 'block';
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000); // El mensaje desaparece después de 5 segundos
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validar que las contraseñas coincidan
        if (passwordInput.value !== confirmPasswordInput.value) {
            showMessage('Las contraseñas no coinciden. Por favor, inténtalo de nuevo.', 'error');
            return;
        }

        const userData = {
            username: usernameInput.value,
            password: passwordInput.value
        };

        // Enviar los datos al servidor de Flask
        try {
            const response = await fetch('http://127.0.0.1:5000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(result.message, 'success');
                form.reset();
            } else {
                showMessage(result.error || 'Ocurrió un error inesperado.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión con el servidor. Asegúrate de que el servidor está funcionando.', 'error');
        }
    });
});
