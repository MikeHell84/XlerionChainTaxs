# server_improved.py
# Backend para Xlerion BlockChain Gov

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import hashlib
import json
from datetime import datetime

# ===================================================================================
# CONFIGURACIÓN DE LA APLICACIÓN FLASK
# ===================================================================================
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) # Habilita CORS para permitir peticiones desde el frontend

# Configuración de la base de datos
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ===================================================================================
# MODELOS DE LA BASE DE DATOS (SQLAlchemy)
# ===================================================================================

# --- Modelo de Usuario ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(150), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# --- Modelo de Bloque (para persistencia) ---
class BlockDB(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    index = db.Column(db.Integer, unique=True, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    data = db.Column(db.Text, nullable=False) # Guardamos los datos de la factura como JSON
    previous_hash = db.Column(db.String(64), nullable=False)
    hash = db.Column(db.String(64), nullable=False, unique=True)
    traceability = db.Column(db.Text, nullable=False) # Guardamos la trazabilidad como JSON

# ===================================================================================
# RUTAS DE LA API (Endpoints)
# ===================================================================================

# --- Endpoint de Registro de Usuario ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password') or not data.get('email') or not data.get('fullname'):
        return jsonify({'message': 'Faltan datos'}), 400

    if User.query.filter_by(username=data['username'].lower()).first():
        return jsonify({'message': 'El nombre de usuario ya existe'}), 409
    
    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'message': 'El correo electrónico ya está registrado'}), 409

    new_user = User(
        fullname=data['fullname'],
        username=data['username'].lower(),
        email=data['email'].lower()
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'Usuario registrado con éxito'}), 201

# --- Endpoint de Inicio de Sesión ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Faltan datos'}), 400

    user = User.query.filter_by(username=data['username'].lower()).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Credenciales incorrectas'}), 401

    return jsonify({
        'message': 'Inicio de sesión exitoso',
        'user': {
            'username': user.username,
            'fullname': user.fullname
        }
    }), 200

# --- Endpoint para obtener la cadena de bloques ---
@app.route('/api/blockchain', methods=['GET'])
def get_blockchain():
    blocks_db = BlockDB.query.order_by(BlockDB.index).all()
    chain = []
    for block_db in blocks_db:
        chain.append({
            'index': block_db.index,
            'timestamp': block_db.timestamp.isoformat(),
            'data': json.loads(block_db.data),
            'previous_hash': block_db.previous_hash,
            'hash': block_db.hash,
            'traceability': json.loads(block_db.traceability)
        })
    return jsonify(chain), 200

# --- Endpoint para añadir una nueva factura (transacción) ---
@app.route('/api/invoices', methods=['POST'])
def add_invoice():
    data = request.get_json()
    required_keys = ['number', 'companyNit', 'companyName', 'subtotal', 'iva', 'createdBy']
    if not all(k in data for k in required_keys):
        return jsonify({'message': 'Datos de factura incompletos'}), 400
    
    last_block_db = BlockDB.query.order_by(BlockDB.index.desc()).first()
    if not last_block_db:
        return jsonify({'message': 'Error: No se encontró el bloque génesis en la base de datos'}), 500

    new_index = last_block_db.index + 1
    new_timestamp = datetime.utcnow()
    
    invoice_data = {key: data[key] for key in required_keys}
    
    traceability = [{
        'status': 'Recibido por el Sistema',
        'timestamp': new_timestamp.isoformat(),
        'details': f"Factura {invoice_data['number']} recibida para procesamiento."
    }]

    # Calcular el hash del nuevo bloque
    data_string_for_hash = (str(new_index) + 
                            last_block_db.hash + 
                            new_timestamp.isoformat() + 
                            json.dumps(invoice_data, sort_keys=True))
    new_hash = hashlib.sha256(data_string_for_hash.encode()).hexdigest()

    new_block_db = BlockDB(
        index=new_index,
        timestamp=new_timestamp,
        data=json.dumps(invoice_data),
        previous_hash=last_block_db.hash,
        hash=new_hash,
        traceability=json.dumps(traceability)
    )

    db.session.add(new_block_db)
    db.session.commit()

    return jsonify({
        'message': 'Factura registrada en el blockchain con éxito',
        'block': {
            'index': new_block_db.index,
            'timestamp': new_block_db.timestamp.isoformat(),
            'data': json.loads(new_block_db.data),
            'previous_hash': new_block_db.previous_hash,
            'hash': new_block_db.hash,
            'traceability': json.loads(new_block_db.traceability)
        }
    }), 201

# --- Servir la aplicación frontend ---
@app.route('/')
def serve_index():
    return send_from_directory('.', 'xlerion_chain_improved.html')

# ===================================================================================
# INICIALIZACIÓN Y ARRANQUE DEL SERVIDOR
# ===================================================================================

with app.app_context():
    db.create_all()
    if not BlockDB.query.filter_by(index=0).first():
        genesis_timestamp = datetime.utcnow()
        genesis_data_string = "0" + "0" + genesis_timestamp.isoformat() + json.dumps("Bloque Génesis")
        genesis_hash = hashlib.sha256(genesis_data_string.encode()).hexdigest()
        
        genesis_block_db = BlockDB(
            index=0,
            timestamp=genesis_timestamp,
            data=json.dumps("Bloque Génesis"),
            previous_hash="0",
            traceability=json.dumps([]),
            hash=genesis_hash
        )
        db.session.add(genesis_block_db)
        db.session.commit()

if __name__ == '__main__':
    app.run(debug=True, port=5001)
