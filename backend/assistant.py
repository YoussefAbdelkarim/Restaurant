#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
assistant.py — clean refactor

Purpose
-------
A single-purpose restaurant assistant that:
  1) Answers ONLY restaurant/menu/recipe/inventory questions.
  2) If a dish exists in MongoDB -> returns it directly (no web).
  3) If not, searches the web (DuckDuckGo) and composes a recipe via Gemini.
     Then saves the new item into MongoDB (items collection).
  4) Always checks the restaurant inventory (MongoDB 'ingredients' collection) and
     tells the user whether all/none/some ingredients are available.
  5) Uses Google Gemini as the final responder (structured prompt -> natural reply).
  6) Automatically adds recipe ingredients to MongoDB ingredients collection.

Environment
----------
  MONGO_URI          : MongoDB connection string (required)
  MONGO_DB           : Optional DB name (defaults to 'test')
  GOOGLE_API_KEY     : Gemini API key (required)
  ASSISTANT_DEBUG    : Optional ('1' to print debug to stderr)

Invocation
----------
  python assistant.py "<user question>"

Output
------
  Prints a single UTF-8 string reply (what the Express route returns to the user).

Dependencies
-----------
  pip install google-generativeai duckduckgo_search pymongo python-dotenv

Notes
-----
  • We intentionally avoid non-restaurant topics.
  • When saving to MongoDB we align with the Mongoose schema for items, but MongoDB
    itself won't enforce it; we try to resolve Ingredient ObjectIds by name.
  • Automatically adds missing ingredients to inventory when providing recipes.
  • Works directly with MongoDB database instead of JSON files.
"""

from __future__ import annotations
import os
import re
import sys
import json
import time
import html
import traceback
from typing import Dict, List, Any, Tuple, Optional

# Third-party
from pymongo import MongoClient
from bson import ObjectId

# Load environment from backend/.env and project root .env if present
try:
    from dotenv import load_dotenv
    _here = os.path.dirname(__file__)
    load_dotenv(os.path.join(_here, '.env'))
    load_dotenv(os.path.join(_here, '..', '.env'))
except Exception:
    pass

# DuckDuckGo search (dynamic import to avoid static lints when missing)
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

# --------- Config / Helpers ---------
DEBUG = os.environ.get("ASSISTANT_DEBUG", "0") == "1"
MONGO_URI = os.environ.get("MONGO_URI")
MONGO_DB = os.environ.get("MONGO_DB", "test")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
# Control side effects in DB
AUTO_ADD_INGREDIENTS = os.environ.get("ASSISTANT_AUTO_ADD_INGREDIENTS", "0") == "1"
AUTO_SAVE_ITEMS = os.environ.get("ASSISTANT_AUTO_SAVE_ITEMS", "0") == "1"

RESTAURANT_KEYWORDS = [
    "dish", "recipe", "ingredients", "prepare", "cook", "bake", "fry", "grill", "boil",
    "menu", "item", "burger", "pizza", "drink", "juice", "fries", "dessert", "pancakes",
    "sandwich", "plate", "cake", "spirits", "beverage", "order", "inventory", "stock",
    "how much", "how many", "buckets", "oil", "water", "sold", "most requested",
    "shake", "milk shake", "milkshake",
]

CATEGORY_GUESS = [
    (r"pizza", "pizza"),
    (r"burger|sandwich", "burger"),
    (r"fries|chips", "fries"),
    (r"juice|drink|beverage", "drink"),
    (r"cake|dessert|pancake", "dessert"),
]

# --------- I/O utilities ---------

def log(*args: Any) -> None:
    if DEBUG:
        print("[assistant]", *args, file=sys.stderr)


def find_item_in_database(items_col, dish: str) -> Optional[Dict[str, Any]]:
    """Find item in MongoDB items collection by name (case-insensitive)"""
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


# --------- MongoDB ---------

def mongo() -> MongoClient:
    if not MONGO_URI:
        raise RuntimeError("MONGO_URI missing in environment")
    return MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)


def get_collections(client: MongoClient):
    db = client[MONGO_DB]
    return db["ingredients"], db["items"]


def fetch_inventory_map(ingredients_col) -> Dict[str, Dict[str, Any]]:
    """Return a dict keyed by lowercased ingredient name.
    Expected Ingredient docs to have at least: name, quantity, unit
    """
    inv = {}
    for doc in ingredients_col.find({}):
        name = (doc.get("name") or "").strip().lower()
        if name:
            inv[name] = doc
    return inv


def resolve_ingredient_object_id(ingredients_col, name: str) -> Optional[ObjectId]:
    if not name:
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


# --------- Domain helpers ---------

def is_restaurant_related(query: str) -> bool:
    q = query.lower()
    return any(k in q for k in RESTAURANT_KEYWORDS)


def normalize_name(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip()).lower()


def normalize_title_for_match(s: str) -> str:
    """Normalize names for fuzzy equality: lowercase and remove spaces/hyphens."""
    return re.sub(r"[\s\-]+", "", (s or "").strip().lower())


def guess_category(name: str) -> str:
    n = name.lower()
    for pat, cat in CATEGORY_GUESS:
        if re.search(pat, n):
            return cat
    return "plate"  # default


# --------- DuckDuckGo + Gemini recipe synthesis ---------

def ddg_search_snippets(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Return list of {title, href, snippet}."""
    results: List[Dict[str, str]] = []
    if DDGS is None:
        return results
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results, region="wt-wt"):
                results.append({
                    "title": r.get("title") or "",
                    "href": r.get("href") or "",
                    "snippet": r.get("body") or r.get("snippet") or "",
                })
    except Exception as e:
        log("DDG search error:", e)
    return results


