from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from datetime import datetime, timedelta

# --- App Initialization ---
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) to allow our frontend to talk to this backend
CORS(app)

# --- Configuration ---
# It's best practice to use environment variables for API keys.
# For this example, we'll hardcode it, but for production, use os.environ.get('OCR_API_KEY')
OCR_API_KEY = "K86524044188957"  # This is a free key for the ocr.space API
OCR_API_URL = "https://api.ocr.space/parse/image"

# --- In-Memory Database (for demonstration purposes) ---
# In a real application, you would connect this to a database like PostgreSQL or Supabase.
db = {
    "inventory": [
        {"id": 1, "name": "Organic Bananas", "quantity": "1 bunch", "purchase_date": "2025-08-28"},
        {"id": 2, "name": "Chicken Breast", "quantity": "2 lbs", "purchase_date": "2025-08-30"},
    ],
    "marketplace": [],
    "donations": []
}

# --- Machine Learning Model Placeholders ---

def predict_waste(inventory_items):
    """
    Placeholder for a regression model to predict waste.
    In a real scenario, this would use a trained model (e.g., scikit-learn)
    to predict the shelf life based on the item name and purchase date.
    
    For now, it uses a simple dictionary lookup.
    """
    SHELF_LIFE_DAYS = {'default': 7, 'banana': 5, 'chicken': 3, 'spinach': 6, 'bread': 5, 'milk': 7}
    predictions = []
    for item in inventory_items:
        name_key = item['name'].lower().split(' ')[0]
        life = SHELF_LIFE_DAYS.get(name_key, SHELF_LIFE_DAYS['default'])
        purchase_date = datetime.strptime(item['purchase_date'], '%Y-%m-%d')
        expiry_date = purchase_date + timedelta(days=life)
        days_left = (expiry_date - datetime.now()).days
        
        status = "Fresh"
        if days_left < 0:
            status = "Expired"
        elif days_left <= 2:
            status = "Nearing Expiration"
            
        predictions.append({"item_id": item['id'], "days_left": days_left, "status": status})
    return predictions

def suggest_recipes(inventory_items):
    """
    Placeholder for an NLP model for recipe suggestions.
    A real model would analyze ingredients and find matching recipes.
    
    This is a simple rule-based suggestion engine for demonstration.
    """
    suggestions = []
    item_names = [item['name'].lower() for item in inventory_items]
    
    if "chicken breast" in item_names and "baby spinach" in item_names:
        suggestions.append({
            "title": "Meal Idea: Chicken & Spinach",
            "description": "Your chicken and spinach are fresh. Try making a stir-fry or a healthy salad tonight!"
        })
    
    nearing_expiration = [item for item in inventory_items if predict_waste([item])[0]['status'] == "Nearing Expiration"]
    if nearing_expiration:
        item = nearing_expiration[0]
        suggestions.append({
            "title": f"Use Soon: {item['name']}",
            "description": f"Your {item['name'].lower()} is nearing its expiration date. Plan to use it in your next meal."
        })
        
    return suggestions

# --- API Endpoints ---

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Endpoint to get all inventory items with their waste prediction."""
    waste_predictions = predict_waste(db['inventory'])
    
    # Combine inventory data with predictions
    enriched_inventory = []
    for item in db['inventory']:
        prediction = next((p for p in waste_predictions if p['item_id'] == item['id']), None)
        if prediction:
            enriched_item = {**item, **prediction}
            enriched_inventory.append(enriched_item)
            
    return jsonify(enriched_inventory)

@app.route('/api/inventory', methods=['POST'])
def add_to_inventory():
    """Endpoint to add a new item to the inventory."""
    data = request.get_json()
    if not data or 'name' not in data or 'quantity' not in data or 'purchase_date' not in data:
        return jsonify({"error": "Missing data"}), 400
        
    new_id = max([item['id'] for item in db['inventory']] + [0]) + 1
    new_item = {
        "id": new_id,
        "name": data['name'],
        "quantity": data['quantity'],
        "purchase_date": data['purchase_date']
    }
    db['inventory'].append(new_item)
    return jsonify(new_item), 201

@app.route('/api/scan-receipt', methods=['POST'])
def scan_receipt():
    """
    Endpoint to receive an image, send it to the OCR API,
    and return the parsed text.
    """
    if 'receipt' not in request.files:
        return jsonify({"error": "No receipt file found"}), 400
    
    file = request.files['receipt']
    
    # Prepare the request for the OCR API
    payload = {
        'apikey': OCR_API_KEY,
        'language': 'eng',
    }
    
    # Send the request
    response = requests.post(
        OCR_API_URL,
        files={'file': (file.filename, file.read(), file.content_type)},
        data=payload
    )
    
    if response.status_code == 200:
        ocr_data = response.json()
        if not ocr_data.get('IsErroredOnProcessing'):
            parsed_text = ocr_data['ParsedResults'][0]['ParsedText']
            # Here, you would add more logic to clean the text and identify food items
            return jsonify({"text": parsed_text})
        else:
            return jsonify({"error": ocr_data.get('ErrorMessage')}), 500
            
    return jsonify({"error": "Failed to connect to OCR service"}), 500

@app.route('/api/ai-suggestions', methods=['GET'])
def get_ai_suggestions():
    """Endpoint to get AI-powered suggestions based on the current inventory."""
    suggestions = suggest_recipes(db['inventory'])
    return jsonify(suggestions)


# --- Main Execution ---
if __name__ == '__main__':
    # Runs the Flask app on localhost, port 5000
    app.run(debug=True, port=5000)
