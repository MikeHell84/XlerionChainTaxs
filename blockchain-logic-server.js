// Este código ahora utiliza datos en memoria para simular una base de datos.
// No hay llamadas a una API de servidor.

// Datos simulados para los usuarios
const simulatedUsers = [
    { id: "1", name: "Usuario A" },
    { id: "2", name: "Usuario B" },
    { id: "3", name: "Usuario C" },
];

// Datos simulados para los bloques de la blockchain
const simulatedBlocks = [
    {
        id: "block-1",
        userId: "1",
        invoiceData: {
            nit: "123456789",
            invoiceNumber: "INV-001",
            ivaValue: 1500,
        },
        distribution: {
            "Salud": { total: "120.00", breakdown: { "Nómina de personal": "60.00", "Insumos médicos": "36.00", "Mantenimiento de hospitales": "24.00" } },
            "Educación": { total: "105.00", breakdown: { "Salarios docentes": "63.00", "Materiales escolares": "26.25", "Construcción y mantenimiento de escuelas": "15.75" } },
            "Infraestructura vial": { total: "150.00", breakdown: { "Construcción de vías": "75.00", "Mantenimiento de puentes": "45.00", "Señalización y seguridad": "30.00" } },
            "Ambiente": { total: "75.00", breakdown: { "Proyectos de reforestación": "30.00", "Gestión de residuos": "22.50", "Educación ambiental": "22.50" } },
            "Cultura y deporte": { total: "45.00", breakdown: { "Apoyo a artistas y eventos culturales": "22.50", "Eventos deportivos locales": "11.25", "Mantenimiento de instalaciones deportivas": "11.25" } }
        },
        traceabilityEvents: [
            { sector: "Salud", subcategory: "Nómina de personal", status: "Completado", createdAt: "2023-01-01T10:00:00Z" },
            { sector: "Infraestructura vial", subcategory: "Construcción de vías", status: "En Proceso", createdAt: "2023-01-01T11:00:00Z" },
        ],
        createdAt: "2023-01-01T09:00:00Z"
    },
    {
        id: "block-2",
        userId: "2",
        invoiceData: {
            nit: "987654321",
            invoiceNumber: "INV-002",
            ivaValue: 2500,
        },
        distribution: {
            "Salud": { total: "200.00", breakdown: { "Nómina de personal": "100.00", "Insumos médicos": "60.00", "Mantenimiento de hospitales": "40.00" } },
            "Educación": { total: "175.00", breakdown: { "Salarios docentes": "105.00", "Materiales escolares": "43.75", "Construcción y mantenimiento de escuelas": "26.25" } },
            "Infraestructura vial": { total: "250.00", breakdown: { "Construcción de vías": "125.00", "Mantenimiento de puentes": "75.00", "Señalización y seguridad": "50.00" } },
            "Ambiente": { total: "125.00", breakdown: { "Proyectos de reforestación": "50.00", "Gestión de residuos": "37.50", "Educación ambiental": "37.50" } },
            "Cultura y deporte": { total: "75.00", breakdown: { "Apoyo a artistas y eventos culturales": "37.50", "Eventos deportivos locales": "18.75", "Mantenimiento de instalaciones deportivas": "18.75" } }
        },
        traceabilityEvents: [
            { sector: "Educación", subcategory: "Salarios docentes", status: "En Proceso", createdAt: "2023-01-02T10:00:00Z" },
            { sector: "Salud", subcategory: "Insumos médicos", status: "Pendiente", createdAt: "2023-01-02T11:00:00Z" },
        ],
        createdAt: "2023-01-02T09:00:00Z"
    },
];


// Define una variable para almacenar los datos de los bloques y usuarios
let allBlocksData = [...simulatedBlocks];
let allUsersData = [...simulatedUsers];

