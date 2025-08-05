/**
 * Xlerion BlockChain Gov - app_improved.js
 * -----------------------------------------
 * Este archivo contiene toda la lógica para la simulación de trazabilidad del IVA.
 * Gestiona la autenticación de usuarios, la creación de bloques, la simulación
 * de estados del ciclo de vida del impuesto, la búsqueda de transacciones
 * y la renderización dinámica de la UI.
 *
 * @author Miguel (Xlerion) & Asistente AI
 * @version 2.2.4 (Corrección de lógica de búsqueda y UX)
 */

// ===================================================================================
// EVENT LISTENER PRINCIPAL - Se ejecuta cuando el DOM está completamente cargado
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    const app = new BlockchainApp();
    app.init();
});

// ===================================================================================
// CLASE PRINCIPAL DE LA APLICACIÓN - Orquesta toda la funcionalidad
// ===================================================================================
class BlockchainApp {
    constructor() {
        // --- Selectores del DOM ---
        this.ui = {
            authContainer: document.getElementById('auth-container'),
            mainDashboard: document.getElementById('main-dashboard'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            showRegisterBtn: document.getElementById('show-register'),
            showLoginBtn: document.getElementById('show-login'),
            registerBackBtn: document.getElementById('register-back'),
            logoutBtn: document.getElementById('logout-btn'),
            userInfo: document.getElementById('user-info'),
            userName: document.getElementById('user-name'),
            notification: document.getElementById('notification'),
            notificationMessage: document.getElementById('notification-message'),
            loadingOverlay: document.getElementById('loading-overlay'),
            
            // Pestañas
            tabs: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),

            // Formulario de Factura
            invoiceForm: document.getElementById('invoice-form'),
            subtotalInput: document.getElementById('subtotal'),
            ivaAmountInput: document.getElementById('iva-amount'),

            // Ledger
            blockchainLedger: document.getElementById('blockchain-ledger'),
            validateChainBtn: document.getElementById('validate-blockchain'),

            // Estadísticas
            totalInvoices: document.getElementById('total-invoices'),
            totalIva: document.getElementById('total-iva'),
            totalAmount: document.getElementById('total-amount'),
            avgInvoice: document.getElementById('avg-invoice'),
            sectorChartCanvas: document.getElementById('sector-chart'),
            sectorDetails: document.getElementById('sector-details'),

            // Búsqueda
            searchForm: document.getElementById('search-form'),
            searchCompanyInput: document.getElementById('search-company'),
            searchNitInput: document.getElementById('search-nit'),
            searchInvoiceInput: document.getElementById('search-invoice'),
            searchDateFromInput: document.getElementById('search-date-from'),
            searchDateToInput: document.getElementById('search-date-to'),
            searchResultsContainer: document.getElementById('search-results'),
            searchButton: document.getElementById('search-button'), // Se agrega para mejor manejo
        };

        // --- Estado de la Aplicación ---
        this.blockchain = new Blockchain();
        this.currentUser = null;
        this.chart = null;

        // --- Constantes ---
        this.IVA_RATE = 0.19; // 19%
        this.SECTOR_DISTRIBUTION = {
            "Salud": { percentage: 0.25, color: 'rgba(239, 68, 68, 0.7)', icon: 'fa-heartbeat' },
            "Educación": { percentage: 0.20, color: 'rgba(59, 130, 246, 0.7)', icon: 'fa-graduation-cap' },
            "Infraestructura": { percentage: 0.20, color: 'rgba(245, 158, 11, 0.7)', icon: 'fa-road' },
            "Defensa y Seguridad": { percentage: 0.15, color: 'rgba(139, 92, 246, 0.7)', icon: 'fa-shield-alt' },
            "Ciencia y Tecnología": { percentage: 0.10, color: 'rgba(16, 185, 129, 0.7)', icon: 'fa-flask' },
            "Cultura y Deporte": { percentage: 0.05, color: 'rgba(236, 72, 153, 0.7)', icon: 'fa-palette' },
            "Administración General": { percentage: 0.05, color: 'rgba(107, 114, 128, 0.7)', icon: 'fa-landmark' }
        };
    }

