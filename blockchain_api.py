# Archivo: blockchain_api.py
# Endpoints API para el sistema de blockchain mejorado

import hashlib
import json
from datetime import datetime
from decimal import Decimal
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from server_improved import app, db, User, Invoice, IVADistribution, InvoiceSchema, sanitize_input

# Configuración de distribución del IVA (ahora configurable)
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
# FUNCIONES DE BLOCKCHAIN
# =========================================================

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

def validate_block_integrity(invoice):
    """Valida la integridad de un bloque"""
    block_data = {
        'invoice_number': invoice.invoice_number,
        'company_name': invoice.company_name,
        'company_nit': invoice.company_nit,
        'subtotal': float(invoice.subtotal),
        'iva_amount': float(invoice.iva_amount),
        'total_amount': float(invoice.total_amount),
        'timestamp': invoice.timestamp.isoformat(),
        'previous_hash': invoice.previous_hash,
        'user_id': invoice.user_id
    }
    
    calculated_hash = calculate_hash(block_data)
    return calculated_hash == invoice.block_hash

# =========================================================
# ENDPOINTS DE BLOCKCHAIN
# =========================================================

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

@app.route('/invoices', methods=['GET'])
@jwt_required()
def get_invoices():
    """Obtiene las facturas del usuario actual con paginación"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Limitar per_page para evitar sobrecarga
        per_page = min(per_page, 100)
        
        invoices = Invoice.query.filter_by(user_id=user_id)\
                               .order_by(Invoice.timestamp.desc())\
                               .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'invoices': [invoice.to_dict() for invoice in invoices.items],
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

@app.route('/invoices/<int:invoice_id>', methods=['GET'])
@jwt_required()
def get_invoice(invoice_id):
    """Obtiene una factura específica"""
    try:
        user_id = get_jwt_identity()
        invoice = Invoice.query.filter_by(id=invoice_id, user_id=user_id).first()
        
        if not invoice:
            return jsonify({'error': 'Factura no encontrada'}), 404
        
        # Validar integridad del bloque
        is_valid = validate_block_integrity(invoice)
        
        response_data = invoice.to_dict()
        response_data['is_valid'] = is_valid
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

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
            block_data['is_valid'] = validate_block_integrity(invoice)
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

@app.route('/blockchain/validate', methods=['POST'])
@jwt_required()
def validate_blockchain():
    """Valida la integridad completa del blockchain"""
    try:
        invoices = Invoice.query.order_by(Invoice.id.asc()).all()
        
        validation_results = []
        previous_hash = "0000000000000000000000000000000000000000000000000000000000000000"
        
        for invoice in invoices:
            is_valid = validate_block_integrity(invoice)
            hash_chain_valid = invoice.previous_hash == previous_hash
            
            validation_results.append({
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'block_hash': invoice.block_hash,
                'previous_hash': invoice.previous_hash,
                'expected_previous_hash': previous_hash,
                'hash_integrity_valid': is_valid,
                'hash_chain_valid': hash_chain_valid,
                'overall_valid': is_valid and hash_chain_valid
            })
            
            previous_hash = invoice.block_hash
        
        total_blocks = len(validation_results)
        valid_blocks = sum(1 for result in validation_results if result['overall_valid'])
        
        return jsonify({
            'blockchain_valid': valid_blocks == total_blocks,
            'total_blocks': total_blocks,
            'valid_blocks': valid_blocks,
            'invalid_blocks': total_blocks - valid_blocks,
            'validation_details': validation_results
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/config/iva-distribution', methods=['GET'])
@jwt_required()
def get_iva_distribution_config():
    """Obtiene la configuración actual de distribución del IVA"""
    return jsonify({
        'distribution_config': IVA_DISTRIBUTION_CONFIG,
        'total_percentage': sum(sector['percentage'] for sector in IVA_DISTRIBUTION_CONFIG.values())
    }), 200

# =========================================================
# ENDPOINTS DE BÚSQUEDA Y FILTRADO
# =========================================================

@app.route('/invoices/search', methods=['GET'])
@jwt_required()
def search_invoices():
    """Busca facturas por diferentes criterios"""
    try:
        user_id = get_jwt_identity()
        
        # Parámetros de búsqueda
        company_name = request.args.get('company_name', '').strip()
        company_nit = request.args.get('company_nit', '').strip()
        invoice_number = request.args.get('invoice_number', '').strip()
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        min_amount = request.args.get('min_amount', type=float)
        max_amount = request.args.get('max_amount', type=float)
        
        # Paginación
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        per_page = min(per_page, 100)
        
        # Construir consulta
        query = Invoice.query.filter_by(user_id=user_id)
        
        if company_name:
            query = query.filter(Invoice.company_name.ilike(f'%{company_name}%'))
        
        if company_nit:
            query = query.filter(Invoice.company_nit.ilike(f'%{company_nit}%'))
        
        if invoice_number:
            query = query.filter(Invoice.invoice_number.ilike(f'%{invoice_number}%'))
        
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(Invoice.timestamp >= date_from_obj)
            except ValueError:
                return jsonify({'error': 'Formato de fecha inválido para date_from'}), 400
        
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(Invoice.timestamp <= date_to_obj)
            except ValueError:
                return jsonify({'error': 'Formato de fecha inválido para date_to'}), 400
        
        if min_amount is not None:
            query = query.filter(Invoice.total_amount >= min_amount)
        
        if max_amount is not None:
            query = query.filter(Invoice.total_amount <= max_amount)
        
        # Ejecutar consulta con paginación
        invoices = query.order_by(Invoice.timestamp.desc())\
                       .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'invoices': [invoice.to_dict() for invoice in invoices.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': invoices.total,
                'pages': invoices.pages,
                'has_next': invoices.has_next,
                'has_prev': invoices.has_prev
            },
            'search_criteria': {
                'company_name': company_name,
                'company_nit': company_nit,
                'invoice_number': invoice_number,
                'date_from': date_from,
                'date_to': date_to,
                'min_amount': min_amount,
                'max_amount': max_amount
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500
