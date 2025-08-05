import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql.cursors
from dotenv import load_dotenv
import hashlib
import json

# Cargar variables de entorno desde .env
load_dotenv()

app = Flask(__name__)
CORS(app) # Habilitar CORS para permitir solicitudes desde tu frontend

# --- Configuración de la Base de Datos ---
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'db': os.getenv('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor # Para obtener resultados como diccionarios
}

# --- Funciones de Utilidad ---

def get_db_connection():
    """Establece y devuelve una conexión a la base de datos."""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"Error al conectar a la base de datos: {e}")
        return None

def hash_password(password):
    """Hashea una contraseña usando SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

# --- Rutas de la API ---

@app.route('/')
def home():
    """Ruta de prueba para verificar que el servidor está funcionando."""
    return "Servidor XlerionChainTaxs Backend funcionando!"

@app.route('/api/register', methods=['POST'])
def register_user():
    """Registra un nuevo usuario en la base de datos."""
    data = request.json
    fullname = data.get('fullname')
    username = data.get('username').lower()
    email = data.get('email')
    password = data.get('password')

    if not all([fullname, username, email, password]):
        return jsonify({"message": "Todos los campos son obligatorios."}), 400
    if len(password) < 8:
        return jsonify({"message": "La contraseña debe tener al menos 8 caracteres."}), 400

    hashed_password = hash_password(password)

    connection = get_db_connection()
    if connection is None:
        return jsonify({"message": "Error interno del servidor."}), 500

    try:
        with connection.cursor() as cursor:
            # Verificar si el usuario ya existe
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return jsonify({"message": "El nombre de usuario ya existe."}), 409

            # Insertar nuevo usuario
            sql = "INSERT INTO users (fullname, username, email, password_hash) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (fullname, username, email, hashed_password))
        connection.commit()
        return jsonify({"message": "Usuario registrado exitosamente."}), 201
    except Exception as e:
        connection.rollback()
        print(f"Error al registrar usuario: {e}")
        return jsonify({"message": "Error interno del servidor al registrar usuario."}), 500
    finally:
        connection.close()

@app.route('/api/login', methods=['POST'])
def login_user():
    """Autentica un usuario y devuelve sus datos."""
    data = request.json
    username = data.get('username').lower()
    password = data.get('password')

    if not all([username, password]):
        return jsonify({"message": "Usuario y contraseña son obligatorios."}), 400

    connection = get_db_connection()
    if connection is None:
        return jsonify({"message": "Error interno del servidor."}), 500

    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, fullname, username, password_hash FROM users WHERE username = %s"
            cursor.execute(sql, (username,))
            user = cursor.fetchone()

            if user and user['password_hash'] == hash_password(password):
                # No devolver el hash de la contraseña al frontend
                return jsonify({
                    "message": "Inicio de sesión exitoso.",
                    "user": {"username": user['username'], "fullname": user['fullname']}
                }), 200
            else:
                return jsonify({"message": "Usuario o contraseña incorrectos."}), 401
    except Exception as e:
        print(f"Error al iniciar sesión: {e}")
        return jsonify({"message": "Error interno del servidor al iniciar sesión."}), 500
    finally:
        connection.close()

@app.route('/api/blocks', methods=['POST'])
def add_block():
    """Añade un nuevo bloque a la cadena en la base de datos."""
    data = request.json
    block_data = data.get('data')
    traceability = data.get('traceability')
    previous_hash = data.get('previousHash')
    block_index = data.get('index')
    block_hash = data.get('hash')
    timestamp_iso = data.get('timestamp')
    created_by = data.get('createdBy') # Asegúrate de enviar esto desde el frontend

    if not all([block_data, traceability, previous_hash, block_index is not None, block_hash, timestamp_iso, created_by]):
        return jsonify({"message": "Datos de bloque incompletos."}), 400

    connection = get_db_connection()
    if connection is None:
        return jsonify({"message": "Error interno del servidor."}), 500

    try:
        with connection.cursor() as cursor:
            sql = """
            INSERT INTO blocks (block_index, timestamp_iso, data, previous_hash, hash, traceability, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                block_index,
                timestamp_iso,
                json.dumps(block_data), # Convertir dict a JSON string
                previous_hash,
                block_hash,
                json.dumps(traceability), # Convertir list a JSON string
                created_by
            ))
        connection.commit()
        return jsonify({"message": "Bloque añadido exitosamente.", "block_hash": block_hash}), 201
    except pymysql.err.IntegrityError as e:
        connection.rollback()
        if "Duplicate entry" in str(e) and "for key 'hash'" in str(e):
            return jsonify({"message": "Error: El hash del bloque ya existe."}), 409
        print(f"Error de integridad al añadir bloque: {e}")
        return jsonify({"message": "Error interno del servidor al añadir bloque (integridad).", "error": str(e)}), 500
    except Exception as e:
        connection.rollback()
        print(f"Error al añadir bloque: {e}")
        return jsonify({"message": "Error interno del servidor al añadir bloque."}), 500
    finally:
        connection.close()