    /**
     * Inicializa la aplicación, establece los event listeners y carga el estado inicial.
     */
    async init() {
        this.setupEventListeners();
        await this.checkLoginStatus();
    }

    /**
     * Configura todos los manejadores de eventos para la UI.
     */
    setupEventListeners() {
        if (this.ui.loginForm) this.ui.loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.login(); });
        if (this.ui.registerForm) this.ui.registerForm.addEventListener('submit', (e) => { e.preventDefault(); this.register(); });
        if (this.ui.logoutBtn) this.ui.logoutBtn.addEventListener('click', () => this.logout());
        if (this.ui.showRegisterBtn) this.ui.showRegisterBtn.addEventListener('click', () => this.toggleAuthForm(true));
        if (this.ui.showLoginBtn) this.ui.showLoginBtn.addEventListener('click', () => this.toggleAuthForm(false));
        if (this.ui.registerBackBtn) this.ui.registerBackBtn.addEventListener('click', () => this.toggleAuthForm(false));
        if (this.ui.subtotalInput) this.ui.subtotalInput.addEventListener('input', () => this.calculateIVA());
        if (this.ui.invoiceForm) this.ui.invoiceForm.addEventListener('submit', (e) => { e.preventDefault(); this.addInvoice(); });
        if (this.ui.validateChainBtn) this.ui.validateChainBtn.addEventListener('click', () => this.validateChain());
        
        // --- Nuevo event listener para el formulario de búsqueda ---
        // Se añade el evento de 'submit' y se verifica el boton de búsqueda
        if (this.ui.searchForm) {
            this.ui.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.searchBlocks();
            });
        }


        this.ui.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    }

    // --- Lógica de Autenticación y Sesión ---

    /**
     * Hashea una contraseña usando SHA-256.
     * @param {string} password - La contraseña en texto plano.
     * @returns {Promise<string>} La contraseña hasheada.
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Maneja el registro de un nuevo usuario.
     */
    async register() {
        const fullname = document.getElementById('register-fullname').value;
        const username = document.getElementById('register-username').value.toLowerCase();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        // Validación simple
        if (!fullname || !username || !email || !password) {
            this.showNotification('Todos los campos son obligatorios.', 'error');
            return;
        }
        if (password.length < 8) {
            this.showNotification('La contraseña debe tener al menos 8 caracteres.', 'error');
            return;
        }

        const users = this.getUsersFromStorage();
        if (users[username]) {
            this.showNotification('El nombre de usuario ya existe.', 'error');
            return;
        }

        const hashedPassword = await this.hashPassword(password);
        users[username] = { fullname, email, password: hashedPassword };
        localStorage.setItem('blockchain_users', JSON.stringify(users));
        this.showNotification('¡Registro exitoso! Ahora puedes iniciar sesión.');
        this.toggleAuthForm(false);
        this.ui.registerForm.reset();
    }

    /**
     * Maneja el inicio de sesión.
     */
    async login() {
        const username = document.getElementById('login-username').value.toLowerCase();
        const password = document.getElementById('login-password').value;
        const users = this.getUsersFromStorage();

        if (users[username]) {
            const hashedPassword = await this.hashPassword(password);
            if (users[username].password === hashedPassword) {
                this.currentUser = { username, fullname: users[username].fullname };
                sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.showNotification(`¡Bienvenido, ${this.currentUser.fullname}!`);
                await this.enterApp();
                return;
            }
        }
        this.showNotification('Usuario o contraseña incorrectos.', 'error');
    }

    /**
     * Cierra la sesión del usuario.
     */
    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        this.showNotification('Has cerrado sesión.');
        this.leaveApp();
    }

    /**
     * Verifica si hay una sesión activa al cargar la página.
     */
    async checkLoginStatus() {
        const user = sessionStorage.getItem('currentUser');
        if (user) {
            this.currentUser = JSON.parse(user);
            await this.enterApp();
        } else {
            this.leaveApp();
        }
    }

    /**
     * Prepara la UI para un usuario autenticado.
     */
    async enterApp() {
        if (this.ui.authContainer) this.ui.authContainer.classList.add('hidden');
        if (this.ui.mainDashboard) this.ui.mainDashboard.classList.remove('hidden');
        if (this.ui.userInfo) this.ui.userInfo.classList.remove('hidden');
        if (this.ui.logoutBtn) this.ui.logoutBtn.classList.remove('hidden');
        if (this.ui.userName) this.ui.userName.textContent = this.currentUser.fullname;
        await this.blockchain.loadChainFromStorage();
        this.updateDashboard();
    }

    /**
     * Restablece la UI a la vista de login.
     */
    leaveApp() {
        if (this.ui.authContainer) this.ui.authContainer.classList.remove('hidden');
        if (this.ui.mainDashboard) this.ui.mainDashboard.classList.add('hidden');
        if (this.ui.userInfo) this.ui.userInfo.classList.add('hidden');
        if (this.ui.logoutBtn) this.ui.logoutBtn.classList.add('hidden');
    }

    /**
     * Alterna entre los formularios de login y registro.
     * @param {boolean} showRegister - True para mostrar registro, false para login.
     */
    toggleAuthForm(showRegister) {
        if (this.ui.loginForm) this.ui.loginForm.classList.toggle('hidden', showRegister);
        if (this.ui.registerForm) this.ui.registerForm.classList.toggle('hidden', !showRegister);
        if (this.ui.showRegisterBtn) this.ui.showRegisterBtn.parentElement.classList.toggle('hidden', showRegister);
        if (this.ui.registerBackBtn) this.ui.registerBackBtn.classList.toggle('hidden', !showRegister);
    }
    
    /**
     * Obtiene los usuarios del localStorage.
     * @returns {Object} El objeto de usuarios.
     */
    getUsersFromStorage() {
        return JSON.parse(localStorage.getItem('blockchain_users')) || {};
    }

    // --- Lógica del Blockchain y Facturas ---

    /**
     * Calcula el IVA basado en el subtotal.
     */
    calculateIVA() {
        const subtotal = parseFloat(this.ui.subtotalInput.value) || 0;
        const iva = subtotal * this.IVA_RATE;
        this.ui.ivaAmountInput.value = iva.toFixed(2);
    }

    /**
     * Procesa y añade una nueva factura al blockchain.
     */
    async addInvoice() {
        const invoiceData = {
            number: this.ui.invoiceForm.querySelector('#invoice-number').value,
            companyNit: this.ui.invoiceForm.querySelector('#company-nit').value,
            companyName: this.ui.invoiceForm.querySelector('#company-name').value,
            subtotal: parseFloat(this.ui.subtotalInput.value),
            iva: parseFloat(this.ui.ivaAmountInput.value),
            createdBy: this.currentUser.username
        };

        if (!invoiceData.number || !invoiceData.companyNit || !invoiceData.companyName || invoiceData.subtotal <= 0) {
            this.showNotification('Por favor, completa todos los campos de la factura.', 'error');
            return;
        }

        this.showLoading(true);
        this.ui.invoiceForm.reset();
        this.ui.ivaAmountInput.value = '';

        // 1. Iniciar el proceso de trazabilidad
        const trace = [{
            status: 'Recibido por el Sistema',
            timestamp: new Date().toISOString(),
            details: `Factura ${invoiceData.number} recibida para procesamiento.`
        }];
        const tempBlockId = `temp-${Date.now()}`;
        this.renderBlock({ id: tempBlockId, data: invoiceData, traceability: trace }, this.ui.blockchainLedger, true);
        
        // 2. Simular validación
        await this.simulateProcess(1500);
        trace.push({
            status: 'Validando Datos (DIAN)',
            timestamp: new Date().toISOString(),
            details: 'La estructura y datos de la factura están siendo validados.'
        });
        this.updateBlockTrace(tempBlockId, trace);

        // 3. Añadir al Blockchain
        await this.simulateProcess(2000);
        const newBlock = await this.blockchain.addBlock(invoiceData, trace);
        newBlock.traceability.push({
            status: 'Incorporado en Blockchain',
            timestamp: new Date().toISOString(),
            details: `Transacción sellada en el bloque #${newBlock.index} con hash: ${newBlock.hash.substring(0, 20)}...`
        });
        this.blockchain.saveChainToStorage();
        document.getElementById(tempBlockId)?.remove(); // Remover el bloque temporal
        this.renderBlock(newBlock, this.ui.blockchainLedger, true); // Renderizar el bloque final

        // 4. Simular distribución de fondos
        await this.simulateProcess(2500);
        newBlock.traceability.push({
            status: 'Fondos Distribuidos (Hacienda)',
            timestamp: new Date().toISOString(),
            details: 'Contrato inteligente ejecutó la distribución del IVA a las billeteras sectoriales.'
        });
        this.blockchain.saveChainToStorage();
        this.updateBlockTrace(newBlock.hash, newBlock.traceability);
        
        this.showLoading(false);
        this.showNotification('Factura procesada y añadida al blockchain con éxito.');
        this.updateDashboard();
    }

    /**
     * Valida la integridad de toda la cadena de bloques.
     */
    async validateChain() {
        this.showLoading(true);
        const isValid = await this.blockchain.isChainValid();
        this.showLoading(false);

        if (isValid) {
            this.showNotification('¡Éxito! La integridad del blockchain ha sido verificada.', 'success');
        } else {
            this.showNotification('¡Alerta de Seguridad! Se ha detectado una inconsistencia en el blockchain.', 'error');
        }
    }

    // --- Lógica de Búsqueda ---

    /**
     * Busca bloques en el blockchain según los criterios del formulario de búsqueda.
     * Permite buscar con campos vacíos, pero requiere al menos un campo rellenado.
     */
    searchBlocks() {
        const companyName = this.ui.searchCompanyInput.value.toLowerCase().trim();
        const nit = this.ui.searchNitInput.value.trim();
        const invoiceNumber = this.ui.searchInvoiceInput.value.trim();
        const startDate = this.ui.searchDateFromInput.value ? new Date(this.ui.searchDateFromInput.value) : null;
        const endDate = this.ui.searchDateToInput.value ? new Date(this.ui.searchDateToInput.value) : null;

        // Validar que al menos un campo tenga datos
        if (!companyName && !nit && !invoiceNumber && !startDate && !endDate) {
            this.showNotification('Por favor, introduce al menos un criterio de búsqueda.', 'error');
            this.ui.searchResultsContainer.innerHTML = '';
            return;
        }

        // Asegurarse de que la cadena no esté vacía y que no se incluya el bloque génesis
        const blocksToSearch = this.blockchain.chain.length > 1 ? this.blockchain.chain.slice(1) : [];

        const results = blocksToSearch.filter(block => {
            const blockDate = new Date(block.timestamp);
            
            // Lógica de filtrado con campos opcionales
            const companyNameMatch = !companyName || block.data.companyName.toLowerCase().includes(companyName);
            const nitMatch = !nit || block.data.companyNit.includes(nit);
            const invoiceNumberMatch = !invoiceNumber || block.data.number.includes(invoiceNumber);
            const startDateMatch = !startDate || blockDate >= startDate;
            // Se ajusta la fecha final para incluir todo el día seleccionado
            const endDateAdjusted = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1) : null;
            const endDateMatch = !endDateAdjusted || blockDate < endDateAdjusted;

            return companyNameMatch && nitMatch && invoiceNumberMatch && startDateMatch && endDateMatch;
        });

        this.renderSearchResults(results);
    }
    
    /**
     * Renderiza los resultados de la búsqueda.
     * @param {Array<Block>} results - Los bloques que coinciden con la búsqueda.
     */
    renderSearchResults(results) {
        this.ui.searchResultsContainer.innerHTML = '';
        if (results.length === 0) {
            this.ui.searchResultsContainer.innerHTML = '<p class="text-center text-gray-400">No se encontraron resultados para su búsqueda.</p>';
        } else {
            this.renderBlocks(results, this.ui.searchResultsContainer);
        }
    }


    // --- Lógica de Renderizado y UI ---

    /**
     * Actualiza todos los componentes del dashboard (estadísticas, ledger, gráficos).
     */
    updateDashboard() {
        this.renderLedger();
        this.updateStats();
        this.renderChart();
    }

    /**
     * Renderiza la lista completa de bloques en el ledger.
     */
    renderLedger() {
        this.ui.blockchainLedger.innerHTML = '';
        const blocksToRender = this.blockchain.chain.slice(1); // Omitir bloque génesis
        if (blocksToRender.length === 0) {
            this.ui.blockchainLedger.innerHTML = '<p class="text-center text-gray-400">Aún no hay transacciones. ¡Registra la primera factura!</p>';
        } else {
            this.renderBlocks(blocksToRender, this.ui.blockchainLedger);
        }
    }

    /**
     * Renderiza una lista de bloques en un contenedor especificado.
     * @param {Array<Block>} blocks - Los bloques a renderizar.
     * @param {HTMLElement} container - El contenedor donde se renderizarán los bloques.
     */
    renderBlocks(blocks, container) {
        container.innerHTML = '';
        // Renderizar desde el más reciente al más antiguo
        for (let i = blocks.length - 1; i >= 0; i--) {
            this.renderBlock(blocks[i], container);
        }
    }
    
    /**
     * Renderiza un único bloque en la interfaz.
     * @param {Object} block - El objeto del bloque a renderizar.
     * @param {HTMLElement} container - El contenedor donde se añadirá el bloque.
     * @param {boolean} prepend - Si se debe añadir al inicio del contenedor (true).
     */
    renderBlock(block, container, prepend = false) {
        const blockId = block.hash || block.id; // Usa hash real o ID temporal
        const blockElement = document.createElement('div');
        blockElement.id = blockId;
        blockElement.className = 'blockchain-block p-5 rounded-lg card-hover';

        const totalAmount = block.data.subtotal + block.data.iva;
        const traceHtml = this.getTraceHtml(block.traceability);
        
        blockElement.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-start">
                <div>
                    <p class="text-sm text-gray-400">Factura #${block.data.number}</p>
                    <p class="font-bold text-lg">${block.data.companyName}</p>
                    <p class="text-xs text-gray-500">NIT: ${block.data.companyNit}</p>
                </div>
                <div class="text-right mt-4 md:mt-0">
                    <p class="text-2xl font-bold gradient-text">$${totalAmount.toLocaleString('es-CO')}</p>
                    <p class="text-sm text-gray-400">IVA: $${block.data.iva.toLocaleString('es-CO')}</p>
                </div>
            </div>
            <div class="border-t border-gray-700 my-4"></div>
            <div>
                <h4 class="font-semibold mb-3">Trazabilidad del Proceso:</h4>
                <ul class="space-y-0">${traceHtml}</ul>
            </div>
            ${block.hash ? `
            <div class="border-t border-gray-700 mt-4 pt-3 text-xs text-gray-500">
                <p class="truncate">Hash: ${block.hash}</p>
                <p class="truncate">Prev. Hash: ${block.previousHash}</p>
            </div>` : ''}
        `;
        if (prepend) {
            container.prepend(blockElement);
        } else {
            container.appendChild(blockElement);
        }
    }

    /**
     * Actualiza la traza de un bloque ya renderizado.
     * @param {string} blockId - El ID o hash del bloque a actualizar.
     * @param {Array} traceability - El nuevo array de trazabilidad.
     */
    updateBlockTrace(blockId, traceability) {
        const blockElement = document.getElementById(blockId);
        if (!blockElement) return;
        
        const traceHtml = this.getTraceHtml(traceability);
        const traceContainer = blockElement.querySelector('ul');
        if (traceContainer) {
            traceContainer.innerHTML = traceHtml;
        }
    }
    
    /**
     * Genera el HTML para la traza de un bloque.
     * @param {Array} traceability - El array de trazabilidad.
     * @returns {string} El HTML generado.
     */
    getTraceHtml(traceability) {
        let traceHtml = traceability.map((t, index) => {
            const icon = this.getIconForStatus(t.status);
            const isLast = index === traceability.length - 1;
            return `
                <li class="flex items-start space-x-4">
                    <div class="flex flex-col items-center">
                        <i class="fas ${icon} text-green-400 text-lg"></i>
                        <div class="w-px h-8 bg-gray-600 mt-1 ${isLast ? 'hidden' : ''}"></div>
                    </div>
                    <div>
                        <p class="font-semibold">${t.status}</p>
                        <p class="text-xs text-gray-400">${t.details}</p>
                        <p class="text-xs text-gray-500 mt-1">${new Date(t.timestamp).toLocaleString()}</p>
                    </div>
                </li>
            `;
        }).join('');
        return traceHtml;
    }
    
    /**
     * Devuelve un icono de FontAwesome basado en el estado de la traza.
     * @param {string} status - El estado de la trazabilidad.
     * @returns {string} La clase del icono.
     */
    getIconForStatus(status) {
        switch (status) {
            case 'Recibido por el Sistema': return 'fa-inbox';
            case 'Validando Datos (DIAN)': return 'fa-tasks';
            case 'Incorporado en Blockchain': return 'fa-link';
            case 'Fondos Distribuidos (Hacienda)': return 'fa-sitemap';
            case 'Ejecutado en Proyecto (Entidad Final)': return 'fa-check-circle';
            default: return 'fa-question-circle';
        }
    }

    /**
     * Actualiza las tarjetas de estadísticas principales.
     */
    updateStats() {
        const invoices = this.blockchain.chain.slice(1); // Omitir bloque génesis
        const numInvoices = invoices.length;
        const totalIva = invoices.reduce((sum, block) => sum + block.data.iva, 0);
        const totalAmount = invoices.reduce((sum, block) => sum + block.data.subtotal + block.data.iva, 0);
        const avgInvoice = numInvoices > 0 ? totalAmount / numInvoices : 0;

        if (this.ui.totalInvoices) this.ui.totalInvoices.textContent = numInvoices;
        if (this.ui.totalIva) this.ui.totalIva.textContent = `$${totalIva.toLocaleString('es-CO', {maximumFractionDigits: 0})}`;
        if (this.ui.totalAmount) this.ui.totalAmount.textContent = `$${totalAmount.toLocaleString('es-CO', {maximumFractionDigits: 0})}`;
        if (this.ui.avgInvoice) this.ui.avgInvoice.textContent = `$${avgInvoice.toLocaleString('es-CO', {maximumFractionDigits: 0})}`;
    }

    /**
     * Renderiza el gráfico de distribución del IVA por sectores.
     */
    renderChart() {
        const invoices = this.blockchain.chain.slice(1);
        const totalIva = invoices.reduce((sum, block) => sum + block.data.iva, 0);

        const labels = Object.keys(this.SECTOR_DISTRIBUTION);
        const data = labels.map(label => totalIva * this.SECTOR_DISTRIBUTION[label].percentage);
        const colors = labels.map(label => this.SECTOR_DISTRIBUTION[label].color);

        if (this.chart) {
            this.chart.data.datasets[0].data = data;
            this.chart.update();
        } else if (this.ui.sectorChartCanvas) {
            this.chart = new Chart(this.ui.sectorChartCanvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Distribución del IVA',
                        data: data,
                        backgroundColor: colors,
                        borderColor: '#161b22',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#f7fafc'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(context.parsed);
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Actualizar detalles de texto
        if (this.ui.sectorDetails) {
            this.ui.sectorDetails.innerHTML = labels.map((label, index) => `
                <div class="flex justify-between items-center text-sm">
                    <div class="flex items-center">
                        <span class="w-3 h-3 rounded-full mr-3" style="background-color: ${colors[index]}"></span>
                        <span>${label}</span>
                    </div>
                    <span class="font-semibold">$${data[index].toLocaleString('es-CO', {maximumFractionDigits: 0})}</span>
                </div>
            `).join('');
        }
    }

    /**
     * Cambia entre las pestañas principales del dashboard.
     * @param {string} tabId - El ID de la pestaña a mostrar.
     */
    switchTab(tabId) {
        this.ui.tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
        this.ui.tabs.forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Si se cambia a la pestaña de estadísticas, asegurar que el gráfico se renderice
        if (tabId === 'stats-tab') {
            this.renderChart();
        }
        
        // Limpiar resultados de búsqueda al cambiar de pestaña
        if (tabId === 'search-tab') {
            if (this.ui.searchResultsContainer) this.ui.searchResultsContainer.innerHTML = '';
        }
    }

    // --- Funciones de Utilidad ---

    /**
     * Muestra una notificación en la pantalla.
     * @param {string} message - El mensaje a mostrar.
     * @param {string} type - 'success' (default) o 'error'.
     */
    showNotification(message, type = 'success') {
        const notificationDiv = this.ui.notification.firstElementChild;
        notificationDiv.classList.remove('bg-green-600', 'bg-red-600');
        notificationDiv.classList.add(type === 'error' ? 'bg-red-600' : 'bg-green-600');
        this.ui.notificationMessage.textContent = message;
        this.ui.notification.classList.add('show');
        setTimeout(() => {
            this.ui.notification.classList.remove('show');
        }, 4000);
    }

    /**
     * Muestra u oculta el overlay de carga.
     * @param {boolean} show - True para mostrar, false para ocultar.
     */
    showLoading(show) {
        if (this.ui.loadingOverlay) this.ui.loadingOverlay.classList.toggle('hidden', !show);
    }
    
    /**
     * Simula una espera asíncrona.
     * @param {number} ms - Milisegundos a esperar.
     * @returns {Promise}
     */
    simulateProcess(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}


// ===================================================================================
// CLASES DEL MODELO BLOCKCHAIN - Definen la estructura de datos
// ===================================================================================

/**
 * Representa un bloque individual en la cadena.
 */
class Block {
    constructor(index, timestamp, data, previousHash = '', traceability = []) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; // Datos de la factura
        this.previousHash = previousHash;
        this.hash = ''; // El hash se calculará después
        this.traceability = traceability; // Array para el seguimiento de estados
    }

    /**
     * Calcula el hash SHA-256 del bloque.
     * @returns {Promise<string>} El hash del bloque.
     */
    async calculateHash() {
        const dataString = this.index + this.previousHash + this.timestamp + JSON.stringify(this.data);
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

/**
 * Representa la cadena de bloques completa.
 */
class Blockchain {
    constructor() {
        this.chain = [];
    }
    
    /**
     * Crea el primer bloque de la cadena (bloque génesis) de forma asíncrona.
     * @returns {Promise<Block>} El bloque génesis.
     */
    async createGenesisBlock() {
        const genesisBlock = new Block(0, new Date().toISOString(), "Bloque Génesis", "0");
        genesisBlock.hash = await genesisBlock.calculateHash();
        return genesisBlock;
    }

    /**
     * Obtiene el último bloque de la cadena.
     * @returns {Block} El último bloque.
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Añade un nuevo bloque a la cadena.
     * @param {Object} data - Los datos de la factura para el nuevo bloque.
     * @param {Array} traceability - El historial de trazabilidad inicial.
     * @returns {Promise<Block>} El nuevo bloque añadido.
     */
    async addBlock(data, traceability) {
        if (this.chain.length === 0) {
            // Asegurarse de que el bloque génesis exista antes de añadir un nuevo bloque.
            this.chain.push(await this.createGenesisBlock());
        }

        const latestBlock = this.getLatestBlock();
        const newBlock = new Block(
            this.chain.length,
            new Date().toISOString(),
            data,
            latestBlock.hash,
            traceability
        );
        newBlock.hash = await newBlock.calculateHash(); // Calcular y asignar el hash de forma asíncrona
        this.chain.push(newBlock);
        return newBlock;
    }

    /**
     * Verifica si la cadena de bloques es válida.
     * @returns {Promise<boolean>} True si la cadena es válida, false en caso contrario.
     */
    async isChainValid() {
        // El bloque génesis no tiene hash previo para comparar
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Recalcular el hash y comparar
            const recalculatedHash = await currentBlock.calculateHash();
            if (currentBlock.hash !== recalculatedHash) {
                console.error('Corrupción de datos detectada en el bloque:', currentBlock);
                return false;
            }

            // Comparar el hash previo
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.error('Ruptura de la cadena detectada en el bloque:', currentBlock);
                return false;
            }
        }
        return true;
    }
    
    /**
     * Guarda la cadena de bloques en localStorage.
     */
    saveChainToStorage() {
        localStorage.setItem('blockchain_data', JSON.stringify(this.chain));
    }

    /**
     * Carga la cadena de bloques desde localStorage.
     */
    async loadChainFromStorage() {
        const chainData = localStorage.getItem('blockchain_data');
        if (chainData) {
            const parsedChain = JSON.parse(chainData);
            
            // Re-instanciar los bloques para asegurar que los métodos existan
            const tempChain = parsedChain.map(blockData => {
                 const block = new Block(blockData.index, blockData.timestamp, blockData.data, blockData.previousHash, blockData.traceability);
                 block.hash = blockData.hash; // Asignar el hash guardado
                 return block;
            });
            
            // Si la cadena cargada es válida, la asignamos.
            if (await this.isChainValidFromList(tempChain)) {
                this.chain = tempChain;
            } else {
                console.error('La cadena cargada desde localStorage no es válida. Reiniciando la cadena.');
                this.chain = [await this.createGenesisBlock()];
            }

        } else {
            // Si no hay datos, crear un nuevo bloque génesis.
            this.chain = [await this.createGenesisBlock()];
        }
    }
    
    /**
     * Verifica la validez de una cadena de bloques dada.
     * Se usa para validar la cadena cargada desde el almacenamiento local.
     * @param {Array<Block>} chainList - La lista de bloques a validar.
     * @returns {Promise<boolean>}
     */
    async isChainValidFromList(chainList) {
        // Si la cadena tiene menos de 2 bloques, el único bloque es el génesis y se considera válido.
        if (chainList.length <= 1) return true;
        
        for (let i = 1; i < chainList.length; i++) {
            const currentBlock = chainList[i];
            const previousBlock = chainList[i - 1];
            
            // Validar que el hash del bloque actual coincida con su contenido.
            const recalculatedHash = await currentBlock.calculateHash();
            if (currentBlock.hash !== recalculatedHash) {
                return false;
            }
            // Validar que el hash previo del bloque actual coincida con el hash del bloque anterior.
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
}
