# refresh_leaderboard.py

# from flask import Flask
# from flask_cors import CORS
# import subprocess
#
# app = Flask(__name__)
# CORS(app)  # Enable CORS for all routes
#
#
# @app.route('/refresh_leaderboard')
# def refresh_leaderboard():
#     # Execute the Python script to refresh the leaderboard data
#     subprocess.run(['python', 'leaderboardV4.py'])
#     return 'Leaderboard refreshed successfully!'
#
#
# if __name__ == '__main__':
#     app.run(debug=True)

# PYTHON CODE WHICH RUNS THE LEADERBOARDV4.PY PYTHON FILE WHEN REQUESTED VIA THE HTML/AJAX

from flask import Flask, request, jsonify, Response
import subprocess

app = Flask(__name__)


# Function to enable CORS
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response


@app.route('/refresh_leaderboard', methods=['GET', 'OPTIONS'])
def refresh_leaderboard():
    # Check if the request is a preflight OPTIONS request
    if request.method == 'OPTIONS':
        return add_cors_headers(Response()), 200

    # Execute the Python script to refresh the leaderboard data
    subprocess.run(['python', 'leaderboardV4.py'])

    # Return a response with CORS headers
    response = jsonify({'message': 'Leaderboard refreshed successfully!'})
    return add_cors_headers(response), 200


if __name__ == '__main__':
    app.run(debug=True)
