# Archivo: app.py
# Servidor unificado para Xlerion BlockChain Gov v2.0

import os
import re
import hashlib
import json
from datetime import datetime, timedelta
from decimal import Decimal
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from marshmallow import Schema, fields, validate, ValidationError
from email_validator import validate_email, EmailNotValidError
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Inicializar la aplicación Flask
app = Flask(__name__)

# Configuración de la aplicación
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///xlerion_blockchain.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar extensiones
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'])

# =========================================================
# MODELOS DE BASE DE DATOS
# =========================================================

class User(db.Model):
    """Modelo de usuario con campos mejorados y validación"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), default='user', nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime)
    
    # Relación con facturas
    invoices = db.relationship('Invoice', backref='user', lazy=True)
    
    def set_password(self, password):
        """Genera hash seguro de la contraseña"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verifica la contraseña contra el hash"""
        return check_password_hash(self.password_hash, password)
    
    def is_locked(self):
        """Verifica si la cuenta está bloqueada"""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False
    
    def increment_failed_attempts(self):
        """Incrementa intentos fallidos y bloquea si es necesario"""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.locked_until = datetime.utcnow() + timedelta(minutes=30)
        db.session.commit()
    
    def reset_failed_attempts(self):
        """Resetea intentos fallidos después de login exitoso"""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        """Convierte el usuario a diccionario (sin contraseña)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class Invoice(db.Model):
    """Modelo de factura para el blockchain"""
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    company_name = db.Column(db.String(200), nullable=False)
    company_nit = db.Column(db.String(50), nullable=False)
    subtotal = db.Column(db.Numeric(15, 2), nullable=False)
    iva_amount = db.Column(db.Numeric(15, 2), nullable=False)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    block_hash = db.Column(db.String(64), unique=True, nullable=False)
    previous_hash = db.Column(db.String(64))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Distribución del IVA
    distribution_data = db.relationship('IVADistribution', backref='invoice', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convierte la factura a diccionario"""
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'company_name': self.company_name,
            'company_nit': self.company_nit,
            'subtotal': float(self.subtotal),
            'iva_amount': float(self.iva_amount),
            'total_amount': float(self.total_amount),
            'block_hash': self.block_hash,
            'previous_hash': self.previous_hash,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'distribution': [dist.to_dict() for dist in self.distribution_data]
        }

