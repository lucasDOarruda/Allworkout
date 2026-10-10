// 42 everyday foods with average values per serving (USDA FoodData Central; brands vary).
// diet: what the food is, for filtering — meat | fish | egg | dairy | plant
// swap: replacements to try, in order, when someone doesn't eat this food

export const FOOD_CATEGORIES = [
  ['protein', 'Protein'],
  ['legumes', 'Legumes'],
  ['carbs', 'Carbs'],
  ['veg', 'Veg'],
  ['fruit', 'Fruit'],
  ['dairy', 'Dairy & alternatives'],
  ['fats', 'Nuts, seeds & fats'],
]

// f(id, name, category, serving, kcal, protein, carbs, fat, fibre, diet, why, swap)
const f = (id, name, cat, serving, kcal, p, c, fat, fibre, diet, why, swap = []) => ({ id, name, cat, serving, kcal, p, c, f: fat, fibre, diet, why, swap })

export const FOODS = [
  // Protein
  f('chicken', 'Chicken breast', 'protein', '120 g cooked', 198, 37, 0, 4.3, 0, 'meat', 'Lean, high protein', ['tuna', 'tofu']),
  f('beef', 'Lean beef mince (5% fat)', 'protein', '120 g cooked', 197, 30, 0, 7.7, 0, 'meat', 'Iron, zinc and B12', ['salmon', 'tempeh']),
  f('salmon', 'Salmon', 'protein', '120 g cooked', 247, 26, 0, 14, 0, 'fish', 'Omega-3 fats', ['walnuts']),
  f('sardines', 'Sardines, canned', 'protein', '100 g', 208, 25, 0, 11, 0, 'fish', 'Omega-3, calcium from bones', ['chia']),
  f('tuna', 'Tuna in water', 'protein', '95 g drained', 110, 25, 0, 1, 0, 'fish', 'Very lean protein', ['tofu']),
  f('eggs', 'Eggs', 'protein', '2 large', 143, 12.6, 0.7, 9.5, 0, 'egg', 'Cheap, complete protein', ['tofu']),
  f('tofu', 'Firm tofu', 'protein', '150 g', 216, 25, 4, 13, 3.5, 'plant', 'Complete plant protein, calcium'),
  f('tempeh', 'Tempeh', 'protein', '100 g', 192, 20, 7.6, 11, 4, 'plant', 'Fermented soy, high protein'),
  f('edamame', 'Edamame', 'protein', '1 cup shelled', 188, 18, 14, 8, 8, 'plant', 'Protein plus fibre'),
  f('whey', 'Whey protein (optional)', 'protein', '1 scoop, 30 g', 120, 24, 3, 1.5, 0, 'dairy', 'Convenient top-up', ['edamame']),
  // Legumes
  f('lentils', 'Lentils', 'legumes', '1 cup cooked', 230, 18, 40, 0.8, 15.6, 'plant', 'Fibre, iron, folate'),
  f('chickpeas', 'Chickpeas', 'legumes', '1 cup cooked', 269, 14.5, 45, 4.2, 12.5, 'plant', 'Fibre and protein'),
  f('blackbeans', 'Black beans', 'legumes', '1 cup cooked', 227, 15, 41, 0.9, 15, 'plant', 'Very high fibre'),
  // Carbs
  f('oats', 'Rolled oats', 'carbs', '40 g dry', 156, 6.8, 26.5, 2.8, 4.2, 'plant', 'Slow carbs, beta-glucan'),
  f('whiterice', 'White rice', 'carbs', '1 cup cooked', 205, 4.3, 44.5, 0.4, 0.6, 'plant', 'Fast fuel around training'),
  f('brownrice', 'Brown rice', 'carbs', '1 cup cooked', 216, 5, 45, 1.8, 3.5, 'plant', 'Wholegrain'),
  f('quinoa', 'Quinoa', 'carbs', '1 cup cooked', 222, 8, 39, 3.6, 5.2, 'plant', 'Wholegrain with extra protein'),
  f('potato', 'Potato, with skin', 'carbs', '1 medium baked', 161, 4.3, 37, 0.2, 3.8, 'plant', 'Very filling per calorie'),
  f('sweetpotato', 'Sweet potato', 'carbs', '1 medium baked', 103, 2.3, 23.6, 0.2, 3.8, 'plant', 'Fibre and vitamin A'),
  f('bread', 'Wholegrain bread', 'carbs', '2 slices', 162, 8, 27.4, 2.2, 4, 'plant', 'Easy wholegrain'),
  f('pasta', 'Wholemeal pasta', 'carbs', '1 cup cooked', 174, 7.5, 37, 0.8, 6.3, 'plant', 'Wholegrain, filling'),
  // Veg
  f('broccoli', 'Broccoli', 'veg', '1 cup cooked', 55, 3.7, 11, 0.6, 5.1, 'plant', 'Fibre, vitamin C, folate'),
  f('spinach', 'Spinach', 'veg', '2 cups raw', 14, 1.7, 2.2, 0.2, 1.3, 'plant', 'Folate and leafy greens'),
  f('salad', 'Mixed salad leaves', 'veg', '2 cups', 15, 1, 3, 0.2, 1.5, 'plant', 'Volume for almost no calories'),
  f('carrots', 'Carrots', 'veg', '1 cup chopped', 52, 1.2, 12, 0.3, 3.6, 'plant', 'Crunchy, filling snack'),
  f('mixedveg', 'Frozen mixed veg', 'veg', '1 cup cooked', 118, 5.2, 24, 0.3, 8, 'plant', 'Cheap, quick, high fibre'),
  f('capsicum', 'Capsicum (bell pepper)', 'veg', '1 medium', 31, 1, 7, 0.4, 2.5, 'plant', 'Vitamin C'),
  // Fruit
  f('banana', 'Banana', 'fruit', '1 medium', 105, 1.3, 27, 0.4, 3.1, 'plant', 'Quick carbs before training'),
  f('apple', 'Apple', 'fruit', '1 medium', 95, 0.5, 25, 0.3, 4.4, 'plant', 'Filling, portable'),
  f('berries', 'Mixed berries', 'fruit', '1 cup', 84, 1.1, 21, 0.5, 3.6, 'plant', 'Polyphenols and fibre'),
  f('orange', 'Orange', 'fruit', '1 medium', 62, 1.2, 15.4, 0.2, 3.1, 'plant', 'Vitamin C helps iron uptake'),
  // Dairy & alternatives
  f('yoghurt', 'Greek yoghurt, plain', 'dairy', '170 g', 100, 17, 6, 0.7, 0, 'dairy', 'Protein and calcium', ['soymilk']),
  f('milk', 'Milk, reduced fat', 'dairy', '1 cup', 122, 8, 12, 4.8, 0, 'dairy', 'Calcium and protein', ['soymilk']),
  f('cottage', 'Cottage cheese, low fat', 'dairy', '½ cup', 81, 14, 3, 1.2, 0, 'dairy', 'Slow-digesting protein', ['soymilk']),
  f('cheese', 'Cheddar cheese', 'dairy', '30 g', 120, 7, 0.4, 10, 0, 'dairy', 'Calcium', ['almonds']),
  f('soymilk', 'Soy milk, fortified', 'dairy', '1 cup', 80, 7, 4, 4, 1, 'plant', 'Calcium and B12 added'),
  // Nuts, seeds & fats
  f('almonds', 'Almonds', 'fats', '30 g', 173, 6, 6, 15, 3.5, 'plant', 'Vitamin E, filling'),
  f('walnuts', 'Walnuts', 'fats', '30 g', 196, 4.6, 4.1, 19.6, 2, 'plant', 'Plant omega-3'),
  f('peanutbutter', 'Peanut butter', 'fats', '2 tbsp', 191, 7.1, 7.1, 16.4, 1.6, 'plant', 'Easy energy and protein'),
  f('oliveoil', 'Olive oil, extra virgin', 'fats', '1 tbsp', 119, 0, 0, 13.5, 0, 'plant', 'Mediterranean staple'),
  f('avocado', 'Avocado', 'fats', '½ fruit', 160, 2, 8.5, 14.7, 6.7, 'plant', 'Healthy fats plus fibre'),
  f('chia', 'Chia seeds', 'fats', '2 tbsp', 117, 4, 10, 7.4, 8.3, 'plant', 'Plant omega-3 and fibre'),
]