def init_gemini():
    try:
        if genai is None:
            return None
        if not GOOGLE_API_KEY:
            return None
        getattr(genai, 'configure')(api_key=GOOGLE_API_KEY)
        GenModel = getattr(genai, 'GenerativeModel', None)
        if GenModel is None:
            return None
        return GenModel("gemini-1.5-pro")
    except Exception:
        return None


GEMINI_SYSTEM = (
    "You are a restaurant helper. You help restaurant workers with simple questions about "
    "food, drinks, and ingredients. Use VERY SIMPLE words that any worker can understand. "
    "Do NOT use fancy cooking terms or complicated ingredient names. For example, say "
    "'ice cream' instead of 'vanilla extract', say 'mix' instead of 'blend', say 'cup' "
    "instead of 'ml'. Keep recipes very simple with basic ingredients that a normal "
    "restaurant would have. Make steps short and easy to follow. Always tell if the "
    "restaurant has the ingredients or what is missing."
)


def gemini_compose_recipe_from_web(model, dish_name: str, web_snippets: List[Dict[str, str]]) -> Dict[str, Any]:
    """Ask Gemini to synthesize a clean recipe JSON from the web snippets.
    Returns { name, category, instructions, steps, ingredients:[{name, quantity, unit}] }
    """
    prompt = {
        "role": "user",
        "parts": [
            {
                "text": (
                    f"Synthesize a reliable recipe for '{dish_name}'.\n"
                    "Use the following web snippets (titles, snippets, URLs) as references.\n"
                    "Return STRICT JSON with keys: name (string), category (string),"
                    " instructions (string), steps (string[]), ingredients (array of objects"
                    " with name (string), quantity (number), unit (string from: g, kg, l,"
                    " piece, unit)). If you don't know exact quantities from the snippets,"
                    " infer common standard amounts. Keep steps short, 4-10 items."
                )
            },
            {"text": json.dumps(web_snippets, ensure_ascii=False)}
        ]
    }
    
    try:
        resp = model.generate_content([
            {"role": "system", "parts": [{"text": GEMINI_SYSTEM}]},
            prompt,
        ])
        # Extract JSON payload from response text
        text = (resp.text or "").strip()
        # Try plain JSON first
        data = None
        try:
            data = json.loads(text)
        except Exception:
            # Try to find a JSON block
            m = re.search(r"\{[\s\S]*\}$", text)
            if m:
                try:
                    data = json.loads(m.group(0))
                except Exception:
                    pass
        if not isinstance(data, dict):
            raise RuntimeError("Gemini did not return valid JSON for recipe synthesis")

        # Normalize fields
        data.setdefault("name", dish_name)
        data.setdefault("category", guess_category(dish_name))
        data.setdefault("instructions", "")
        data.setdefault("steps", [])
        data.setdefault("ingredients", [])

        # Coerce ingredients
        clean_ings = []
        for ing in data.get("ingredients", []) or []:
            name = str(ing.get("name") or "").strip()
            if not name:
                continue
            qty = ing.get("quantity")
            try:
                qty = float(qty) if qty is not None else 0.0
            except Exception:
                qty = 0.0
            unit = (ing.get("unit") or "unit").strip()
            if unit not in {"g", "kg", "l", "piece", "unit"}:
                unit = "unit"
            clean_ings.append({"name": name, "quantity": qty, "unit": unit})
        data["ingredients"] = clean_ings
        return data
    except Exception:
        # If Gemini fails, return fallback
        raise RuntimeError("Failed to generate recipe from web snippets")