class IVADistribution(db.Model):
    """Modelo para la distribución del IVA por sectores"""
    __tablename__ = 'iva_distributions'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    sector = db.Column(db.String(100), nullable=False)
    percentage = db.Column(db.Numeric(5, 4), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    subsector = db.Column(db.String(200))
    subsector_percentage = db.Column(db.Numeric(5, 4))
    subsector_amount = db.Column(db.Numeric(15, 2))
    
    def to_dict(self):
        """Convierte la distribución a diccionario"""
        return {
            'sector': self.sector,
            'percentage': float(self.percentage),
            'amount': float(self.amount),
            'subsector': self.subsector,
            'subsector_percentage': float(self.subsector_percentage) if self.subsector_percentage else None,
            'subsector_amount': float(self.subsector_amount) if self.subsector_amount else None
        }

# =========================================================
# CONFIGURACIÓN DE DISTRIBUCIÓN DEL IVA
# =========================================================

IVA_DISTRIBUTION_CONFIG = {
    "Salud": {
        "percentage": 0.08,
        "breakdown": {
            "Nómina de personal": 0.50,
            "Insumos médicos": 0.30,
            "Mantenimiento de hospitales": 0.20
        }
    },
    "Educación": {
        "percentage": 0.07,
        "breakdown": {
            "Salarios docentes": 0.60,
            "Materiales escolares": 0.25,
            "Construcción y mantenimiento de escuelas": 0.15
        }
    },
    "Infraestructura vial": {
        "percentage": 0.10,
        "breakdown": {
            "Construcción de vías": 0.50,
            "Mantenimiento de puentes": 0.30,
            "Señalización y seguridad": 0.20
        }
    },
    "Ambiente": {
        "percentage": 0.05,
        "breakdown": {
            "Proyectos de reforestación": 0.40,
            "Gestión de residuos": 0.30,
            "Educación ambiental": 0.30
        }
    },
    "Cultura y deporte": {
        "percentage": 0.03,
        "breakdown": {
            "Programas culturales": 0.60,
            "Instalaciones deportivas": 0.40
        }
    },
    "Seguridad": {
        "percentage": 0.12,
        "breakdown": {
            "Equipamiento policial": 0.40,
            "Tecnología de seguridad": 0.35,
            "Capacitación": 0.25
        }
    },
    "Administración": {
        "percentage": 0.05,
        "breakdown": {
            "Sistemas tecnológicos": 0.50,
            "Capacitación funcionarios": 0.30,
            "Infraestructura administrativa": 0.20
        }
    }
}

# =========================================================
# ESQUEMAS DE VALIDACIÓN
# =========================================================

class UserRegistrationSchema(Schema):
    """Esquema de validación para registro de usuario"""
    username = fields.Str(required=True, validate=[
        validate.Length(min=3, max=80),
        validate.Regexp(r'^[a-zA-Z0-9_]+$', error='Solo letras, números y guiones bajos permitidos')
    ])
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    full_name = fields.Str(required=True, validate=validate.Length(min=2, max=200))

class UserLoginSchema(Schema):
    """Esquema de validación para login de usuario"""
    username = fields.Str(required=True)
    password = fields.Str(required=True)

class InvoiceSchema(Schema):
    """Esquema de validación para facturas"""
    invoice_number = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    company_name = fields.Str(required=True, validate=validate.Length(min=2, max=200))
    company_nit = fields.Str(required=True, validate=validate.Length(min=5, max=50))
    subtotal = fields.Decimal(required=True, validate=validate.Range(min=0))

# =========================================================
# FUNCIONES DE UTILIDAD
# =========================================================

def validate_password_strength(password):
    """Valida que la contraseña sea fuerte"""
    if len(password) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres"
    
    if not re.search(r'[A-Z]', password):
        return False, "La contraseña debe tener al menos una mayúscula"
    
    if not re.search(r'[a-z]', password):
        return False, "La contraseña debe tener al menos una minúscula"
    
    if not re.search(r'\d', password):
        return False, "La contraseña debe tener al menos un número"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "La contraseña debe tener al menos un carácter especial"
    
    return True, "Contraseña válida"

def sanitize_input(text):
    """Sanitiza entrada de texto para prevenir XSS"""
    if not isinstance(text, str):
        return text
    
    # Remover caracteres peligrosos
    dangerous_chars = ['<', '>', '"', "'", '&', 'javascript:', 'script', 'onload', 'onerror']
    for char in dangerous_chars:
        text = text.replace(char, '')
    
    return text.strip()

def calculate_hash(data):
    """Calcula el hash SHA-256 de los datos"""
    json_string = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(json_string.encode()).hexdigest()

def get_previous_hash():
    """Obtiene el hash del último bloque"""
    last_invoice = Invoice.query.order_by(Invoice.id.desc()).first()
    return last_invoice.block_hash if last_invoice else "0000000000000000000000000000000000000000000000000000000000000000"

def distribute_iva(iva_amount):
    """Distribuye el IVA según la configuración establecida"""
    distributions = []
    remaining_percentage = 1.0
    
    for sector, config in IVA_DISTRIBUTION_CONFIG.items():
        sector_percentage = config["percentage"]
        sector_amount = iva_amount * Decimal(str(sector_percentage))
        
        # Distribución principal del sector
        distributions.append({
            'sector': sector,
            'percentage': sector_percentage,
            'amount': sector_amount,
            'subsector': None,
            'subsector_percentage': None,
            'subsector_amount': None
        })
        
        # Distribución por subsectores
        for subsector, sub_percentage in config["breakdown"].items():
            subsector_amount = sector_amount * Decimal(str(sub_percentage))
            distributions.append({
                'sector': sector,
                'percentage': sector_percentage,
                'amount': sector_amount,
                'subsector': subsector,
                'subsector_percentage': sub_percentage,
                'subsector_amount': subsector_amount
            })
        
        remaining_percentage -= sector_percentage
    
    # Distribución del porcentaje restante a "Otros"
    if remaining_percentage > 0:
        other_amount = iva_amount * Decimal(str(remaining_percentage))
        distributions.append({
            'sector': 'Otros',
            'percentage': remaining_percentage,
            'amount': other_amount,
            'subsector': None,
            'subsector_percentage': None,
            'subsector_amount': None
        })
    
    return distributions

# =========================================================
# ENDPOINTS DE LA API
# =========================================================

@app.route('/')
def home():
    """Endpoint principal que devuelve información del servidor"""
    return jsonify({
        'message': 'Xlerion BlockChain Gov API v2.0',
        'status': 'running',
        'timestamp': datetime.utcnow().isoformat(),
        'endpoints': {
            'auth': ['/register', '/login', '/profile'],
            'blockchain': ['/invoices', '/blockchain/ledger', '/blockchain/stats']
        }
    })

@app.route('/register', methods=['POST'])
def register_user():
    """Registra un nuevo usuario con validación robusta"""
    try:
        # Validar esquema de entrada
        schema = UserRegistrationSchema()
        data = schema.load(request.json)
        
        # Sanitizar entradas
        username = sanitize_input(data['username'])
        email = sanitize_input(data['email'])
        full_name = sanitize_input(data['full_name'])
        password = data['password']
        
        # Validar fortaleza de contraseña
        is_valid, message = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        # Validar email
        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({'error': 'Email inválido'}), 400
        
        # Verificar si el usuario ya existe
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'El nombre de usuario ya existe'}), 409
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'El email ya está registrado'}), 409
        
        # Crear nuevo usuario
        user = User(
            username=username,
            email=email,
            full_name=full_name
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Crear token de acceso
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Usuario registrado exitosamente',
            'user': user.to_dict(),
            'access_token': access_token
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': 'Datos inválidos', 'details': e.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/login', methods=['POST'])
def login_user():
    """Inicia sesión de usuario con protección contra ataques"""
    try:
        # Validar esquema de entrada
        schema = UserLoginSchema()
        data = schema.load(request.json)
        
        username = sanitize_input(data['username'])
        password = data['password']
        
        # Buscar usuario
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # Verificar si la cuenta está bloqueada
        if user.is_locked():
            return jsonify({
                'error': 'Cuenta bloqueada por múltiples intentos fallidos. Intente más tarde.'
            }), 423
        
        # Verificar contraseña
        if not user.check_password(password):
            user.increment_failed_attempts()
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # Verificar si la cuenta está activa
        if not user.is_active:
            return jsonify({'error': 'Cuenta desactivada'}), 403
        
        # Login exitoso
        user.reset_failed_attempts()
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Login exitoso',
            'user': user.to_dict(),
            'access_token': access_token
        }), 200
        
    except ValidationError as e:
        return jsonify({'error': 'Datos inválidos', 'details': e.messages}), 400
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Obtiene el perfil del usuario autenticado"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'user': user.to_dict(),
            'invoice_count': len(user.invoices)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/invoices', methods=['POST'])
