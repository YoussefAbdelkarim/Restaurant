import os
import json
import asyncio
import requests
import certifi
from typing import List, Dict, Optional
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
genai.configure(api_key=GOOGLE_API_KEY)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "test")

mongo_kwargs = {"serverSelectionTimeoutMS": 5000}
if "mongodb.net" in MONGO_URI or MONGO_URI.startswith("mongodb+srv://"):
    mongo_kwargs.update({"tls": True, "tlsCAFile": certifi.where()})

db = MongoClient(MONGO_URI, **mongo_kwargs)[MONGO_DB]

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

def get_inventory() -> Dict[str, int]:
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

def analyze_inventory(ingredients: List[str], inventory: Dict[str, int]) -> InventoryAnalysis:
    available, missing, low_stock = [], [], []
    for ing in ingredients:
        closest = find_closest(ing, list(inventory.keys()))
        if closest and inventory.get(closest, 0) > 0:
            available.append(f"{closest} ({inventory[closest]})")
            if inventory[closest] <= 2:
                low_stock.append(closest)
        else:
            missing.append(ing)
    summary = (
        "All ingredients available." if not missing else
        f"Missing: {', '.join(missing)}"
    )
    return InventoryAnalysis(available=available, missing=missing, low_stock=low_stock, summary=summary)

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

# ---------------- ENTRY POINT ----------------
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python assistant.py 'your query'")
        sys.exit(1)
    query = sys.argv[1]
    answer = asyncio.run(handle_user_query(query))
    print(answer)