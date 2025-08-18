import os
import json
import asyncio
import requests
import certifi
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv
from pymongo import MongoClient
import re
from difflib import get_close_matches
import google.generativeai as genai
from pydantic import BaseModel
from pydantic_ai import Agent
from textwrap import dedent
from datetime import datetime

# ---------------- CUSTOM JSON ENCODER ----------------
def safe_json_dumps(obj, **kwargs):
    """Safely serialize objects to JSON, handling datetime and other non-serializable types"""
    class SafeEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            # Handle MongoDB ObjectId
            if hasattr(obj, '__str__'):
                return str(obj)
            return super().default(obj)
    
    return json.dumps(obj, cls=SafeEncoder, **kwargs)

# ---------------- ENV & DB SETUP ----------------
load_dotenv("../.env")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("Missing GOOGLE_API_KEY in environment")
# genai.configure(api_key=GOOGLE_API_KEY)  # Commented out due to version compatibility

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "test")

mongo_kwargs: Dict[str, Any] = {"serverSelectionTimeoutMS": 5000}
if "mongodb.net" in MONGO_URI or MONGO_URI.startswith("mongodb+srv://"):
    mongo_kwargs["tls"] = True
    mongo_kwargs["tlsCAFile"] = certifi.where()

client = MongoClient(MONGO_URI, **mongo_kwargs)
db = client[MONGO_DB]

# ---------------- MODELS ----------------
class RecipeModel(BaseModel):
    dish_name: str
    ingredients: List[str]
    instructions: str
    cooking_time: Optional[str] = None
    difficulty: Optional[str] = None

class InventoryAnalysis(BaseModel):
    available: List[str]
    missing: List[str]
    low_stock: List[str]
    summary: str

class OrderAnalysis(BaseModel):
    dish_name: str
    quantity: int
    required_ingredients: List[Dict[str, Any]]
    missing_ingredients: List[Dict[str, Any]]
    low_stock_ingredients: List[Dict[str, Any]]
    can_fulfill: bool
    restock_recommendations: List[str]

class LLMResponse(BaseModel):
    answer: str

# ---------------- SYSTEM PROMPT ----------------
SYSTEM_PROMPT = dedent("""
You are a professional restaurant AI assistant with access to the complete restaurant database.

Rules:
1. Answer questions related to ALL restaurant topics: recipes, dishes, drinks, ingredients, cooking methods, inventory, users, employees, orders, sales, profits, costs, and any other restaurant database data.
2. If asked about a recipe or drink:
   - ALWAYS provide the complete recipe first, regardless of ingredient availability.
   - Include a full ingredients list with quantities and step-by-step cooking instructions.
   - Make the recipe instructions clear and easy to follow.
3. For inventory questions:
   - ALWAYS include quantities for each ingredient mentioned.
   - Show ONLY ingredients that are out of stock (0 units) or low in stock (1-2 units) when reporting issues.
   - For general inventory queries, show all ingredients with their quantities.
4. For database queries (users, orders, sales, profits, costs):
   - Provide comprehensive information from the database.
   - Include relevant statistics, summaries, and insights.
   - Format data clearly and professionally.
5. Format your response as:
   - Main answer section
   - Data/Statistics section (if applicable)
   - Summary/recommendations
6. Keep responses professional, clear, and well-structured. No emojis, no filler text.
7. ALWAYS include quantities when discussing inventory items.
""")

# ---------------- UTILS ----------------
def is_restaurant_query(text: str) -> bool:
    keywords = [
        "recipe", "ingredient", "cook", "prepare", "dish", "menu", "drink", "water",
        "juice", "coffee", "tea", "inventory", "stock", "available", "burger", "pizza",
        "pasta", "salad", "soup", "cake", "bread", "chicken", "beef", "fish", "rice", "fries",
        "user", "employee", "order", "sale", "profit", "cost", "revenue", "statistic", "data",
        "database", "report", "summary", "total", "count", "show", "list", "what", "how many"
    ]
    return any(word in text.lower() for word in keywords)

def is_order_request(text: str) -> bool:
    """
    Detect if the user is asking about placing an order
    """
    order_keywords = [
        "order", "customer order", "want to order", "need to make", "fulfill order",
        "can we make", "do we have enough", "restock", "inventory check"
    ]
    return any(keyword in text.lower() for keyword in order_keywords)