@app.route('/api/blocks', methods=['GET'])
def get_blocks():
    """Recupera todos los bloques de la base de datos."""
    connection = get_db_connection()
    if connection is None:
        return jsonify({"message": "Error interno del servidor."}), 500

    try:
        with connection.cursor() as cursor:
            sql = "SELECT block_index as `index`, timestamp_iso as timestamp, data, previous_hash as previousHash, hash, traceability, created_by as createdBy FROM blocks ORDER BY block_index ASC"
            cursor.execute(sql)
            blocks = cursor.fetchall()
            
            # Convertir campos JSON de vuelta a objetos Python
            for block in blocks:
                block['data'] = json.loads(block['data'])
                block['traceability'] = json.loads(block['traceability'])
            
            return jsonify(blocks), 200
    except Exception as e:
        print(f"Error al obtener bloques: {e}")
        return jsonify({"message": "Error interno del servidor al obtener bloques."}), 500
    finally:
        connection.close()

@app.route('/api/blocks/search', methods=['GET'])
def search_blocks():
    """Busca bloques en la base de datos según los parámetros de consulta."""
    company_name = request.args.get('companyName', '').lower()
    nit = request.args.get('nit', '')
    invoice_number = request.args.get('invoiceNumber', '')
    start_date = request.args.get('startDate', '')
    end_date = request.args.get('endDate', '')

    connection = get_db_connection()
    if connection is None:
        return jsonify({"message": "Error interno del servidor."}), 500

    try:
        with connection.cursor() as cursor:
            # La búsqueda en campos JSON es un poco más compleja en SQL puro.
            # Podrías necesitar usar funciones JSON_EXTRACT o LIKE en el JSON string.
            # Para simplificar, aquí se muestra una aproximación.
            # Para búsquedas eficientes en JSON, MySQL 5.7+ tiene JSON_CONTAINS, JSON_EXTRACT.
            # Para MariaDB, JSON_VALUE o JSON_EXTRACT.

            conditions = []
            params = []

            if company_name:
                conditions.append("JSON_EXTRACT(data, '$.companyName') LIKE %s")
                params.append(f"%{company_name}%")
            if nit:
                conditions.append("JSON_EXTRACT(data, '$.companyNit') LIKE %s")
                params.append(f"%{nit}%")
            if invoice_number:
                conditions.append("JSON_EXTRACT(data, '$.number') LIKE %s")
                params.append(f"%{invoice_number}%")
            if start_date:
                conditions.append("timestamp_iso >= %s")
                params.append(start_date)
            if end_date:
                conditions.append("timestamp_iso <= %s")
                params.append(end_date)

            sql = "SELECT block_index as `index`, timestamp_iso as timestamp, data, previous_hash as previousHash, hash, traceability, created_by as createdBy FROM blocks"
            if conditions:
                sql += " WHERE " + " AND ".join(conditions)
            
            sql += " ORDER BY block_index DESC" # Ordenar por índice descendente para los más recientes

            cursor.execute(sql, params)
            results = cursor.fetchall()

            # Convertir campos JSON de vuelta a objetos Python
            for block in results:
                block['data'] = json.loads(block['data'])
                block['traceability'] = json.loads(block['traceability'])
            
            return jsonify(results), 200
    except Exception as e:
        print(f"Error al buscar bloques: {e}")
        return jsonify({"message": "Error interno del servidor al buscar bloques."}), 500
    finally:
        connection.close()

# Para ejecutar la aplicación Flask
if __name__ == '__main__':
    # Usar puerto 5000 por defecto para desarrollo
    # En producción, usar un servidor WSGI como Gunicorn o mod_wsgi
    app.run(debug=True, host='0.0.0.0', port=5000)