export const foodById = Object.fromEntries(FOODS.map((x) => [x.id, x]))

export const DIETS = [
  ['all', 'Everything'],
  ['pescatarian', 'Pescatarian'],
  ['vegetarian', 'Vegetarian'],
  ['vegan', 'Vegan'],
]
const EXCLUDE = { all: [], pescatarian: ['meat'], vegetarian: ['meat', 'fish'], vegan: ['meat', 'fish', 'egg', 'dairy'] }
export const allowed = (food, diet) => !EXCLUDE[diet].includes(food.diet)

// Starter days per focus: [food id, portions]
export const STARTERS = {
  muscle: [['oats', 1.5], ['milk', 1], ['banana', 1], ['chicken', 1.5], ['whiterice', 2], ['broccoli', 1], ['yoghurt', 1], ['berries', 1], ['salmon', 1], ['potato', 1.5], ['spinach', 1], ['eggs', 1], ['almonds', 1], ['oliveoil', 1]],
  lose: [['eggs', 1], ['oats', 1], ['berries', 1], ['chicken', 1], ['salad', 1], ['potato', 1], ['lentils', 1], ['broccoli', 1], ['carrots', 1], ['yoghurt', 1], ['apple', 1], ['tuna', 1], ['oliveoil', 0.5]],
  maintain: [['bread', 1], ['eggs', 1], ['milk', 1], ['chicken', 1], ['brownrice', 1], ['broccoli', 1], ['carrots', 1], ['salad', 1], ['apple', 1], ['banana', 1], ['cheese', 1], ['almonds', 1], ['oliveoil', 1]],
  longevity: [['oats', 1], ['berries', 1], ['walnuts', 1], ['salmon', 1], ['chickpeas', 1], ['pasta', 1], ['spinach', 1], ['capsicum', 1], ['mixedveg', 1], ['yoghurt', 1], ['orange', 1], ['lentils', 1], ['oliveoil', 2], ['avocado', 1]],
}