@jwt_required()
def create_invoice():
    """Crea una nueva factura y la registra en el blockchain"""
    try:
        # Validar esquema de entrada
        schema = InvoiceSchema()
        data = schema.load(request.json)
        
        # Obtener usuario actual
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Sanitizar entradas
        invoice_number = sanitize_input(data['invoice_number'])
        company_name = sanitize_input(data['company_name'])
        company_nit = sanitize_input(data['company_nit'])
        subtotal = Decimal(str(data['subtotal']))
        
        # Verificar que el número de factura no exista
        existing_invoice = Invoice.query.filter_by(invoice_number=invoice_number).first()
        if existing_invoice:
            return jsonify({'error': 'El número de factura ya existe'}), 409
        
        # Calcular IVA (19%)
        iva_amount = subtotal * Decimal('0.19')
        total_amount = subtotal + iva_amount
        
        # Obtener hash del bloque anterior
        previous_hash = get_previous_hash()
        
        # Crear datos del bloque
        block_data = {
            'invoice_number': invoice_number,
            'company_name': company_name,
            'company_nit': company_nit,
            'subtotal': float(subtotal),
            'iva_amount': float(iva_amount),
            'total_amount': float(total_amount),
            'timestamp': datetime.utcnow().isoformat(),
            'previous_hash': previous_hash,
            'user_id': user_id
        }
        
        # Calcular hash del bloque
        block_hash = calculate_hash(block_data)
        
        # Crear factura
        invoice = Invoice(
            invoice_number=invoice_number,
            company_name=company_name,
            company_nit=company_nit,
            subtotal=subtotal,
            iva_amount=iva_amount,
            total_amount=total_amount,
            block_hash=block_hash,
            previous_hash=previous_hash,
            user_id=user_id
        )
        
        db.session.add(invoice)
        db.session.flush()  # Para obtener el ID de la factura
        
        # Calcular y guardar distribución del IVA
        distributions = distribute_iva(iva_amount)
        
        for dist in distributions:
            iva_dist = IVADistribution(
                invoice_id=invoice.id,
                sector=dist['sector'],
                percentage=Decimal(str(dist['percentage'])),
                amount=dist['amount'],
                subsector=dist['subsector'],
                subsector_percentage=Decimal(str(dist['subsector_percentage'])) if dist['subsector_percentage'] else None,
                subsector_amount=dist['subsector_amount']
            )
            db.session.add(iva_dist)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Factura registrada exitosamente en el blockchain',
            'invoice': invoice.to_dict(),
            'block_hash': block_hash,
            'distributions': distributions
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': 'Datos inválidos', 'details': e.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor', 'details': str(e)}), 500