# --------- Inventory cross-check ---------

def compare_with_inventory(recipe_ings: List[Dict[str, Any]], inventory_map: Dict[str, Dict[str, Any]]):
    have_all = True
    have_none = True
    missing: List[str] = []

    for ing in recipe_ings:
        n = normalize_name(ing.get("name", ""))
        if not n:
            continue
        if n in inventory_map:
            have_none = False
        else:
            have_all = False
            missing.append(str(ing.get("name") or "").strip())
    status = (
        "all" if have_all else
        ("none" if have_none else "some")
    )
    return status, missing


# --------- Persistence to DB ---------

def save_item_to_mongo(items_col, ingredients_col, item: Dict[str, Any]) -> str:
    """Save item into MongoDB 'items' collection following the Mongoose schema shape.
    Returns inserted _id as string (or existing id if upserted).
    """
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


# --------- High-level flow ---------

def make_fallback_recipe(dish_name: str) -> Dict[str, Any]:
    name = dish_name.strip() or "Dish"
    cat = guess_category(name)
    # Minimal defaults
    ingredients = [
        {"name": "Main ingredient", "quantity": 1.0, "unit": "unit"},
        {"name": "Seasoning", "quantity": 1.0, "unit": "unit"},
        {"name": "Garnish", "quantity": 1.0, "unit": "unit"},
    ]
    steps = [
        "Prepare ingredients",
        "Cook appropriately",
        "Assemble and plate",
        "Serve",
    ]
    return {
        "name": name,
        "category": cat,
        "ingredients": ingredients,
        "steps": steps,
        "instructions": "\n".join(steps),
    }


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


def build_final_answer_with_gemini(model, user_query: str, recipe: Optional[Dict[str, Any]], inv_status: Tuple[str, List[str]], db_summary: Dict[str, Any]) -> str:
    status, missing = inv_status
    context_parts = []

    if recipe:
        context_parts.append({
            "recipe": {
                "name": recipe.get("name"),
                "category": recipe.get("category"),
                "ingredients": recipe.get("ingredients", []),
                "steps": recipe.get("steps", []),
                "instructions": recipe.get("instructions", "")
            }
        })

    context_parts.append({
        "inventory_check": {
            "status": status,
            "missing": missing,
        }
    })

    context_parts.append({"db_summary": db_summary})

    # If model unavailable, produce a plain formatted answer
    if model is None:
        lines_fallback: List[str] = []
        if recipe:
            lines_fallback.append(f"**{recipe.get('name', 'Recipe').title()}**")
            lines_fallback.append("\n**Ingredients:**")
            for ing in recipe.get('ingredients', []) or []:
                nm = str(ing.get('name') or '').strip()
                qty = ing.get('quantity')
                try:
                    qty = float(qty) if qty is not None else 0.0
                except Exception:
                    qty = 0.0
                unit = str(ing.get('unit') or 'unit')
                lines_fallback.append(f"- {qty} {unit} {nm}")
            steps = recipe.get('steps') or []
            if steps:
                lines_fallback.append("\n**Steps:**")
                for i, s in enumerate(steps, 1):
                    lines_fallback.append(f"{i}. {s}")
            instr = str(recipe.get('instructions') or '').strip()
            if instr and not steps:
                lines_fallback.append("\n**Instructions:**")
                lines_fallback.append(instr)
        lines_fallback.append("\n**Inventory status:**")
        if status == 'all':
            lines_fallback.append("All ingredients available.")
        elif status == 'none':
            lines_fallback.append("No required ingredients are currently in stock.")
        else:
            lines_fallback.append("Missing: " + ", ".join(missing))
        return "\n".join(lines_fallback)

    try:
        resp = model.generate_content([
            {"role": "system", "parts": [{"text": GEMINI_SYSTEM}]},
            {"role": "user", "parts": [
                {"text": f"User question: {user_query}"},
                {"text": "Context:"},
                {"text": json.dumps(context_parts, ensure_ascii=False)}
            ]}
        ])
        return (resp.text or "").strip()
    except Exception:
        # Graceful fallback: return the plain formatted answer
        lines: List[str] = []
        if recipe:
            lines.append(f"**{recipe.get('name', 'Recipe').title()}**")
            lines.append("\n**Ingredients:**")
            for ing in recipe.get('ingredients', []) or []:
                nm = str(ing.get('name') or '').strip()
                qty = ing.get('quantity')
                try:
                    qty = float(qty) if qty is not None else 0.0
                except Exception:
                    qty = 0.0
                unit = str(ing.get('unit') or 'unit')
                lines.append(f"- {qty} {unit} {nm}")
            steps = recipe.get('steps') or []
            if steps:
                lines.append("\n**Steps:**")
                for i, s in enumerate(steps, 1):
                    lines.append(f"{i}. {s}")
            instr = str(recipe.get('instructions') or '').strip()
            if instr and not steps:
                lines.append("\n**Instructions:**")
                lines.append(instr)
        lines.append("\n**Inventory status:**")
        if status == 'all':
            lines.append("All ingredients available.")
        elif status == 'none':
            lines.append("No required ingredients are currently in stock.")
        else:
            lines.append("Missing: " + ", ".join(missing))
        return "\n".join(lines)


