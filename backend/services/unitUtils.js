const UNIT_SYNONYMS = {
  g: ['g', 'gram', 'grams'],
  kg: ['kg', 'kilogram', 'kilograms'],
  l: ['l', 'liter', 'liters', 'litre', 'litres'],
  ml: ['ml', 'milliliter', 'millilitre', 'milliliters', 'millilitres'],
  piece: ['slice', 'slices', 'bag', 'bags', 'piece', 'pieces', 'pc', 'pcs', 'unit', 'units'],
};

function normalizeUnit(rawUnit) {
  const unit = String(rawUnit || '').trim().toLowerCase();
  if (!unit) return 'unit';
  for (const [canonical, synonyms] of Object.entries(UNIT_SYNONYMS)) {
    if (synonyms.includes(unit)) return canonical;
  }
  return 'unit';
}

function unitInfo(rawUnit) {
  const n = normalizeUnit(rawUnit);
  switch (n) {
    case 'g':
      return { base: 'g', factorToBase: 1 };
    case 'kg':
      return { base: 'g', factorToBase: 1000 };
    case 'ml':
      return { base: 'l', factorToBase: 0.001 };
    case 'l':
      return { base: 'l', factorToBase: 1 };
    case 'piece':
      return { base: 'piece', factorToBase: 1 };
    default:
      return { base: 'unit', factorToBase: 1 };
  }
}

function convertToIngredientUnit(requirementUnit, ingredientUnit, quantity) {
  const req = unitInfo(requirementUnit);
  const ing = unitInfo(ingredientUnit);
  if (req.base === ing.base) {
    return (quantity * req.factorToBase) / ing.factorToBase;
  }
  // Not convertible with our simple set; assume requirement already matches ingredient unit
  return quantity;
}

module.exports = {
  normalizeUnit,
  convertToIngredientUnit,
};


