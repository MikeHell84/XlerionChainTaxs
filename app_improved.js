/**
 * Xlerion BlockChain Gov - app_improved.js
 * -----------------------------------------
 * Este archivo contiene toda la lógica para la simulación de trazabilidad del IVA.
 * Gestiona la autenticación de usuarios, la creación de bloques, la simulación
 * de estados del ciclo de vida del impuesto, la búsqueda de transacciones
 * y la renderización dinámica de la UI.
 *
 * @author Miguel (Xlerion) & Asistente AI
 * @version 2.2.8 (Mejora en la lógica de traducción y manejo de errores de DOM)
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
            searchButton: document.getElementById('search-button'),

            // Ventana Modal de Información
            infoModal: document.getElementById('info-modal'),
            openInfoModalBtn: document.getElementById('open-info-modal-btn'),
            closeInfoModalBtn: document.getElementById('close-info-modal-btn'),

            // Selector de Idioma
            languageToggleBtn: document.getElementById('language-toggle-btn'),
            currentLanguageText: document.getElementById('current-language-text') // Para el texto del botón de idioma
        };

        // --- Estado de la Aplicación ---
        this.blockchain = new Blockchain();
        this.currentUser = null;
        this.chart = null;
        this.currentLanguage = localStorage.getItem('appLanguage') || 'es'; // Idioma por defecto

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

        // --- Diccionario de Traducciones ---
        this.translations = {
            es: {
                // Global
                'app-title': 'Xlerion BlockChain Gov',
                'welcome-message': '¡Bienvenido!',
                'auth-subtitle': 'Inicia sesión o regístrate para continuar.',
                'login-username-placeholder': 'Nombre de usuario',
                'login-password-placeholder': 'Contraseña',
                'login-button': 'Iniciar Sesión',
                'no-account-text': '¿No tienes una cuenta?',
                'register-link': 'Regístrate aquí',
                'register-fullname-placeholder': 'Nombre completo',
                'register-username-placeholder': 'Nombre de usuario',
                'register-email-placeholder': 'Correo electrónico',
                'register-password-placeholder': 'Contraseña',
                'register-button': 'Registrarse',
                'back-to-login': 'Volver al Login',
                'user-welcome-prefix': 'Bienvenido,',
                'logout-button': 'Cerrar Sesión',
                'info-button': 'Información',
                'notification-success': '¡Operación exitosa!',
                'notification-error-prefix': 'Error: ',
                'processing-transaction': 'Procesando transacción...',
                'all-fields-required': 'Todos los campos son obligatorios.',
                'password-min-length': 'La contraseña debe tener al menos 8 caracteres.',
                'username-exists': 'El nombre de usuario ya existe.',
                'invalid-credentials': 'Usuario o contraseña incorrectos.',
                'logged-out': 'Has cerrado sesión.',
                'invoice-form-incomplete': 'Por favor, completa todos los campos de la factura.',
                'blockchain-validated-success': '¡Éxito! La integridad del blockchain ha sido verificada.',
                'blockchain-validated-error': '¡Alerta de Seguridad! Se ha detectado una inconsistencia en el blockchain.',
                'search-no-criteria': 'Por favor, introduce al menos un criterio de búsqueda.',
                'search-no-results': 'No se encontraron resultados para su búsqueda.',
                'no-transactions-yet': 'Aún no hay transacciones. ¡Registra la primera factura!',

                // Tabs
                'tab-create-invoice': 'Crear Factura',
                'tab-ledger': 'Ledger',
                'tab-search': 'Búsqueda',
                'tab-stats': 'Estadísticas',

                // Create Invoice Tab
                'register-new-invoice-title': 'Registrar Nueva Factura',
                'invoice-number-label': 'Número de Factura',
                'company-name-label': 'Nombre de Empresa',
                'company-nit-label': 'NIT de Empresa',
                'subtotal-label': 'Subtotal ($)',
                'iva-amount-label': 'Valor del IVA (19%)',
                'add-invoice-button': 'Añadir Factura al Blockchain',

                // Ledger Tab
                'ledger-title': 'Registro de Transacciones (Ledger)',
                'validate-blockchain-button': 'Validar Blockchain',
                'invoice-number-prefix': 'Factura #',
                'iva-prefix': 'IVA:',
                'traceability-title': 'Trazabilidad del Proceso:',
                'hash-prefix': 'Hash:',
                'prev-hash-prefix': 'Prev. Hash:',

                // Search Tab
                'search-invoices-title': 'Buscar Facturas',
                'search-company-placeholder': 'Nombre de Empresa',
                'search-nit-placeholder': 'NIT de Empresa',
                'search-invoice-placeholder': 'Número de Factura',
                'search-date-from-title': 'Desde la fecha',
                'search-date-to-title': 'Hasta la fecha',
                'search-button': 'Buscar',

                // Stats Tab
                'stats-title': 'Estadísticas y Distribución del IVA',
                'general-summary-title': 'Resumen General',
                'total-invoices-label': 'Total de Facturas',
                'iva-collected-label': 'IVA Recaudado',
                'total-amount-label': 'Monto Total',
                'avg-invoice-label': 'Promedio por Factura',
                'sector-distribution-title': 'Distribución por Sectores',
                'distribution-details-title': 'Detalles de la Distribución',

                // Info Modal
                'info-modal-title': 'Información del Sistema XlerionChainTaxs',
                'info-guide-title': 'Guía Informativa: Uso y Expectativas en el Estado Colombiano',
                'info-guide-intro': 'El sistema XlerionChainTaxs busca transformar la gestión fiscal en Colombia a través de la tecnología blockchain, ofreciendo un nuevo nivel de **transparencia y eficiencia**. A continuación, se detalla cómo se espera que este sistema sea utilizado y las expectativas de su impacto en el estado colombiano:',
                'usage-title': 'Uso del Sistema',
                'usage-1': 'Registro de Transacciones Fiscales: Cada factura, pago de impuestos y movimiento de fondos relacionados con el IVA será registrado como un bloque inmutable en la cadena. Esto incluye el subtotal, el valor del IVA y la empresa o entidad involucrada.',
                'usage-2': 'Trazabilidad en Tiempo Real: Las entidades gubernamentales y los ciudadanos podrán seguir el ciclo de vida de los fondos del IVA, desde su recaudación hasta su asignación final en proyectos específicos (salud, educación, infraestructura, etc.).',
                'usage-3': 'Acceso Público y Auditoría: La naturaleza descentralizada de la blockchain permitirá que cualquier persona acceda al registro público de transacciones, facilitando la auditoría ciudadana y la rendición de cuentas.',
                'usage-4': 'Automatización con Contratos Inteligentes: Se prevé el uso de contratos inteligentes para automatizar la distribución del IVA a los sectores predefinidos, reduciendo la intervención manual y los posibles errores o fraudes.',
                'expectations-title': 'Expectativas en el Estado Colombiano',
                'expectations-1': 'Aumento de la Transparencia: La principal expectativa es erradicar la opacidad en el manejo de los fondos públicos, permitiendo a los ciudadanos ver exactamente cómo se utilizan sus impuestos. Esto puede fortalecer la confianza pública en las instituciones.',
                'expectations-2': 'Reducción de la Corrupción: Al hacer las transacciones inmutables y públicamente verificables, se dificultan las prácticas corruptas, ya que cualquier desvío de fondos sería evidente en la cadena.',
                'expectations-3': 'Optimización de la Gestión de Recursos: La trazabilidad detallada permitirá al estado colombiano identificar ineficiencias en la asignación y ejecución de presupuestos, facilitando una toma de decisiones más informada.',
                'expectations-4': 'Fomento de la Participación Ciudadana: Con acceso a información clara y verificable, los ciudadanos podrán participar de manera más activa en la fiscalización y en el debate sobre las prioridades de gasto público.',
                'expectations-5': 'Modernización de la Administración Pública: La implementación de esta tecnología posicionará a Colombia como un líder en la adopción de soluciones innovadoras para la gobernanza, mejorando la eficiencia administrativa y la seguridad de los datos fiscales.',
                'legal-terms-title': 'Términos Legales y Privacidad',
                'legal-terms-intro': 'Este sistema opera bajo los principios de la legislación colombiana e internacional en materia de protección de datos y transparencia. A continuación, se presentan los términos generales aplicables:',
                'legal-1-title': '1. Protección de Datos Personales (Colombia y Global)',
                'legal-1-content': 'La recopilación y procesamiento de datos personales se rige por la Ley 1581 de 2012 (Ley de Protección de Datos Personales de Colombia) y sus decretos reglamentarios. A nivel internacional, se consideran principios del Reglamento General de Protección de Datos (GDPR) de la Unión Europea, especialmente en lo que respecta a la minimización de datos y la seguridad. Los datos sensibles serán anonimizados o hasheados antes de ser registrados en la blockchain pública.',
                'legal-2-title': '2. Transparencia y Acceso a la Información Pública',
                'legal-2-content': 'El sistema se alinea con la Ley 1712 de 2014 (Ley de Transparencia y del Derecho de Acceso a la Información Pública Nacional) de Colombia. La información fiscal registrada en la blockchain, que no sea de carácter personal o sensible, será accesible para el público con el fin de fomentar la rendición de cuentas y la auditoría ciudadana.',
                'legal-3-title': '3. Uso de la Tecnología Blockchain',
                'legal-3-content': 'La blockchain garantiza la inmutabilidad y la seguridad de los registros. Sin embargo, es importante entender que la información una vez registrada no puede ser alterada ni eliminada. Los usuarios son responsables de la veracidad de los datos que ingresan al sistema.',
                'legal-4-title': '4. Limitación de Responsabilidad',
                'legal-4-content': 'XlerionChainTaxs es una herramienta tecnológica para la gestión y trazabilidad fiscal. No constituye asesoría legal, contable o financiera. Los usuarios deben consultar a profesionales cualificados para cualquier decisión basada en la información del sistema.',
                'legal-5-title': '5. Jurisdicción',
                'legal-5-content': 'Cualquier disputa legal relacionada con el uso de este sistema se regirá por las leyes de la República de Colombia.',
            },
            en: {
                // Global
                'app-title': 'Xlerion BlockChain Gov',
                'welcome-message': 'Welcome!',
                'auth-subtitle': 'Log in or register to continue.',
                'login-username-placeholder': 'Username',
                'login-password-placeholder': 'Password',
                'login-button': 'Log In',
                'no-account-text': 'Don\'t have an account?',
                'register-link': 'Register here',
                'register-fullname-placeholder': 'Full Name',
                'register-username-placeholder': 'Username',
                'register-email-placeholder': 'Email',
                'register-password-placeholder': 'Password',
                'register-button': 'Register',
                'back-to-login': 'Back to Login',
                'user-welcome-prefix': 'Welcome,',
                'logout-button': 'Log Out',
                'info-button': 'Information',
                'notification-success': 'Operation successful!',
                'notification-error-prefix': 'Error: ',
                'processing-transaction': 'Processing transaction...',
                'all-fields-required': 'All fields are required.',
                'password-min-length': 'Password must be at least 8 characters long.',
                'username-exists': 'Username already exists.',
                'invalid-credentials': 'Incorrect username or password.',
                'logged-out': 'You have logged out.',
                'invoice-form-incomplete': 'Please complete all invoice fields.',
                'blockchain-validated-success': 'Success! Blockchain integrity has been verified.',
                'blockchain-validated-error': 'Security Alert! An inconsistency has been detected in the blockchain.',
                'search-no-criteria': 'Please enter at least one search criterion.',
                'search-no-results': 'No results found for your search.',
                'no-transactions-yet': 'No transactions yet. Register the first invoice!',

                // Tabs
                'tab-create-invoice': 'Create Invoice',
                'tab-ledger': 'Ledger',
                'tab-search': 'Search',
                'tab-stats': 'Statistics',

                // Create Invoice Tab
                'register-new-invoice-title': 'Register New Invoice',
                'invoice-number-label': 'Invoice Number',
                'company-name-label': 'Company Name',
                'company-nit-label': 'Company NIT',
                'subtotal-label': 'Subtotal ($)',
                'iva-amount-label': 'VAT Amount (19%)',
                'add-invoice-button': 'Add Invoice to Blockchain',

                // Ledger Tab
                'ledger-title': 'Blockchain Ledger',
                'validate-blockchain-button': 'Validate Blockchain',
                'invoice-number-prefix': 'Invoice #',
                'iva-prefix': 'VAT:',
                'traceability-title': 'Process Traceability:',
                'hash-prefix': 'Hash:',
                'prev-hash-prefix': 'Prev. Hash:',

                // Search Tab
                'search-invoices-title': 'Search Invoices',
                'search-company-placeholder': 'Company Name',
                'search-nit-placeholder': 'Company NIT',
                'search-invoice-placeholder': 'Invoice Number',
                'search-date-from-title': 'From Date',
                'search-date-to-title': 'To Date',
                'search-button': 'Search',

                // Stats Tab
                'stats-title': 'VAT Statistics and Distribution',
                'general-summary-title': 'General Summary',
                'total-invoices-label': 'Total Invoices',
                'iva-collected-label': 'VAT Collected',
                'total-amount-label': 'Total Amount',
                'avg-invoice-label': 'Average per Invoice',
                'sector-distribution-title': 'VAT Distribution by Sectors',
                'distribution-details-title': 'Distribution Details',

                // Info Modal
                'info-modal-title': 'XlerionChainTaxs System Information',
                'info-guide-title': 'Informative Guide: Usage and Expectations in the Colombian State',
                'info-guide-intro': 'The XlerionChainTaxs system aims to transform fiscal management in Colombia through blockchain technology, offering a new level of **transparency and efficiency**. Below, we detail how this system is expected to be used and the expectations of its impact on the Colombian state:',
                'usage-title': 'System Usage',
                'usage-1': 'Fiscal Transaction Registry: Every invoice, tax payment, and fund movement related to VAT will be recorded as an immutable block on the chain. This includes the subtotal, VAT value, and the involved company or entity.',
                'usage-2': 'Real-time Traceability: Government entities and citizens will be able to follow the life cycle of VAT funds, from their collection to their final allocation in specific projects (health, education, infrastructure, etc.).',
                'usage-3': 'Public Access and Auditability: The decentralized nature of the blockchain will allow anyone to access the public transaction log, facilitating citizen auditing and accountability.',
                'usage-4': 'Automation with Smart Contracts: The use of smart contracts is foreseen to automate the distribution of VAT to predefined sectors, reducing manual intervention and potential errors or fraud.',
                'expectations-title': 'Expectations in the Colombian State',
                'expectations-1': 'Increased Transparency: The main expectation is to eradicate opacity in the management of public funds, allowing citizens to see exactly how their taxes are used. This can strengthen public trust in institutions.',
                'expectations-2': 'Reduction of Corruption: By making transactions immutable and publicly verifiable, corrupt practices are hindered, as any diversion of funds would be evident on the chain.',
                'expectations-3': 'Optimization of Resource Management: Detailed traceability will allow the Colombian state to identify inefficiencies in budget allocation and execution, facilitating more informed decision-making.',
                'expectations-4': 'Promotion of Citizen Participation: With access to clear and verifiable information, citizens will be able to participate more actively in oversight and in the debate on public spending priorities.',
                'expectations-5': 'Modernization of Public Administration: The implementation of this technology will position Colombia as a leader in adopting innovative solutions for governance, improving administrative efficiency and fiscal data security.',
                'legal-terms-title': 'Legal Terms and Privacy',
                'legal-terms-intro': 'This system operates under the principles of Colombian and international legislation regarding data protection and transparency. Below are the general terms applicable:',
                'legal-1-title': '1. Personal Data Protection (Colombia and Global)',
                'legal-1-content': 'The collection and processing of personal data is governed by Law 1581 of 2012 (Colombian Personal Data Protection Law) and its regulatory decrees. Internationally, principles of the European Union\'s General Data Protection Regulation (GDPR) are considered, especially regarding data minimization and security. Sensitive data will be anonymized or hashed before being recorded on the public blockchain.',
                'legal-2-title': '2. Transparency and Access to Public Information',
                'legal-2-content': 'The system aligns with Law 1712 of 2014 (National Transparency and Right to Access Public Information Law) of Colombia. Fiscal information recorded on the blockchain, which is not personal or sensitive, will be publicly accessible to foster accountability and citizen auditing.',
                'legal-3-title': '3. Use of Blockchain Technology',
                'legal-3-content': 'Blockchain guarantees the immutability and security of records. However, it is important to understand that once recorded, information cannot be altered or deleted. Users are responsible for the veracity of the data they enter into the system.',
                'legal-4-title': '4. Limitation of Liability',
                'legal-4-content': 'XlerionChainTaxs is a technological tool for fiscal management and traceability. It does not constitute legal, accounting, or financial advice. Users should consult qualified professionals for any decisions based on system information.',
                'legal-5-title': '5. Jurisdiction',
                'legal-5-content': 'Any legal dispute related to the use of this system will be governed by the laws of the Republic of Colombia.',
            }
        };
    }

    /**
     * Inicializa la aplicación, establece los event listeners y carga el estado inicial.
     */
    async init() {
        this.setupEventListeners();
        this.switchLanguage(this.currentLanguage); // Establece el idioma al inicio
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
        
        // --- Event listener para el formulario de búsqueda ---
        if (this.ui.searchForm) {
            this.ui.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.searchBlocks();
            });
        }

        // --- Event listeners para la ventana modal de información ---
        if (this.ui.openInfoModalBtn) {
            this.ui.openInfoModalBtn.addEventListener('click', () => this.toggleInfoModal(true));
        }
        if (this.ui.closeInfoModalBtn) {
            this.ui.closeInfoModalBtn.addEventListener('click', () => this.toggleInfoModal(false));
        }
        if (this.ui.infoModal) {
            this.ui.infoModal.addEventListener('click', (e) => {
                if (e.target === this.ui.infoModal) { // Cierra si se hace clic fuera del contenido
                    this.toggleInfoModal(false);
                }
            });
        }

        // --- Event listener para el botón de cambio de idioma ---
        if (this.ui.languageToggleBtn) {
            this.ui.languageToggleBtn.addEventListener('click', () => {
                const newLang = this.currentLanguage === 'es' ? 'en' : 'es';
                this.switchLanguage(newLang);
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
            this.showNotification(this.translations[this.currentLanguage]['all-fields-required'], 'error');
            return;
        }
        if (password.length < 8) {
            this.showNotification(this.translations[this.currentLanguage]['password-min-length'], 'error');
            return;
        }

        const users = this.getUsersFromStorage();
        if (users[username]) {
            this.showNotification(this.translations[this.currentLanguage]['username-exists'], 'error');
            return;
        }

        const hashedPassword = await this.hashPassword(password);
        users[username] = { fullname, email, password: hashedPassword };
        localStorage.setItem('blockchain_users', JSON.stringify(users));
        this.showNotification(this.translations[this.currentLanguage]['notification-success'] + ' ' + this.translations[this.currentLanguage]['back-to-login']);
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
                this.showNotification(`${this.translations[this.currentLanguage]['user-welcome-prefix']} ${this.currentUser.fullname}!`);
                await this.enterApp();
                return;
            }
        }
        this.showNotification(this.translations[this.currentLanguage]['invalid-credentials'], 'error');
    }

    /**
     * Cierra la sesión del usuario.
     */
    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        this.showNotification(this.translations[this.currentLanguage]['logged-out']);
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
            this.showNotification(this.translations[this.currentLanguage]['invoice-form-incomplete'], 'error');
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
        this.showNotification(this.translations[this.currentLanguage]['notification-success']);
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
            this.showNotification(this.translations[this.currentLanguage]['blockchain-validated-success'], 'success');
        } else {
            this.showNotification(this.translations[this.currentLanguage]['blockchain-validated-error'], 'error');
        }
    }

    // --- Lógica de Búsqueda ---

    /**
     * Busca bloques en el blockchain según los criterios del formulario de búsqueda.
     * Permite buscar con campos vacíos, pero requiere al menos un campo rellenado.
     */
    searchBlocks() {
        // Obtenemos y normalizamos los valores de los campos de búsqueda.
        const companyName = this.ui.searchCompanyInput.value.toLowerCase().trim();
        const nit = this.ui.searchNitInput.value.trim();
        const invoiceNumber = this.ui.searchInvoiceInput.value.trim();
        const startDate = this.ui.searchDateFromInput.value ? new Date(this.ui.searchDateFromInput.value) : null;
        const endDate = this.ui.searchDateToInput.value ? new Date(this.ui.searchDateToInput.value) : null;

        // Imprimimos los parámetros de búsqueda en la consola para depuración
        console.log('DEBUG: Inicia la búsqueda con los siguientes parámetros:', {
            companyName,
            nit,
            invoiceNumber,
            startDate,
            endDate
        });

        // Validar que al menos un campo tenga datos
        if (!companyName && !nit && !invoiceNumber && !startDate && !endDate) {
            this.showNotification(this.translations[this.currentLanguage]['search-no-criteria'], 'error');
            this.ui.searchResultsContainer.innerHTML = '';
            console.log('DEBUG: Búsqueda cancelada, ningún campo rellenado.');
            return;
        }

        // Asegurarse de que la cadena no esté vacía y que no se incluya el bloque génesis
        const blocksToSearch = this.blockchain.chain.length > 1 ? this.blockchain.chain.slice(1) : [];
        console.log(`DEBUG: Total de bloques a buscar: ${blocksToSearch.length}`);

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
            
            // Log de cada bloque para ver si cumple las condiciones
            // console.log(`DEBUG: Bloque #${block.index} - Coincidencias: Empresa(${companyNameMatch}), NIT(${nitMatch}), Factura(${invoiceNumberMatch}), Fecha(${startDateMatch && endDateMatch})`);

            return companyNameMatch && nitMatch && invoiceNumberMatch && startDateMatch && endDateMatch;
        });

        console.log(`DEBUG: Búsqueda finalizada. Se encontraron ${results.length} resultados.`);
        this.renderSearchResults(results);
    }
    
    /**
     * Renderiza los resultados de la búsqueda.
     * @param {Array<Block>} results - Los bloques que coinciden con la búsqueda.
     */
    renderSearchResults(results) {
        this.ui.searchResultsContainer.innerHTML = '';
        if (results.length === 0) {
            this.ui.searchResultsContainer.innerHTML = `<p class="text-center text-gray-400">${this.translations[this.currentLanguage]['search-no-results']}</p>`;
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
            this.ui.blockchainLedger.innerHTML = `<p class="text-center text-gray-400">${this.translations[this.currentLanguage]['no-transactions-yet']}</p>`;
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
                    <p class="text-sm text-gray-400">${this.translations[this.currentLanguage]['invoice-number-prefix']}${block.data.number}</p>
                    <p class="font-bold text-lg">${block.data.companyName}</p>
                    <p class="text-xs text-gray-500">NIT: ${block.data.companyNit}</p>
                </div>
                <div class="text-right mt-4 md:mt-0">
                    <p class="text-2xl font-bold gradient-text">$${totalAmount.toLocaleString('es-CO')}</p>
                    <p class="text-sm text-gray-400">${this.translations[this.currentLanguage]['iva-prefix']} $${block.data.iva.toLocaleString('es-CO')}</p>
                </div>
            </div>
            <div class="border-t border-gray-700 my-4"></div>
            <div>
                <h4 class="font-semibold mb-3">${this.translations[this.currentLanguage]['traceability-title']}</h4>
                <ul class="space-y-0">${traceHtml}</ul>
            </div>
            ${block.hash ? `
            <div class="border-t border-gray-700 mt-4 pt-3 text-xs text-gray-500">
                <p class="truncate">${this.translations[this.currentLanguage]['hash-prefix']} ${block.hash}</p>
                <p class="truncate">${this.translations[this.currentLanguage]['prev-hash-prefix']} ${block.previousHash}</p>
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
                        label: this.translations[this.currentLanguage]['sector-distribution-title'],
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

    /**
     * Muestra u oculta la ventana modal de información.
     * @param {boolean} show - True para mostrar, false para ocultar.
     */
    toggleInfoModal(show) {
        if (this.ui.infoModal) {
            this.ui.infoModal.classList.toggle('show', show);
            this.ui.infoModal.classList.toggle('hidden', !show);
        }
    }

    /**
     * Cambia el idioma de la interfaz de usuario.
     * @param {string} lang - El código del idioma ('es' o 'en').
     */
    switchLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('appLanguage', lang);
        document.documentElement.lang = lang; // Actualiza el atributo lang del HTML

        const t = this.translations[lang];

        // Actualizar el texto del botón de idioma
        if (this.ui.currentLanguageText) {
            this.ui.currentLanguageText.textContent = lang === 'es' ? 'English' : 'Español';
        }

        // Actualizar todos los elementos con data-translate
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.dataset.translate;
            if (t[key]) {
                if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                    element.placeholder = t[key];
                } else if (element.tagName === 'INPUT' && element.hasAttribute('title')) {
                    element.title = t[key];
                } else if (element.tagName === 'BUTTON' && element.querySelector('span')) {
                    // Si es un botón con un span dentro (como el botón de Información)
                    element.querySelector('span').textContent = t[key];
                }
                else {
                    // Para otros elementos, actualizar textContent
                    element.textContent = t[key];
                }
            }
        });

        // Actualizaciones específicas que no usan data-translate directamente o requieren lógica especial
        if (this.ui.userName && this.currentUser) {
            this.ui.userName.textContent = this.currentUser.fullname; // Este se actualiza por separado
        }
        // Actualizar el título de la página
        document.title = t['app-title'];

        // Actualizar el texto del overlay de carga
        if (this.ui.loadingOverlay && !this.ui.loadingOverlay.classList.contains('hidden')) {
            this.ui.loadingOverlay.querySelector('p').textContent = t['processing-transaction'];
        }

        // Actualizar el texto de las pestañas (ya tienen data-tab, pero también data-translate)
        this.ui.tabs.forEach(tab => {
            const key = `tab-${tab.dataset.tab}`; // Construye la clave de traducción
            if (t[key]) {
                tab.textContent = t[key];
            }
        });

        // Actualizar los placeholders de los inputs que no tienen data-translate directamente en el placeholder
        if (this.ui.searchCompanyInput) this.ui.searchCompanyInput.placeholder = t['search-company-placeholder'];
        if (this.ui.searchNitInput) this.ui.searchNitInput.placeholder = t['search-nit-placeholder'];
        if (this.ui.searchInvoiceInput) this.ui.searchInvoiceInput.placeholder = t['search-invoice-placeholder'];
        if (this.ui.loginForm) {
            this.ui.loginForm.querySelector('#login-username').placeholder = t['login-username-placeholder'];
            this.ui.loginForm.querySelector('#login-password').placeholder = t['login-password-placeholder'];
        }
        if (this.ui.registerForm) {
            this.ui.registerForm.querySelector('#register-fullname').placeholder = t['register-fullname-placeholder'];
            this.ui.registerForm.querySelector('#register-username').placeholder = t['register-username-placeholder'];
            this.ui.registerForm.querySelector('#register-email').placeholder = t['register-email-placeholder'];
            this.ui.registerForm.querySelector('#register-password').placeholder = t['register-password-placeholder'];
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
        if (this.ui.loadingOverlay) {
            this.ui.loadingOverlay.classList.toggle('hidden', !show);
            if (show) {
                this.ui.loadingOverlay.querySelector('p').textContent = this.translations[this.currentLanguage]['processing-transaction'];
            }
        }
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