// Define la estructura de distribución del IVA con sub-categorías
const IVA_DISTRIBUTION = {
    "Salud": {
        percentage: 0.08,
        breakdown: {
            "Nómina de personal": 0.50,
            "Insumos médicos": 0.30,
            "Mantenimiento de hospitales": 0.20
        }
    },
    "Educación": {
        percentage: 0.07,
        breakdown: {
            "Salarios docentes": 0.60,
            "Materiales escolares": 0.25,
            "Construcción y mantenimiento de escuelas": 0.15
        }
    },
    "Infraestructura vial": {
        percentage: 0.10,
        breakdown: {
            "Construcción de vías": 0.50,
            "Mantenimiento de puentes": 0.30,
            "Señalización y seguridad": 0.20
        }
    },
    "Ambiente": {
        percentage: 0.05,
        breakdown: {
            "Proyectos de reforestación": 0.40,
            "Gestión de residuos": 0.30,
            "Educación ambiental": 0.30
        }
    },
    "Cultura y deporte": {
        percentage: 0.03,
        breakdown: {
            "Apoyo a artistas y eventos culturales": 0.50,
            "Eventos deportivos locales": 0.25,
            "Mantenimiento de instalaciones deportivas": 0.25
        }
    }
};

// Define una lista de colores para los sectores para una mejor visualización
const sectorColors = {
    "Salud": "#e53e3e",
    "Educación": "#3182ce",
    "Infraestructura vial": "#d69e2e",
    "Ambiente": "#38a169",
    "Cultura y deporte": "#805ad5"
};

// Función para inicializar la aplicación
async function initializeApp() {
    document.getElementById('invoice-form').addEventListener('submit', handleFormSubmit);
    
    // Listener para el nuevo selector de usuario
    document.getElementById('user-select').addEventListener('change', async (e) => {
        const userId = e.target.value;
        if (userId) {
            await loadUserBlocksAndRenderGraph(userId);
            document.getElementById('block-id-select').disabled = false;
        } else {
            document.getElementById('block-id-select').innerHTML = '<option value="">-- Seleccione un ID de Bloque --</option>';
            document.getElementById('block-id-select').disabled = true;
            document.getElementById('no-graph-message').classList.remove('hidden');
        }
    });

    // Listener para el selector de bloques
    document.getElementById('block-id-select').addEventListener('change', async (e) => {
        const blockId = e.target.value;
        if (blockId) {
            await renderTraceabilityGraph(blockId);
        } else {
            document.getElementById('no-graph-message').classList.remove('hidden');
        }
    });

    window.addEventListener('resize', () => {
        const selectedBlockId = document.getElementById('block-id-select').value;
        if (selectedBlockId) {
            renderTraceabilityGraph(selectedBlockId);
        }
    });
    
    // Cargar los datos iniciales de los bloques y usuarios simulados
    loadBlockchainBlocks();
    loadUsers();
}

// Llama a la función de inicialización cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', initializeApp);

// Función para generar un hash SHA-256 de una cadena de texto
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Función para distribuir el valor del IVA en los diferentes sectores y sus sub-categorías
function distributeIVA(ivaValue) {
    const distribution = {};
    for (const sector in IVA_DISTRIBUTION) {
        const sectorConfig = IVA_DISTRIBUTION[sector];
        const sectorAmount = ivaValue * sectorConfig.percentage;
        
        distribution[sector] = {
            total: sectorAmount.toFixed(2),
            breakdown: {}
        };

        for (const subcategory in sectorConfig.breakdown) {
            const subcategoryPercentage = sectorConfig.breakdown[subcategory];
            const subcategoryAmount = sectorAmount * subcategoryPercentage;
            distribution[sector].breakdown[subcategory] = subcategoryAmount.toFixed(2);
        }
    }
    return distribution;
}

// Función para inicializar el estado de la distribución para la simulación
function initializeDistributionStatus(distribution) {
    const status = {};
    for (const sector in distribution) {
        status[sector] = {};
        for (const subcategory in distribution[sector].breakdown) {
            status[sector][subcategory] = "Pendiente";
        }
    }
    return status;
}

