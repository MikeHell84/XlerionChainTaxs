# Importa los módulos necesarios
import sqlite3
import hashlib
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS # Importa la librería CORS
from datetime import datetime
import json # Importa el módulo para trabajar con JSON en Python

# Inicializa la aplicación de Flask
app = Flask(__name__)

# Habilita CORS para todas las rutas. Esta es la forma más común y robusta.
CORS(app) 

# --- CONFIGURACIÓN DE LA BASE DE DATOS ---
# Crea una base de datos SQLite y una tabla si no existen.
# Esto se ejecutará cada vez que el servidor se inicie, garantizando
# que la tabla 'blocks' esté lista para su uso.
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS blocks (
            id TEXT PRIMARY KEY,
            nit TEXT,
            invoice_number TEXT,
            iva_value REAL,
            invoice_hash TEXT,
            distribution TEXT,
            timestamp TEXT
        )
    ''')
    conn.commit()
    conn.close()

# Función para generar un hash SHA-256
def sha256_hash(data):
    return hashlib.sha256(data.encode('utf-8')).hexdigest()

# --- ENDPOINTS DE LA API ---

# Este endpoint obtiene todos los bloques de la base de datos.
@app.route('/api/blocks', methods=['GET'])
def get_blocks():
    conn = sqlite3.connect('database.db')
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM blocks ORDER BY timestamp DESC')
        blocks = cursor.fetchall()
    finally:
        conn.close()
    
    blocks_list = []
    for block in blocks:
        # Intenta parsear la cadena de distribución del JSON del servidor.
        # Si falla, usa un objeto vacío para evitar errores en el frontend.
        distribution_data = block[5]
        try:
            json_distribution = json.loads(distribution_data)
        except json.JSONDecodeError:
            json_distribution = {}

        blocks_list.append({
            'id': block[0],
            'invoiceData': {
                'nit': block[1],
                'invoiceNumber': block[2],
                'ivaValue': block[3],
            },
            'invoiceHash': block[4],
            'distribution': json_distribution,
            'createdAt': block[6]
        })
    return jsonify(blocks_list)

# Este endpoint añade un nuevo bloque a la base de datos.
@app.route('/api/blocks', methods=['POST'])
def add_block():
    data = request.json
    
    # Valida que todos los campos requeridos estén presentes en la solicitud.
    if not all(k in data for k in ['id', 'nit', 'invoiceNumber', 'ivaValue', 'distribution', 'createdAt']):
        return jsonify({'error': 'Faltan datos de la factura'}), 400

    # Crea un hash único para la factura usando su contenido.
    invoice_data_to_hash = {
        'nit': str(data['nit']),
        'invoiceNumber': str(data['invoiceNumber']),
        'ivaValue': float(data['ivaValue'])
    }
    invoice_hash = sha256_hash(str(invoice_data_to_hash))

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    try:
        # Prepara los datos para la inserción, asegurando que los tipos sean correctos
        insert_data = (
            str(data['id']),
            str(data['nit']),
            str(data['invoiceNumber']),
            float(data['ivaValue']),
            invoice_hash,
            str(data['distribution']), 
            str(data['createdAt'])
        )
        
        cursor.execute(
            'INSERT INTO blocks (id, nit, invoice_number, iva_value, invoice_hash, distribution, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            insert_data
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Error during database insertion: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        conn.close()
    
    return jsonify({'message': 'Bloque agregado con éxito'}), 201

if __name__ == '__main__':
    init_db()
    # Ejecuta el servidor Flask en el puerto 5000.
    app.run(debug=True, port=5000)
