import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const port = 3001; // Puerto del servidor

// Usar cors para permitir solicitudes desde el frontend
app.use(cors());
app.use(express.json());

// Array en memoria para simular el "ledger" de la blockchain
const blockchainLedger = [];

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

// Mapa para almacenar usuarios registrados (en memoria para la simulación)
const users = new Map();

/**
 * Función para generar un hash SHA-256 de una cadena de texto.
 * @param {string} message - La cadena de texto a hashear.
 * @returns {Promise<string>} - El hash SHA-256 en formato hexadecimal.
 */
async function sha256(message) {
    const hash = crypto.createHash('sha256');
    hash.update(message);
    return hash.digest('hex');
}

/**
 * Función para distribuir el valor del IVA en los diferentes sectores y sus sub-categorías.
 * @param {number} ivaValue - El valor total del IVA a distribuir.
 * @returns {object} - Un objeto con la distribución detallada del IVA.
 */
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

// Endpoint para registrar un nuevo usuario
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Nombre de usuario y contraseña son requeridos.' });
    }
    if (users.has(username)) {
        return res.status(409).json({ success: false, message: 'El nombre de usuario ya existe.' });
    }
    const hashedPassword = await sha256(password);
    users.set(username, hashedPassword);
    console.log(`Nuevo usuario registrado: ${username}`);
    res.status(201).json({ success: true, message: 'Usuario registrado con éxito.' });
});

// Endpoint para registrar una nueva factura en la blockchain simulada
app.post('/register-invoice', async (req, res) => {
    const { nit, invoiceNumber, ivaValue } = req.body;

    if (!nit || !invoiceNumber || !ivaValue) {
        return res.status(400).json({ error: 'Faltan datos de la factura.' });
    }

    const invoiceData = { nit, invoiceNumber, ivaValue };
    const dataToHash = JSON.stringify(invoiceData);
    const invoiceHash = await sha256(dataToHash);
    const distribution = distributeIVA(ivaValue);

    const newBlock = {
        id: blockchainLedger.length + 1, // ID simple para la simulación
        invoiceData: invoiceData,
        invoiceHash: invoiceHash,
        distribution: distribution,
        createdAt: new Date().toISOString()
    };
    
    blockchainLedger.push(newBlock);

    res.status(201).json({ message: 'Factura registrada con éxito', block: newBlock });
});

// Endpoint para obtener todos los bloques del ledger
app.get('/get-ledger', (req, res) => {
    res.status(200).json(blockchainLedger);
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