def extract_order_details(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract order details from user text
    Examples: "150 pizzas", "order 50 burgers", "customer wants 25 cakes"
    """
    try:
        # Look for quantity patterns
        quantity_patterns = [
            r'(\d+)\s*(pizza|pizzas|burger|burgers|cake|cakes|dish|dishes|meal|meals)',
            r'order\s+(\d+)\s*(pizza|pizzas|burger|burgers|cake|cakes|dish|dishes|meal|meals)',
            r'(\d+)\s*(pizza|pizzas|burger|burgers|cake|cakes|dish|dishes|meal|meals)\s*order',
            r'customer\s+(?:wants|ordered|needs)\s+(\d+)\s*(pizza|pizzas|burger|burgers|cake|cakes|dish|dishes|meal|meals)'
        ]
        
        for pattern in quantity_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                quantity = int(match.group(1))
                item_type = match.group(2).lower()
                
                # Determine the specific dish name
                if 'pizza' in item_type:
                    dish_name = 'pizza'
                elif 'burger' in item_type:
                    dish_name = 'hamburger'
                elif 'cake' in item_type:
                    dish_name = 'cake'
                else:
                    dish_name = 'dish'
                
                return {
                    'dish_name': dish_name,
                    'quantity': quantity,
                    'original_text': text
                }
        
        return None
        
    except Exception as e:
        print(f"Error extracting order details: {e}")
        return None

def get_inventory() -> Dict[str, Any]:
    try:
        inventory = {}
        for doc in db["ingredients"].find({}):
            inventory[doc["name"].lower()] = doc.get("currentStock", 0)
        return inventory
    except Exception as e:
        return {"error": f"Inventory fetch failed: {str(e)}"}

def get_users() -> List[Dict]:
    try:
        users = list(db["users"].find({}, {"_id": 0, "password": 0}))  # Exclude password
        return users
    except Exception as e:
        return [{"error": f"Users fetch failed: {str(e)}"}]

def get_orders() -> List[Dict]:
    try:
        orders = list(db["orders"].find({}, {"_id": 0}))
        return orders
    except Exception as e:
        return [{"error": f"Orders fetch failed: {str(e)}"}]

def get_items() -> List[Dict]:
    try:
        items = list(db["items"].find({}, {"_id": 0}))
        return items
    except Exception as e:
        return [{"error": f"Items fetch failed: {str(e)}"}]

def get_daily_sales() -> List[Dict]:
    try:
        sales = list(db["dailysales"].find({}, {"_id": 0}))
        return sales
    except Exception as e:
        return [{"error": f"Daily sales fetch failed: {str(e)}"}]

def get_restaurant_stats() -> Dict:
    """Get comprehensive restaurant statistics"""
    try:
        stats = {}
        
        # Count totals
        stats["total_users"] = db["users"].count_documents({})
        stats["total_orders"] = db["orders"].count_documents({})
        stats["total_items"] = db["items"].count_documents({})
        stats["total_ingredients"] = db["ingredients"].count_documents({})
        
        # Calculate total revenue from orders
        orders = list(db["orders"].find({}, {"totalAmount": 1}))
        total_revenue = sum(order.get("totalAmount", 0) for order in orders)
        stats["total_revenue"] = total_revenue
        
        # Calculate total cost from ingredients
        ingredients = list(db["ingredients"].find({}, {"currentStock": 1, "costPerUnit": 1}))
        total_cost = sum(ing.get("currentStock", 0) * ing.get("costPerUnit", 0) for ing in ingredients)
        stats["total_inventory_cost"] = total_cost
        
        # Calculate profit
        stats["total_profit"] = total_revenue - total_cost
        
        # Get recent orders (last 10)
        recent_orders = list(db["orders"].find({}, {"_id": 0, "orderDate": 1, "totalAmount": 1, "status": 1}).sort("orderDate", -1).limit(10))
        stats["recent_orders"] = recent_orders
        
        return stats
    except Exception as e:
        return {"error": f"Statistics calculation failed: {str(e)}"}

def find_closest(name: str, keys: List[str]) -> Optional[str]:
    matches = get_close_matches(name.lower(), keys, n=1, cutoff=0.6)
    return matches[0] if matches else None

def analyze_inventory(ingredients: List[str], inventory: Dict[str, Any]) -> InventoryAnalysis:
    available, missing, low_stock = [], [], []
    for ing in ingredients:
        closest = find_closest(ing, list(inventory.keys()))
        if closest and inventory.get(closest, 0) > 0:
            available.append(f"{closest} ({inventory[closest]})")
            if inventory.get(closest, 0) <= 2:
                low_stock.append(closest)
        else:
            missing.append(ing)
    summary = (
        "All ingredients available." if not missing else
        f"Missing: {', '.join(missing)}"
    )
    return InventoryAnalysis(available=available, missing=missing, low_stock=low_stock, summary=summary)

def analyze_order_fulfillment(dish_name: str, quantity: int, recipe_ingredients: List[str], inventory: Dict[str, int]) -> OrderAnalysis:
    """
    Analyze if an order can be fulfilled and provide restocking recommendations
    """
    required_ingredients = []
    missing_ingredients = []
    low_stock_ingredients = []
    restock_recommendations = []
    
    # Parse recipe ingredients and match with inventory
    for ingredient_text in recipe_ingredients:
        # Extract ingredient name and quantity from text like "2 cups flour" or "1 lb beef"
        ingredient_info = parse_ingredient_text(ingredient_text)
        if ingredient_info:
            ingredient_name = ingredient_info['name']
            base_quantity = ingredient_info['quantity']
            unit = ingredient_info['unit']
            
            # Calculate total required quantity
            total_required = base_quantity * quantity
            
            # Find matching ingredient in inventory
            closest_match = find_closest(ingredient_name, list(inventory.keys()))
            
            if closest_match:
                available_stock = inventory[closest_match]
                required_ingredients.append({
                    'name': closest_match,
                    'required': total_required,
                    'available': available_stock,
                    'unit': unit,
                    'status': 'available' if available_stock >= total_required else 'insufficient'
                })
                
                if available_stock < total_required:
                    missing_ingredients.append({
                        'name': closest_match,
                        'required': total_required,
                        'available': available_stock,
                        'unit': unit,
                        'shortage': total_required - available_stock
                    })
                    restock_recommendations.append(f"Restock {closest_match}: Need {total_required} {unit}, have {available_stock} {unit}")
                elif available_stock <= total_required * 0.2:  # Less than 20% buffer
                    low_stock_ingredients.append({
                        'name': closest_match,
                        'required': total_required,
                        'available': available_stock,
                        'unit': unit
                    })
                    restock_recommendations.append(f"Low stock warning: {closest_match} - {available_stock} {unit} remaining")
            else:
                missing_ingredients.append({
                    'name': ingredient_name,
                    'required': total_required,
                    'available': 0,
                    'unit': unit,
                    'shortage': total_required
                })
                restock_recommendations.append(f"Add {ingredient_name} to inventory: Need {total_required} {unit}")
    
    can_fulfill = len(missing_ingredients) == 0
    
    return OrderAnalysis(
        dish_name=dish_name,
        quantity=quantity,
        required_ingredients=required_ingredients,
        missing_ingredients=missing_ingredients,
        low_stock_ingredients=low_stock_ingredients,
        can_fulfill=can_fulfill,
        restock_recommendations=restock_recommendations
    )

def parse_ingredient_text(ingredient_text: str) -> Optional[Dict[str, Any]]:
    """
    Parse ingredient text to extract name, quantity, and unit
    Examples: "2 cups flour", "1 lb beef", "3 large eggs"
    """
    try:
        # Remove extra whitespace
        text = ingredient_text.strip()
        
        # Common quantity patterns
        quantity_patterns = [
            r'^(\d+(?:\.\d+)?)\s*(cup|cups|tbsp|tsp|oz|lb|g|kg|ml|l|piece|pieces|large|medium|small)\s+(.+)',
            r'^(\d+(?:\.\d+)?)\s*(.+)',
            r'^(\d+)\s*(.+)'
        ]
        
        for pattern in quantity_patterns:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                quantity = float(match.group(1))
                unit = match.group(2) if len(match.groups()) > 2 else 'unit'
                name = match.group(3) if len(match.groups()) > 2 else match.group(2)
                
                # Clean up the name
                name = re.sub(r'^(cup|cups|tbsp|tsp|oz|lb|g|kg|ml|l|piece|pieces|large|medium|small)\s+', '', name, flags=re.IGNORECASE)
                
                return {
                    'name': name.strip(),
                    'quantity': quantity,
                    'unit': unit.lower()
                }
        
        # If no pattern matches, assume it's just an ingredient name
        return {
            'name': text,
            'quantity': 1,
            'unit': 'unit'
        }
        
    except Exception as e:
        print(f"Error parsing ingredient text '{ingredient_text}': {e}")
        return None

def extract_ingredients_from_text(text: str) -> List[str]:
    if not text:
        return []
    lines = re.split(r"\n|;|-|\u2022", text)
    candidates = []
    pattern = re.compile(
        r"(?:(?:\d+\/\d+|\d+)\s*(?:g|kg|ml|l|cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound)?)\s*([A-Za-z][A-Za-z0-9\s\-,()]+)",
        re.I
    )
    fallback_words = r"\b(salt|pepper|onion|garlic|tomato|cheese|egg|eggs|flour|water|oil|butter|milk|sugar|lemon|vinegar|rice|pasta|bun|buns)\b"
    for ln in lines:
        ln_clean = ln.strip()
        if not ln_clean or len(ln_clean) < 3:
            continue
        m = pattern.search(ln_clean)
        if m:
            candidates.append(ln_clean)
        elif re.search(fallback_words, ln_clean.lower()):
            candidates.append(ln_clean)
    seen = []
    for c in candidates:
        c_clean = re.sub(r"\s+", " ", c).strip()
        if c_clean not in seen:
            seen.append(c_clean)
    return seen

# ---------------- WEB SEARCH ----------------
def duckduckgo_search(query: str) -> Optional[str]:
    try:
        resp = requests.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"},
            timeout=10
        )
        data = resp.json()
        if data.get("AbstractText"):
            return data["AbstractText"]
        if data.get("Abstract"):
            return data["Abstract"]
        if data.get("RelatedTopics"):
            for t in data["RelatedTopics"]:
                if isinstance(t, dict) and "Text" in t:
                    return t["Text"]
    except Exception as e:
        print(f"DuckDuckGo search error: {e}")
    return None

def themealdb_search(dish: str) -> Optional[RecipeModel]:
    try:
        resp = requests.get(
            "https://www.themealdb.com/api/json/v1/1/search.php",
            params={"s": dish},
            timeout=10
        )
        data = resp.json()
        meals = data.get("meals")
        if not meals:
            return None
        meal = meals[0]
        ingredients = [
            f"{meal[f'strMeasure{i}']} {meal[f'strIngredient{i}']}".strip()
            for i in range(1, 21) if meal.get(f"strIngredient{i}")
        ]
        return RecipeModel(
            dish_name=meal.get("strMeal", dish),
            ingredients=ingredients,
            instructions=meal.get("strInstructions", "")
        )
    except Exception as e:
        print(f"TheMealDB error: {e}")
        return None

def get_recipe_from_web(dish: str) -> Optional[RecipeModel]:
    recipe = themealdb_search(dish)
    if recipe:
        return recipe
    web_text = duckduckgo_search(f"{dish} recipe ingredients")
    if web_text:
        return RecipeModel(dish_name=dish, ingredients=[], instructions=web_text)
    return None

# ---------------- FALLBACK RESPONSE GENERATOR ----------------
def generate_fallback_response(user_text: str, web_recipe: Optional[RecipeModel], inventory: Dict[str, int], inv_analysis: Optional[InventoryAnalysis]) -> str:
    """Generate a fallback response when AI service is unavailable"""
    
    response_parts = []
    
    # Check if it's an inventory question
    if any(word in user_text.lower() for word in ["inventory", "ingredients", "stock", "what do you have"]):
        if inventory and not "error" in inventory:
            response_parts.append("**Current Inventory (with quantities):**")
            for item, quantity in inventory.items():
                if quantity == 0:
                    response_parts.append(f"- {item}: OUT OF STOCK")
                elif quantity <= 2:
                    response_parts.append(f"- {item}: LOW STOCK ({quantity})")
                else:
                    response_parts.append(f"- {item}: {quantity}")
        else:
            response_parts.append("Unable to fetch inventory data at this time.")
    
    # Check if it's a database question
    elif any(word in user_text.lower() for word in ["users", "orders", "sales", "profit", "cost", "employees", "statistics"]):
        try:
            stats = get_restaurant_stats()
            if "error" not in stats:
                response_parts.append("**Restaurant Statistics:**")
                response_parts.append(f"- Total Users: {stats.get('total_users', 0)}")
                response_parts.append(f"- Total Orders: {stats.get('total_orders', 0)}")
                response_parts.append(f"- Total Revenue: ${stats.get('total_revenue', 0):.2f}")
                response_parts.append(f"- Total Profit: ${stats.get('total_profit', 0):.2f}")
                response_parts.append(f"- Total Items: {stats.get('total_items', 0)}")
                response_parts.append(f"- Total Ingredients: {stats.get('total_ingredients', 0)}")
            else:
                response_parts.append("Unable to fetch statistics at this time.")
        except:
            response_parts.append("Unable to fetch database information at this time.")
    
    # Add recipe if available and it's a recipe question
    elif web_recipe and web_recipe.ingredients:
        response_parts.append(f"**{web_recipe.dish_name.title()} Recipe**")
        response_parts.append("\n**Ingredients:**")
        for ingredient in web_recipe.ingredients:
            response_parts.append(f"- {ingredient}")
        
        if web_recipe.instructions:
            response_parts.append("\n**Instructions:**")
            instructions = web_recipe.instructions.replace('\n\n', '\n').strip()
            response_parts.append(instructions)
    
    # Add note about AI service
    response_parts.append("\n*Note: AI service is temporarily unavailable. This response was generated from available data.*")
    
    return '\n'.join(response_parts)

# ---------------- MAIN LLM AGENT ----------------
agent = Agent("google-gla:gemini-1.5-flash", system_prompt=SYSTEM_PROMPT)

async def handle_user_query(user_text: str) -> str:
    if not is_restaurant_query(user_text):
        return "I can only answer restaurant-related questions such as recipes, ingredients, and inventory."

    inventory = get_inventory()
    if "error" in inventory:
        return inventory["error"]

    # Check if this is an order request
    if is_order_request(user_text):
        order_details = extract_order_details(user_text)
        if order_details:
            return await process_order_request(order_details, inventory)
    
    # Regular recipe/inventory query
    dish_match = re.search(r"(?:recipe for|ingredients of|how to make)\s+([a-zA-Z\s]+)", user_text.lower())
    dish_name = dish_match.group(1).strip() if dish_match else None

    web_recipe = None
    inv_analysis = None

    if dish_name:
        web_recipe = get_recipe_from_web(dish_name)
        if web_recipe:
            if not web_recipe.ingredients and web_recipe.instructions:
                web_recipe.ingredients = extract_ingredients_from_text(web_recipe.instructions)
            if web_recipe.ingredients:
                ing_names = [
                    re.sub(r"\d+|\b(g|kg|ml|l|cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound)\b", "", ing, flags=re.I).strip()
                    for ing in web_recipe.ingredients
                ]
                inv_analysis = analyze_inventory(ing_names, inventory)

    # Fetch all relevant database data
    users_data = get_users()
    orders_data = get_orders()
    items_data = get_items()
    sales_data = get_daily_sales()
    stats_data = get_restaurant_stats()
    
    context_prompt = dedent(f"""
    User Query: {user_text}

    Web Search Recipe: {safe_json_dumps(web_recipe.model_dump() if web_recipe else {}, indent=2)}

    Inventory Data: {safe_json_dumps(inventory, indent=2)}

    Inventory Analysis: {safe_json_dumps(inv_analysis.model_dump() if inv_analysis else {}, indent=2)}

    Database Information:
    - Users: {safe_json_dumps(users_data, indent=2)}
    - Orders: {safe_json_dumps(orders_data, indent=2)}
    - Menu Items: {safe_json_dumps(items_data, indent=2)}
    - Daily Sales: {safe_json_dumps(sales_data, indent=2)}
    - Restaurant Statistics: {safe_json_dumps(stats_data, indent=2)}

    IMPORTANT: 
    - For inventory questions: ALWAYS include quantities for each ingredient mentioned.
    - For database questions: Provide comprehensive information from the database.
    - For recipe questions: Always provide the complete recipe first, then include inventory status.
    - Format responses professionally with clear sections.
    - Include relevant statistics, summaries, and insights when appropriate.
    """)

    try:
        # Debug logging (only in console, not in user response)
        result = await agent.run(context_prompt, output_type=LLMResponse)
        
        # Clean the response for the user - remove any debug output
        clean_response = result.output.answer.strip()
        
        # Remove debug lines if they somehow got into the response
        lines = clean_response.split('\n')
        filtered_lines = []
        for line in lines:
            if not any(debug_text in line.lower() for debug_text in [
                'calling agent', 'agent response received', 'prompt length'
            ]):
                filtered_lines.append(line)
        
        return '\n'.join(filtered_lines)
    except Exception as e:
        print(f"Agent error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        
        # Handle specific Google AI API errors gracefully
        if "503" in str(e) or "UNAVAILABLE" in str(e):
            # Provide fallback response using available data
            fallback_response = generate_fallback_response(user_text, web_recipe, inventory, inv_analysis)
            return fallback_response
        elif "quota" in str(e).lower() or "limit" in str(e).lower():
            return "The AI service has reached its usage limit. Please try again later or contact support."
        else:
            return f"Assistant error: {str(e)}"

async def process_order_request(order_details: Dict[str, Any], inventory: Dict[str, Any]) -> str:
    """
    Process an order request and provide inventory analysis
    """
    try:
        dish_name = order_details['dish_name']
        quantity = order_details['quantity']
        
        # Get recipe from web
        web_recipe = get_recipe_from_web(dish_name)
        
        if not web_recipe or not web_recipe.ingredients:
            # Fallback to basic ingredient requirements
            if dish_name == 'pizza':
                basic_ingredients = [
                    "2 cups flour", "1 cup water", "1 tsp yeast", "1 cup tomato sauce", 
                    "2 cups cheese", "1 cup toppings"
                ]
            elif dish_name == 'hamburger':
                basic_ingredients = [
                    "1 lb ground beef", "4 burger buns", "1 cup lettuce", "1 cup tomatoes", 
                    "1 cup onions", "1 cup cheese"
                ]
            elif dish_name == 'cake':
                basic_ingredients = [
                    "2 cups flour", "1 cup sugar", "1 cup milk", "3 eggs", 
                    "1/2 cup butter", "1 tsp vanilla"
                ]
            else:
                basic_ingredients = ["1 cup main ingredient", "1 cup seasoning", "1 cup garnish"]
            
            web_recipe = RecipeModel(
                dish_name=dish_name,
                ingredients=basic_ingredients,
                instructions=f"Standard {dish_name} preparation method"
            )
        
        # Analyze order fulfillment
        order_analysis = analyze_order_fulfillment(
            dish_name, quantity, web_recipe.ingredients, inventory
        )
        
        # Build response
        response_parts = []
        
        # Header
        response_parts.append(f"**ORDER ANALYSIS: {quantity}x {dish_name.title()}**")
        response_parts.append("=" * 50)
        
        # Recipe information
        response_parts.append(f"\n**Recipe Ingredients (per {dish_name}):**")
        for ingredient in web_recipe.ingredients:
            response_parts.append(f"  • {ingredient}")
        
        # Inventory analysis
        response_parts.append(f"\n**Inventory Analysis for {quantity}x {dish_name}:**")
        
        if order_analysis.can_fulfill:
            response_parts.append("**ORDER CAN BE FULFILLED!**")
            
            if order_analysis.low_stock_ingredients:
                response_parts.append("\n**Low Stock Warnings:**")
                for ingredient in order_analysis.low_stock_ingredients:
                    response_parts.append(f"  • {ingredient['name']}: {ingredient['available']} {ingredient['unit']} remaining")
        else:
            response_parts.append("**ORDER CANNOT BE FULFILLED**")
            
            response_parts.append("\n**Missing/Insufficient Ingredients:**")
            for ingredient in order_analysis.missing_ingredients:
                response_parts.append(f"  • {ingredient['name']}: Need {ingredient['required']} {ingredient['unit']}, have {ingredient['available']} {ingredient['unit']}")
        
        # Restocking recommendations
        if order_analysis.restock_recommendations:
            response_parts.append(f"\n**Restocking Recommendations:**")
            for rec in order_analysis.restock_recommendations:
                response_parts.append(f"  • {rec}")
        
        # Current inventory status
        response_parts.append(f"\n**Current Inventory Status:**")
        for ingredient_name, stock in inventory.items():
            if stock <= 5:  # Show low stock items
                response_parts.append(f"  • {ingredient_name}: {stock} units (LOW STOCK)")
        
        # Action items
        response_parts.append(f"\n**Next Steps:**")
        if order_analysis.can_fulfill:
            response_parts.append("1. Proceed with order fulfillment")
            if order_analysis.low_stock_ingredients:
                response_parts.append("2. Plan restocking for low stock items")
        else:
            response_parts.append("1. Order cannot be fulfilled")
            response_parts.append("2. Restock missing ingredients")
            response_parts.append("3. Re-evaluate after restocking")
        
        return '\n'.join(response_parts)
        
    except Exception as e:
        return f"Error processing order request: {str(e)}"

# ---------------- ENTRY POINT ----------------
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python assistant.py 'your query'")
        sys.exit(1)
    query = sys.argv[1]
    answer = asyncio.run(handle_user_query(query))
    print(answer)
    