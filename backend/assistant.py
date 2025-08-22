#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
assistant.py — Restaurant Assistant (clean rewrite)

Purpose
-------
  1) Answers ONLY restaurant/menu/recipe/inventory questions.
  2) If a dish exists in MongoDB -> returns it directly.
  3) If not, searches DuckDuckGo and synthesizes a recipe via Gemini.
  4) If web search fails, falls back to Gemini (gemini-1.5-flash).
  5) Always checks MongoDB inventory and reports status clearly.
  6) Strict output order: Recipe → Ingredients → Steps → Inventory.
  7) No emojis, no manual fallback recipes.

Dependencies
-----------
  pip install google-generativeai duckduckgo_search pymongo python-dotenv
"""

import os, re, sys, json, traceback
from typing import Dict, List, Any, Optional, Tuple
from pymongo import MongoClient
from bson import ObjectId

# Load environment
try:
    from dotenv import load_dotenv
    here = os.path.dirname(__file__)
    load_dotenv(os.path.join(here, '.env'))
    load_dotenv(os.path.join(here, '..', '.env'))
except Exception:
    pass

# DuckDuckGo
try:
    import importlib
    _ddg = importlib.import_module('duckduckgo_search')
    DDGS = getattr(_ddg, 'DDGS', None)
except Exception:
    DDGS = None

# Gemini
try:
    import google.generativeai as genai
except Exception:
    genai = None

# Config
MONGO_URI = os.environ.get("MONGO_URI")
MONGO_DB = os.environ.get("MONGO_DB", "test")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
DEBUG = os.environ.get("ASSISTANT_DEBUG", "0") == "1"
AUTO_ADD_INGREDIENTS = os.environ.get("ASSISTANT_AUTO_ADD_INGREDIENTS", "0") == "1"
AUTO_SAVE_ITEMS = os.environ.get("ASSISTANT_AUTO_SAVE_ITEMS", "0") == "1"

RESTAURANT_KEYWORDS = [
    "dish", "recipe", "ingredients", "prepare", "cook", "bake", "fry", "grill", "boil",
    "menu", "item", "burger", "pizza", "drink", "juice", "fries", "dessert", "pancakes",
    "sandwich", "plate", "cake", "spirits", "beverage", "order", "inventory", "stock",
    "how much", "how many", "buckets", "oil", "water", "sold", "shake"
]

CATEGORY_GUESS = [
    (r"pizza", "pizza"),
    (r"burger|sandwich", "burger"),
    (r"fries|chips", "fries"),
    (r"juice|drink|beverage", "drink"),
    (r"cake|dessert|pancake", "dessert"),
]

# ---------------- DB utils ----------------

def mongo() -> MongoClient:
    if not MONGO_URI:
        raise RuntimeError("MONGO_URI missing")
    return MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)

def get_collections(client: MongoClient):
    db = client[MONGO_DB]
    return db["ingredients"], db["items"]

def fetch_inventory_map(ingredients_col) -> Dict[str, Dict[str, Any]]:
    inv = {}
    if ingredients_col:
        for doc in ingredients_col.find({}):
            name = (doc.get("name") or "").strip().lower()
            if name:
                inv[name] = doc
    return inv

def find_item_in_database(items_col, dish: str) -> Optional[Dict[str, Any]]:
    """Find item in MongoDB items collection by name (case-insensitive)"""
    if items_col is None:
        return None
    if not dish:
        return None
    
    # Try exact match first
    doc = items_col.find_one({
        "name": {"$regex": f"^\\s*{re.escape(dish)}\\s*$", "$options": "i"}
    })
    if doc:
        return doc
    
    # Try fuzzy match
    dish_normalized = normalize_title_for_match(dish)
    for doc in items_col.find({}):
        name = doc.get("name", "")
        if normalize_title_for_match(name) == dish_normalized:
            return doc
    
    return None

def resolve_ingredient_object_id(ingredients_col, name: str) -> Optional[ObjectId]:
    if not name:
        return None
    if ingredients_col is None:
        return None
    n = name.strip().lower()
    doc = ingredients_col.find_one({"name": {"$regex": f"^\\s*{re.escape(n)}\\s*$", "$options": "i"}})
    return doc.get("_id") if doc else None

def add_ingredients_to_inventory(ingredients_col, recipe_ingredients: List[Dict[str, Any]]) -> None:
    """Add recipe ingredients to MongoDB ingredients collection"""
    # Respect environment flag to avoid polluting inventory
    if not AUTO_ADD_INGREDIENTS:
        return
    if not recipe_ingredients:
        return
    if ingredients_col is None:
        return
    
    for ing in recipe_ingredients:
        ing_name = str(ing.get("name", "")).strip()
        if not ing_name:
            continue
            
        ing_unit = ing.get("unit", "unit")
        # Normalize units to match Ingredient schema
        if ing_unit == "scoops":
            ing_unit = "unit"  # Convert scoops to unit
        elif ing_unit == "tsp" or ing_unit == "tbsp":
            ing_unit = "unit"  # Convert tsp/tbsp to unit
        elif ing_unit not in {"g", "kg", "l", "ml", "piece", "unit"}:
            ing_unit = "unit"
        
        # Check if ingredient already exists in MongoDB
        existing_doc = ingredients_col.find_one({
            "name": {"$regex": f"^\\s*{re.escape(ing_name)}\\s*$", "$options": "i"}
        })
        
        if not existing_doc:
            # Add to MongoDB ingredients collection
            try:
                ingredient_doc = {
                    "name": ing_name,
                    "unit": ing_unit,
                    "currentStock": 0,  # Start with 0 stock
                    "pricePerUnit": 0,
                    "totalPurchasedQuantity": 0,
                    "totalPurchasedAmount": 0,
                    "lastPurchaseUnitPrice": 0,
                    "alertThreshold": 10,  # Default alert threshold
                }
                ingredients_col.insert_one(ingredient_doc)
                log(f"Added ingredient to MongoDB: {ing_name}")
            except Exception as e:
                log(f"Failed to add ingredient {ing_name} to MongoDB: {e}")

def save_item_to_mongo(items_col, ingredients_col, item: Dict[str, Any]) -> str:
    """Save item into MongoDB 'items' collection following the Mongoose schema shape.
    Returns inserted _id as string (or existing id if upserted).
    """
    if items_col is None:
        # DB not available; skip persistence
        return ""
    if not AUTO_SAVE_ITEMS:
        # Skip saving new items unless explicitly allowed
        # Try to return existing id if present; otherwise, return empty string
        name = item.get("name")
        if name:
            existing = items_col.find_one({"name": {"$regex": f"^\\s*{re.escape(name)}\\s*$", "$options": "i"}})
            if existing:
                return str(existing.get("_id"))
        return ""
    name = item.get("name")
    if not name:
        raise RuntimeError("Cannot save item without a name")

    # Check if exists (case-insensitive exact)
    existing = items_col.find_one({"name": {"$regex": f"^\\s*{re.escape(name)}\\s*$", "$options": "i"}})
    if existing:
        return str(existing.get("_id"))

    # Map ingredients -> include ObjectId when resolvable
    ing_docs = []
    for ing in item.get("ingredients", []) or []:
        ing_name = ing.get("name")
        oid = resolve_ingredient_object_id(ingredients_col, ing_name)
        ing_docs.append({
            "ingredient": oid,  # may be None in Mongo, OK
            "name": ing_name,
            "quantity": float(ing.get("quantity") or 0.0),
            "unit": ing.get("unit") or "unit",
        })

    doc = {
        "name": name,
        "description": item.get("description") or "",
        "instructions": item.get("instructions") or "",
        "price": float(item.get("price") or 0.0),
        "category": item.get("category") or guess_category(name),
        "ingredients": ing_docs,
        "isAvailable": bool(item.get("isAvailable", True)),
        "soldCount": int(item.get("soldCount", 0)),
        "steps": [str(s) for s in (item.get("steps") or [])],
    }

    res = items_col.insert_one(doc)
    return str(res.inserted_id)

# ---------------- Helpers ----------------

def log(*a):
    if DEBUG:
        print("[assistant]", *a, file=sys.stderr)

def normalize_name(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip()).lower()

def normalize_title_for_match(s: str) -> str:
    return re.sub(r"[\s\-]+", "", (s or "").strip().lower())

def guess_category(name: str) -> str:
    n = name.lower()
    for pat, cat in CATEGORY_GUESS:
        if re.search(pat, n):
            return cat
    return "plate"

# ---------------- DuckDuckGo + Gemini ----------------

def ddg_search_snippets(query: str, max_results=8):
    results = []
    if not DDGS: return results
    try:
        with DDGS() as ddgs:
            # Search for recipe-specific content
            search_queries = [
                f"{query} recipe ingredients steps how to make",
                f"{query} cooking instructions ingredients list",
                f"{query} preparation method ingredients quantities"
            ]
            
            for search_query in search_queries:
                for r in ddgs.text(search_query, max_results=max_results//2, region="wt-wt"):
                    # Filter for recipe-related content
                    title = r.get("title") or ""
                    snippet = r.get("body") or r.get("snippet") or ""
                    
                    # Only include results that seem recipe-related
                    if any(keyword in title.lower() or keyword in snippet.lower() 
                           for keyword in ["recipe", "ingredients", "instructions", "steps", "how to", "preparation"]):
                        results.append({
                            "title": title,
                            "href": r.get("href") or "",
                            "snippet": snippet,
                        })
                        
                        # Avoid duplicates
                        if len(results) >= max_results:
                            break
                if len(results) >= max_results:
                    break
                    
    except Exception as e:
        log("DDG error", e)
    return results


def init_gemini():
    if not genai or not GOOGLE_API_KEY:
        return None
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        return genai.GenerativeModel("gemini-1.5-pro")
    except Exception:
        try:
            return genai.GenerativeModel("gemini-1.5-flash")
        except Exception:
            return None

GEMINI_SYSTEM = (
    "You are a restaurant helper. You help restaurant workers with specific, detailed questions about "
    "food, drinks, and ingredients. Provide EXACT quantities and SPECIFIC ingredients. "
    "Use precise measurements and real ingredient names. For example, say '2 cloves garlic' "
    "instead of 'garlic', say '1 cup all-purpose flour' instead of 'flour', say '1/2 teaspoon salt' "
    "instead of 'salt'. Provide detailed, step-by-step instructions that are easy to follow. "
    "Always include cooking times, temperatures, and specific techniques. Make sure all "
    "ingredients have exact quantities and appropriate units (g, kg, l, piece, unit). "
    "Format your response clearly with Ingredients section first, then Preparation Steps, "
    "and finally Inventory Status. Do not use emojis in your response."
)

# ---------------- Recipe synthesis ----------------

def gemini_compose_recipe_from_web(model, dish: str, snippets):
    prompt = [
        {"role":"system","parts":[{"text":GEMINI_SYSTEM}]},
        {"role":"user","parts":[{"text":f"Create a DETAILED and SPECIFIC recipe for '{dish}' based on the web search results.\n"
                                 "Use the following web snippets as references to create an accurate recipe.\n"
                                 "Return STRICT JSON with keys: name (string), category (string),"
                                 " instructions (string), steps (string[]), ingredients (array of objects"
                                 " with name (string), quantity (number), unit (string from: g, kg, l,"
                                 " piece, unit)).\n\n"
                                 "IMPORTANT REQUIREMENTS:\n"
                                 "- Use EXACT quantities from the web sources when available\n"
                                 "- Include SPECIFIC ingredient names (e.g., 'extra virgin olive oil' not just 'oil')\n"
                                 "- Provide detailed steps with cooking times and temperatures\n"
                                 "- Include 6-12 detailed steps with specific instructions\n"
                                 "- Use precise measurements (e.g., 2.5 g, 0.5 l, 3 pieces)\n"
                                 "- Make sure all ingredients have realistic quantities\n"
                                 "- If web sources don't provide exact amounts, use standard recipe quantities\n\n"
                                 f"Web snippets:\n{json.dumps(snippets)}"}]}
    ]
    resp = model.generate_content(prompt)
    return parse_gemini_json(resp.text, dish)

def gemini_compose_recipe_simple(model, dish: str):
    prompt = [
        {"role":"system","parts":[{"text":GEMINI_SYSTEM}]},
        {"role":"user","parts":[{"text":f"Create a DETAILED and SPECIFIC recipe for '{dish}'.\n"
                                 "Return STRICT JSON with keys: name (string), category (string),"
                                 " instructions (string), steps (string[]), ingredients (array of objects"
                                 " with name (string), quantity (number), unit (one of: g, kg, l, piece, unit)).\n\n"
                                 "IMPORTANT REQUIREMENTS:\n"
                                 "- Use EXACT quantities and SPECIFIC ingredient names\n"
                                 "- Include detailed steps with cooking times and temperatures\n"
                                 "- Provide 6-12 detailed steps with specific instructions\n"
                                 "- Use precise measurements (e.g., 2.5 g, 0.5 l, 3 pieces)\n"
                                 "- Make sure all ingredients have realistic quantities\n"
                                 "- Include cooking techniques and specific instructions"}]}
    ]
    resp = model.generate_content(prompt)
    return parse_gemini_json(resp.text, dish)

def parse_gemini_json(txt: str, dish: str):
    try:
        data = json.loads(txt)
    except Exception:
        # Try to find JSON block in the response
        m = re.search(r"\{[\s\S]*\}", txt)
        if m:
            try:
                data = json.loads(m.group(0))
            except Exception:
                data = {}
        else:
            data = {}
    
    if not isinstance(data, dict):
        log(f"Failed to parse JSON for {dish}, got: {txt[:200]}...")
        return {"name": dish, "category": guess_category(dish), "ingredients": [], "steps": []}

    clean_ings = []
    for ing in data.get("ingredients", []) or []:
        name = str(ing.get("name") or "").strip()
        if not name: continue
        try: 
            qty = float(ing.get("quantity",0))
        except: 
            qty = 0.0
        unit = (ing.get("unit") or "unit").strip()
        if unit not in {"g","kg","l","ml","piece","unit"}: 
            unit = "unit"
        clean_ings.append({"name": name, "quantity": qty, "unit": unit})

    steps = data.get("steps", []) or []
    if not steps and data.get("instructions"):
        # If no steps but instructions exist, split instructions into steps
        instructions = data.get("instructions", "")
        steps = [s.strip() for s in instructions.split('.') if s.strip()]

    return {
        "name": data.get("name", dish),
        "category": data.get("category", guess_category(dish)),
        "ingredients": clean_ings,
        "steps": [str(s) for s in steps]
    }

# ---------------- Inventory ----------------

def compare_with_inventory(recipe_ings, inventory_map):
    have_all, have_none, missing = True, True, []
    for ing in recipe_ings:
        n = normalize_name(ing.get("name",""))
        if not n: continue
        if n in inventory_map:
            have_none = False
        else:
            have_all = False
            missing.append(ing.get("name",""))
    status = "all" if have_all else ("none" if have_none else "some")
    return status, missing

def handle_inventory_question(query: str, inventory_map: Dict[str, Dict[str, Any]]) -> Optional[str]:
    """Handle questions like 'how much water do I have' or 'oil buckets'."""
    q = query.lower()
    
    # Only handle explicit inventory questions, not recipe requests
    if not any(phrase in q for phrase in ["how much", "how many", "buckets", "quantity", "stock", "inventory"]):
        return None

    # extract a candidate noun (very rough heuristic)
    m = re.search(r"how (?:much|many) ([a-zA-Z\s]+?) do i have|([a-zA-Z\s]+?) buckets|([a-zA-Z\s]+?) quantity", q)
    cand = None
    if m:
        for g in m.groups():
            if g:
                cand = g.strip()
                break
    if not cand:
        # fallback: look for known words like water, oil, sugar, flour...
        for k in ["water", "oil", "flour", "sugar", "salt", "coffee", "tea", "milk", "eggs"]:
            if k in q:
                cand = k
                break
    if not cand:
        return None

    # find best match in inventory map (contains/startswith)
    target = None
    for name in inventory_map.keys():
        if cand in name or name in cand:
            target = name
            break
    if not target:
        return f"I couldn't find '{cand}' in the inventory."

    doc = inventory_map[target]
    # Align with Mongoose schema: currentStock + unit
    qty = doc.get("currentStock")
    if qty is None:
        qty = doc.get("quantity")  # fallback if legacy field exists
    unit = (doc.get("unit") or "unit")
    return f"Inventory: {doc.get('name')} — {qty} {unit}."

# ---------------- Format answer ----------------

def create_basic_recipe(dish_name: str) -> Dict[str, Any]:
    """Create a minimal recipe structure when all else fails."""
    name = dish_name.strip() or "Dish"
    return {
        "name": name,
        "category": guess_category(name),
        "ingredients": [],
        "steps": []
    }

def build_final_answer(recipe, status_tuple):
    status, missing = status_tuple
    lines = []
    lines.append(f"**{recipe.get('name','Recipe')}**")
    lines.append(f"**Category:** {recipe.get('category','plate').title()}")

    lines.append("\n**Ingredients:**")
    for ing in recipe.get("ingredients",[]):
        lines.append(f"- {ing['quantity']} {ing['unit']} {ing['name']}")

    lines.append("\n**Preparation Steps:**")
    for i,s in enumerate(recipe.get("steps",[]),1):
        lines.append(f"{i}. {s}")

    lines.append("\n**Inventory Status:**")
    if status=="all":
        lines.append("All ingredients are available.")
    elif status=="none":
        lines.append("No ingredients available, reorder required.")
    else:
        lines.append(f"Some ingredients missing: {', '.join(missing)}. You should reorder.")

    return "\n".join(lines)

# ---------------- Main ----------------

def main(user_query: str) -> str:
    if not any(k in user_query.lower() for k in RESTAURANT_KEYWORDS):
        return "I only handle restaurant questions (recipes, ingredients, inventory)."

    # DB
    try:
        client = mongo(); client.admin.command('ping')
        ingredients_col, items_col = get_collections(client)
    except Exception:
        ingredients_col, items_col, client = None, None, None

    inventory_map = fetch_inventory_map(ingredients_col)
    model = init_gemini()

    # Pure inventory question?
    inv_reply = handle_inventory_question(user_query, inventory_map)
    if inv_reply:
        return inv_reply

    # Try to detect a dish/recipe name
    def find_dish_name_from_query(q: str) -> Optional[str]:
        ql = q.lower()
        # common patterns
        m = re.search(r"ingredients of ([a-zA-Z\s]+)", ql) or re.search(r"recipe for ([a-zA-Z\s]+)", ql)
        if m:
            return m.group(1).strip()
        # last resort: pick the last wordish phrase
        m = re.search(r"(?:make|prepare|cook|bake) ([a-zA-Z\s]+)$", ql)
        if m:
            return m.group(1).strip()
        return None

    dish = find_dish_name_from_query(user_query) or user_query.strip()

    # 1) If dish exists in database -> return it directly
    found = find_item_in_database(items_col, dish)
    if found:
        # Build a recipe object compatible with our structure
        recipe = {
            "name": found.get("name"),
            "category": found.get("category") or guess_category(found.get("name", "")),
            "instructions": found.get("instructions") or ("\n".join(found.get("steps") or [])),
            "steps": found.get("steps") or [],
            # MongoDB stores ingredients as objects with name, quantity, unit
            "ingredients": []
        }
        # Convert MongoDB ingredient docs to structured {name, quantity, unit}
        structured_ings = []
        for ing in found.get("ingredients", []) or []:
            if isinstance(ing, dict):
                nm = ing.get("name") or ing.get("ingredient") or ""
                structured_ings.append({
                    "name": nm,
                    "quantity": float(ing.get("quantity") or 0.0),
                    "unit": ing.get("unit") or "unit",
                })
            else:
                structured_ings.append({"name": str(ing), "quantity": 0.0, "unit": "unit"})
        recipe["ingredients"] = structured_ings

        # Add recipe ingredients to inventory
        add_ingredients_to_inventory(ingredients_col, recipe["ingredients"])

        status = compare_with_inventory(recipe["ingredients"], inventory_map)
        return build_final_answer(recipe, status)

    # 2) Not found in database -> Web search + Gemini synthesis
    ddg_snippets = ddg_search_snippets(dish)
    if model is not None:
        try:
            # First try to get recipe from web search
            if ddg_snippets:
                recipe = gemini_compose_recipe_from_web(model, dish, ddg_snippets)
            else:
                # If no web results, use Gemini's own knowledge
                recipe = gemini_compose_recipe_simple(model, dish)
        except Exception as e:
            log(f"Web search failed for {dish}: {e}")
            # If web search fails, use Gemini's own knowledge
            try:
                recipe = gemini_compose_recipe_simple(model, dish)
            except Exception as e2:
                log(f"Gemini simple recipe failed for {dish}: {e2}")
                # Last resort: return error message
                return f"Sorry, I couldn't generate a recipe for '{dish}'. Please try a different dish or check your internet connection."
    else:
        # No model available - return error message
        return f"Sorry, I couldn't generate a recipe for '{dish}'. The AI service is currently unavailable."

    # Always save new recipe to MongoDB and add ingredients to inventory
    try:
        item_id = save_item_to_mongo(items_col, ingredients_col, recipe)
        if item_id:
            log(f"Successfully saved recipe '{dish}' to database with ID: {item_id}")
        else:
            log(f"Recipe '{dish}' already exists in database or save was skipped")
    except Exception as _e:
        log("Mongo save item failed:", _e)

    # Add recipe ingredients to MongoDB
    add_ingredients_to_inventory(ingredients_col, recipe.get("ingredients", []))

    # Inventory check
    status = compare_with_inventory(recipe.get("ingredients", []), inventory_map)
    return build_final_answer(recipe, status)

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print("Please provide a user question as a single argument.")
            sys.exit(1)
        query = sys.argv[1].strip()
        reply = main(query)
        print(reply)
    except Exception as e:
        # Graceful fallback
        if DEBUG:
            traceback.print_exc()
        try:
            query = sys.argv[1].strip() if len(sys.argv) > 1 else "Dish"
        except Exception:
            query = "Dish"
        print(f"Sorry, I couldn't process your request for '{query}'. Please try again or ask about a different dish.")
        sys.exit(1)