@app.route('/blockchain/ledger', methods=['GET'])
@jwt_required()
def get_blockchain_ledger():
    """Obtiene el ledger completo del blockchain con paginación"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Limitar per_page
        per_page = min(per_page, 100)
        
        invoices = Invoice.query.order_by(Invoice.timestamp.desc())\
                               .paginate(page=page, per_page=per_page, error_out=False)
        
        ledger_blocks = []
        for invoice in invoices.items:
            block_data = invoice.to_dict()
            block_data['is_valid'] = True  # Simplificado para esta demo
            ledger_blocks.append(block_data)
        
        return jsonify({
            'ledger': ledger_blocks,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': invoices.total,
                'pages': invoices.pages,
                'has_next': invoices.has_next,
                'has_prev': invoices.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/blockchain/stats', methods=['GET'])
@jwt_required()
def get_blockchain_stats():
    """Obtiene estadísticas del blockchain"""
    try:
        # Estadísticas generales
        total_invoices = Invoice.query.count()
        total_iva = db.session.query(db.func.sum(Invoice.iva_amount)).scalar() or 0
        total_amount = db.session.query(db.func.sum(Invoice.total_amount)).scalar() or 0
        
        # Estadísticas por sector
        sector_stats = db.session.query(
            IVADistribution.sector,
            db.func.sum(IVADistribution.amount).label('total_amount'),
            db.func.count(IVADistribution.id).label('count')
        ).filter(IVADistribution.subsector.is_(None))\
         .group_by(IVADistribution.sector)\
         .all()
        
        # Últimas transacciones
        recent_invoices = Invoice.query.order_by(Invoice.timestamp.desc())\
                                      .limit(5)\
                                      .all()
        
        return jsonify({
            'general_stats': {
                'total_invoices': total_invoices,
                'total_iva_collected': float(total_iva),
                'total_amount_processed': float(total_amount),
                'average_invoice_amount': float(total_amount / total_invoices) if total_invoices > 0 else 0
            },
            'sector_distribution': [
                {
                    'sector': stat.sector,
                    'total_amount': float(stat.total_amount),
                    'transaction_count': stat.count,
                    'percentage': float(stat.total_amount / total_iva * 100) if total_iva > 0 else 0
                }
                for stat in sector_stats
            ],
            'recent_transactions': [invoice.to_dict() for invoice in recent_invoices],
            'distribution_config': IVA_DISTRIBUTION_CONFIG
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

# =========================================================
# MANEJO DE ERRORES
# =========================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint no encontrado'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Error interno del servidor'}), 500

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token expirado'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Token inválido'}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({'error': 'Token de autorización requerido'}), 401

# =========================================================
# INICIALIZACIÓN
# =========================================================

def init_database():
    """Inicializa la base de datos y crea usuario admin"""
    db.create_all()
    
    # Crear usuario admin por defecto
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            email='admin@xlerion.gov.co',
            full_name='Administrador del Sistema',
            role='admin'
        )
        admin.set_password('Admin123!')
        db.session.add(admin)
        db.session.commit()
        print("✅ Usuario administrador creado: admin / Admin123!")

# =========================================================
# EJECUCIÓN DEL SERVIDOR
# =========================================================

if __name__ == '__main__':
    with app.app_context():
        init_database()
    
    print("🚀 Iniciando Xlerion BlockChain Gov v2.0...")
    print("📊 Dashboard disponible en: http://localhost:5000")
    print("🔗 API endpoints disponibles en: http://localhost:5000")
    
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    )