def summarize_db_state(items_col) -> Dict[str, Any]:
    try:
        total_items = items_col.count_documents({})
        top = items_col.find({}).sort("soldCount", -1).limit(5)
        top_names = [d.get("name") for d in top]
        return {"total_items": total_items, "top_sold": top_names}
    except Exception:
        return {"total_items": None, "top_sold": []}


def main(user_query: str) -> str:
    if not is_restaurant_related(user_query):
        return (
            "I can help only with restaurant topics: menu items, recipes, ingredients, "
            "inventory quantities, or popular dishes. Try asking about a dish, how to "
            "prepare it, or what we have in stock."
        )

    # Init services
    # Connect to DB first to fail fast if misconfigured
    client = mongo()
    # Force a ping to verify connectivity
    try:
        client.admin.command('ping')
    except Exception as e:
        raise RuntimeError(f"MongoDB connection failed: {e}")

    ingredients_col, items_col = get_collections(client)
    model = init_gemini()
    inventory_map = fetch_inventory_map(ingredients_col)

    # Pure inventory question?
    inv_reply = handle_inventory_question(user_query, inventory_map)
    if inv_reply:
        # Edge case: still let Gemini stylize the response
        return build_final_answer_with_gemini(
            model,
            user_query,
            None,
            ("n/a", []),
            summarize_db_state(items_col)
        ) + f"\n\n{inv_reply}"

    # Try to detect a dish/recipe name (heuristic: look for 'for <dish>' / 'of <dish>' / trailing subject)
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

        # Add recipe ingredients to inventory.json and MongoDB
        add_ingredients_to_inventory(ingredients_col, recipe["ingredients"])

        status = compare_with_inventory(recipe["ingredients"], inventory_map)
        return build_final_answer_with_gemini(
            model,
            user_query,
            recipe,
            status,
            summarize_db_state(items_col)
        )

    # 2) Not found in database -> Web search + Gemini synthesis (or fallback)
    ddg_snippets = ddg_search_snippets(f"{dish} recipe ingredients steps") or []
    if model is not None:
        try:
            recipe = gemini_compose_recipe_from_web(model, dish, ddg_snippets)
        except Exception:
            recipe = make_fallback_recipe(dish)
    else:
        recipe = make_fallback_recipe(dish)

    # Save to MongoDB (best-effort)
    try:
        save_item_to_mongo(items_col, ingredients_col, recipe)
    except Exception as _e:
        log("Mongo save item failed:", _e)

    # Add recipe ingredients to MongoDB
    add_ingredients_to_inventory(ingredients_col, recipe.get("ingredients", []))

    # Inventory check
    status = compare_with_inventory(recipe.get("ingredients", []), inventory_map)

    # Final answer via Gemini
    return build_final_answer_with_gemini(
        model,
        user_query,
        recipe,
        status,
        summarize_db_state(items_col)
    )


if __name__ == "__main__":
    try:
        # Default: treat argument as a user question
        if len(sys.argv) < 2:
            print("Please provide a user question as a single argument.")
            sys.exit(1)
        query = sys.argv[1].strip()
        reply = main(query)
        print(reply)
    except Exception as e:
        if DEBUG:
            traceback.print_exc()
        print("Sorry, something went wrong while generating the answer.")
        sys.exit(0)