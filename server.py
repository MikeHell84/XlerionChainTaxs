# Importar Flask y CORS
from flask import Flask, request, jsonify
from flask_cors import CORS

# Inicializar la aplicación Flask
app = Flask(__name__)

# Habilitar CORS para todas las rutas y orígenes
CORS(app)

# ... Aquí va el resto de tu código del servidor Flask, como los endpoints
# @app.route('/register', methods=['POST'])
# def register_user():
#     # ...
#
# @app.route('/login', methods=['POST'])
# def login_user():
#     # ...

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)