// Función para renderizar un bloque de trazabilidad
function renderBlock(blockData) {
    const ledger = document.getElementById('blockchain-ledger');
    const block = document.createElement('div');
    block.className = 'bg-[#1e232b] p-5 rounded-lg border border-[#30363d] shadow-md transition-transform duration-300 transform hover:scale-[1.02]';
    block.dataset.blockId = blockData.id; // Añade un atributo para identificar el bloque

    const invoiceData = blockData.invoiceData;
    const distribution = blockData.distribution; 
    // Obtiene los últimos estados de cada subcategoría a partir de los eventos de trazabilidad
    const latestStatus = {};
    if (blockData.traceabilityEvents) {
        blockData.traceabilityEvents.forEach(event => {
            if (!latestStatus[event.sector]) {
                latestStatus[event.sector] = {};
            }
            latestStatus[event.sector][event.subcategory] = event.status;
        });
    }

    const createdAt = new Date(blockData.createdAt).toLocaleString();

    let distributionHtml = '';
    for (const sector in distribution) {
        const sectorTotal = distribution[sector].total;
        const sectorColor = sectorColors[sector] || '#f7fafc';
        let breakdownHtml = '';

        for (const subcategory in distribution[sector].breakdown) {
            const subcategoryAmount = distribution[sector].breakdown[subcategory];
            // Usa el estado más reciente del objeto latestStatus, si existe
            const currentStatus = (latestStatus[sector] && latestStatus[sector][subcategory]) ? latestStatus[sector][subcategory] : 'Pendiente';
            
            let statusColor;
            let statusText;
            switch(currentStatus) {
                case 'En Proceso':
                    statusColor = 'bg-[#d69e2e]';
                    statusText = 'En Proceso';
                    break;
                case 'Completado':
                    statusColor = 'bg-[#38a169]';
                    statusText = 'Completado';
                    break;
                case 'Pendiente':
                default:
                    statusColor = 'bg-[#4b5563]';
                    statusText = 'Pendiente';
            }
            
            breakdownHtml += `
                <li class="flex justify-between items-center text-xs text-gray-400 pl-4 py-1">
                    <div class="flex items-center space-x-2">
                        <span class="w-2 h-2 rounded-full ${statusColor}"></span>
                        <span>${subcategory}</span>
                    </div>
                    <span class="font-medium text-gray-300">$${subcategoryAmount}</span>
                </li>
            `;
        }

        distributionHtml += `
            <details class="mb-2">
                <summary class="details-summary flex justify-between items-center text-sm font-medium sector-item p-2 rounded-lg">
                    <span class="flex items-center">
                        <span class="w-2 h-2 rounded-full mr-2" style="background-color: ${sectorColor}"></span>
                        <span>${sector} (${(IVA_DISTRIBUTION[sector].percentage*100).toFixed(0)}%)</span>
                    </span>
                    <span class="text-white font-semibold">$${sectorTotal}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </summary>
                <ul class="space-y-1 mt-1 pl-4">
                    ${breakdownHtml}
                </ul>
            </details>
        `;
    }

    block.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-[#48bb78]">Bloque Registrado</span>
            <span class="text-xs text-gray-500">${createdAt}</span>
        </div>
        <div class="text-gray-300 mb-4">
            <p class="text-sm"><span class="font-semibold">ID de Bloque:</span> <span class="text-gray-400">${blockData.id}</span></p>
            <p class="truncate"><span class="font-semibold">Hash de la Factura:</span> ${blockData.invoiceHash}</p>
            <p class="text-sm"><span class="font-semibold">ID de Usuario:</span> ${blockData.userId}</p>
            <p class="text-sm"><span class="font-semibold">NIT:</span> ${invoiceData.nit}</p>
            <p class="text-sm"><span class="font-semibold">Número de Factura:</span> ${invoiceData.invoiceNumber}</p>
            <p class="text-sm"><span class="font-semibold">Valor Total IVA:</span> $${invoiceData.ivaValue}</p>
        </div>
        <div class="border-t border-[#30363d] pt-4">
            <h3 class="text-md font-semibold text-gray-200 mb-2">Distribución del IVA</h3>
            <ul class="space-y-1">
                ${distributionHtml}
            </ul>
        </div>
    `;
    
    const summaries = block.querySelectorAll('summary');
    summaries.forEach(summary => {
        summary.addEventListener('click', () => {
            const icon = summary.querySelector('svg');
            const details = summary.parentElement;
            if (details.open) {
                icon.style.transform = 'rotate(0deg)';
            } else {
                icon.style.transform = 'rotate(90deg)';
            }
        });
    });
    
    ledger.prepend(block);
}

// Función para poblar el select de IDs de bloque
function populateBlockSelect(blocks) {
    const select = document.getElementById('block-id-select');
    select.innerHTML = '<option value="">-- Seleccione un ID de Bloque --</option>';
    blocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block.id;
        option.textContent = block.id;
        select.appendChild(option);
    });
}

// Función para cargar los usuarios simulados y poblar el selector
function loadUsers() {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = '<option value="">-- Seleccione un Usuario --</option>';
    allUsersData.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userSelect.appendChild(option);
    });
}

// Función para cargar los bloques simulados y renderizarlos
function loadBlockchainBlocks() {
    const ledger = document.getElementById('blockchain-ledger');
    ledger.innerHTML = ''; // Limpiar el ledger antes de renderizar
    
    allBlocksData.forEach(block => renderBlock(block));
}

// Nueva función para cargar bloques de un usuario específico
async function loadUserBlocksAndRenderGraph(userId) {
    // Filtra los bloques para mostrar solo los del usuario seleccionado
    const userBlocks = allBlocksData.filter(block => block.userId === userId);
    
    const blockSelect = document.getElementById('block-id-select');
    blockSelect.innerHTML = '<option value="">-- Seleccione un ID de Bloque --</option>';

    if (userBlocks.length > 0) {
        userBlocks.forEach(block => {
            const option = document.createElement('option');
            option.value = block.id;
            option.textContent = block.id;
            blockSelect.appendChild(option);
        });
        document.getElementById('no-graph-message').classList.add('hidden');
    } else {
        document.getElementById('no-graph-message').classList.remove('hidden');
    }

    const canvas = document.getElementById('traceability-graph');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Evento que se dispara al enviar el formulario de registro
async function handleFormSubmit(e) {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const nit = document.getElementById('nit').value;
    const invoiceNumber = document.getElementById('invoice-number').value;
    const ivaValue = parseFloat(document.getElementById('iva-value').value);

    // Validación simple para asegurar que el ID de usuario existe en la lista simulada
    if (!allUsersData.some(user => user.id === userId)) {
        alert("ID de usuario no válido. Por favor use un ID de usuario existente (ej. 1, 2, 3).");
        return;
    }

    const distribution = distributeIVA(ivaValue);

    const newBlockData = {
        id: "block-" + (allBlocksData.length + 1), // Genera un ID simple para la simulación
        userId: userId,
        invoiceData: {
            nit: nit,
            invoiceNumber: invoiceNumber,
            ivaValue: ivaValue
        },
        distribution: distribution,
        traceabilityEvents: [], // Los nuevos bloques inician sin eventos de trazabilidad
        createdAt: new Date().toISOString()
    };
    
    // Agregar el nuevo bloque a la base de datos simulada
    allBlocksData.push(newBlockData);
    
    // Vuelve a cargar y renderizar los bloques para reflejar el cambio
    loadBlockchainBlocks();
    
    // Limpiar el formulario
    document.getElementById('invoice-form').reset();
}

// =========================================================
// FUNCIÓN PARA RENDERIZAR EL GRÁFICO DE TRAZABILIDAD
// =========================================================
async function renderTraceabilityGraph(blockId) {
    const canvas = document.getElementById('traceability-graph');
    const ctx = canvas.getContext('2d');
    const selectedBlock = allBlocksData.find(block => block.id === blockId);
    
    // Si no hay un bloque seleccionado, mostrar un mensaje y salir
    if (!selectedBlock) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('no-graph-message').classList.remove('hidden');
        return;
    }
    
    document.getElementById('no-graph-message').classList.add('hidden');
    
    // Asegura que el canvas tenga el tamaño correcto para el contenedor
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const sectors = Object.keys(selectedBlock.distribution);
    const nodes = [];
    const nodeRadius = 15;
    const horizontalMargin = 80;
    const verticalMargin = 50;
    const nodePadding = 15;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibuja el nodo inicial "Hacienda"
    const startNode = {
        id: 'Hacienda',
        x: horizontalMargin,
        y: canvas.height / 2,
        label: 'Hacienda',
        color: '#ffffff'
    };
    nodes.push(startNode);
    drawNode(ctx, startNode.x, startNode.y, nodeRadius, startNode.color, startNode.label);
    
    // Dibuja los nodos de los sectores
    const sectorNodeYPositions = {};
    const totalSectors = sectors.length;
    const sectorSpacing = (canvas.height - 2 * verticalMargin) / (totalSectors - 1);
    
    sectors.forEach((sector, index) => {
        const sectorY = verticalMargin + index * sectorSpacing;
        sectorNodeYPositions[sector] = sectorY;
        const sectorColor = sectorColors[sector] || '#f7fafc';
        const sectorNode = {
            id: sector,
            x: canvas.width / 2,
            y: sectorY,
            label: sector,
            color: sectorColor
        };
        nodes.push(sectorNode);
        
        // Dibuja la línea desde Hacienda al sector
        const endX = sectorNode.x - nodeRadius - nodePadding;
        const startY = startNode.y;
        const endY = sectorNode.y;

        // Comprueba si hay al menos una subcategoría "En Proceso" o "Completado" en este sector
        const hasProgress = Object.keys(selectedBlock.distribution[sector].breakdown).some(
            (subcategory) => {
                const latestStatus = getLatestStatus(selectedBlock.traceabilityEvents, sector, subcategory);
                return latestStatus === 'En Proceso' || latestStatus === 'Completado';
            }
        );
        const lineColor = hasProgress ? '#d69e2e' : '#4b5563'; // Amarillo si hay progreso, gris si está pendiente
        drawLine(ctx, startNode.x + nodeRadius, startNode.y, endX, endY, lineColor);
        
        drawNode(ctx, sectorNode.x, sectorY, nodeRadius, sectorColor, sector);
    });

    // Dibuja los nodos de las subcategorías y las líneas desde los sectores
    const subcategoryNodes = {};
    const totalSubcategories = Object.values(selectedBlock.distribution).reduce((sum, s) => sum + Object.keys(s.breakdown).length, 0);
    const subcategorySpacing = (canvas.height - 2 * verticalMargin) / (totalSubcategories - 1);
    let subcategoryIndex = 0;

    sectors.forEach(sector => {
        const subcategories = Object.keys(selectedBlock.distribution[sector].breakdown);
        subcategories.forEach((subcategory) => {
            const subcategoryY = verticalMargin + subcategoryIndex * subcategorySpacing;
            const latestStatus = getLatestStatus(selectedBlock.traceabilityEvents, sector, subcategory);
            let nodeColor;
            let finalLabel;
            
            switch (latestStatus) {
                case 'En Proceso':
                    nodeColor = '#d69e2e'; // Amarillo
                    finalLabel = `${subcategory} - En Proceso`;
                    break;
                case 'Completado':
                    nodeColor = '#38a169'; // Verde
                    finalLabel = `${subcategory} - Completado`;
                    break;
                case 'Pendiente':
                default:
                    nodeColor = '#4b5563'; // Gris
                    finalLabel = `${subcategory} - Pendiente`;
                    break;
            }
            
            const subcategoryNode = {
                id: subcategory,
                x: canvas.width - horizontalMargin,
                y: subcategoryY,
                label: finalLabel,
                color: nodeColor
            };
            nodes.push(subcategoryNode);

            // Dibuja la línea desde el sector a la subcategoría
            const sectorNodeX = canvas.width / 2 + nodeRadius + nodePadding;
            const sectorNodeY = sectorNodeYPositions[sector];
            const endX = subcategoryNode.x - nodeRadius;
            const endY = subcategoryNode.y;
            
            const lineColor = nodeColor;
            drawLine(ctx, sectorNodeX, sectorNodeY, endX, endY, lineColor);
            
            drawNode(ctx, subcategoryNode.x, subcategoryY, nodeRadius, nodeColor, finalLabel);

            subcategoryIndex++;
        });
    });
}

function drawNode(ctx, x, y, radius, color, label) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(label, x, y + radius + 10);
}

function drawLine(ctx, startX, startY, endX, endY, color) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dibuja una punta de flecha en el extremo
    const angle = Math.atan2(endY - startY, endX - startX);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - 8 * Math.cos(angle - Math.PI / 6), endY - 8 * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - 8 * Math.cos(angle + Math.PI / 6), endY - 8 * Math.sin(angle + Math.PI / 6));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function getLatestStatus(traceabilityEvents, sector, subcategory) {
    const latestEvent = traceabilityEvents.find(event => event.sector === sector && event.subcategory === subcategory);
    return latestEvent ? latestEvent.status : 'Pendiente';
}

