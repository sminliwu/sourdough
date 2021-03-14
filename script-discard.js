// sourdough discard applet
var volumeUnits = [
  "cup",
  "tbsp", // 16 tbsp = 1 cup
  "tsp",  // 3 tsp = 1 tbsp
  "pinch", // anything less than 0.5 tsp
  "to taste",
  "discrete",
  "part"
];

var convertibleUnits = "cup tbsp tsp";

var conversionTable = [];
conversionTable["cup"] = [];
conversionTable["cup"]["tbsp"] = 16;
conversionTable["cup"]["tsp"] = 48;
conversionTable["tbsp"] = [];
conversionTable["tbsp"]["cup"] = 0.0625;
conversionTable["tbsp"]["tsp"] = 3;
conversionTable["tsp"] = [];
conversionTable["tsp"]["cup"] = 0.021;
conversionTable["tsp"]["tbsp"] = 0.33;

class Amount {
  num;
  unit;
  
  constructor(num, unit) {
    this.num = num; // number
    this.unit = unit; // string
  }
  
  // convert from current unit to a new unit, return a new Amount
  convert(unit) {
    if (this.unit == unit) {
      return this;
    } else if (convertibleUnits.search(this.unit) >= 0 && convertibleUnits.search(unit) >= 0) {    
      var newNum = this.num * conversionTable[this.unit][unit];
      //console.log("converted from", this.num, this.unit, "to", newNum, unit);
      return new Amount(newNum, unit);
    } else {
      return this; // invalid conversion, nothing changes
    }
    
  }
  
  getRatioTo(x) {
    if (this.unit == x.unit) {
      return x.num/this.num;
    } else {
      return this.getRatioTo(x.convert(this.unit));
    }
  }
  
  scale(ratio) {
    return new Amount(this.num*ratio, this.unit);
  }
  
  autoConvert() {
    if (this.num < 0.5 && this.unit == "tsp") {
      return new Amount(1, "pinch");
    } else if (this.num < 0.7 && this.unit == "tbsp") {
      return this.convert("tsp").autoConvert();
    } else if (this.num < 0.25 && this.unit == "cup") {
      return this.convert("tbsp").autoConvert();
    } else {
      return this;
    }
  }
  
  scaleConvert(ratio, unit) {
    var result = this.convert(unit).scale(ratio);
    if (unit == "auto") {
      return result.autoConvert();
    } else { return result; }
  }
  
  toHTML() {
    if (this.unit == "to taste") {
      return '';
    } else if (this.unit == "pinch") {
      return "a pinch of";
    } else if (this.unit == "g") {
      return this.num + ' ' + this.unit;
    }
    
    var displayNum = this.num;
    var remainder = '';
    if ((this.num - Math.floor(this.num)) != 0) {
      if (this.num > 1) {
        displayNum = Math.floor(this.num);
        remainder = this.num - displayNum;
        displayNum += ' ';
      } else {
        displayNum = '';
        remainder = this.num.toFixed(2);
//        console.log("less than 1, ", remainder);
      }
      
      if (remainder > 0.85) {
        // round up to whole
        if (displayNum == '') {
          displayNum = 1;
        } else {
          displayNum++;
        }
        remainder = '';
      } else if (remainder >= 0.75) { remainder = "3/4";}
      else if (remainder > 0.6) { remainder = "2/3";}
      else if (remainder > 0.45) { remainder = "1/2";}
      else if (remainder > 0.3) { remainder = "1/3";}
      else if (remainder > 0.2) {
          remainder = "1/4";
//          console.log("quarter 1/4 case");
      } else if (remainder > 0.1) { remainder = "1/8";
      } else { remainder = ''; }
    }
      
    displayNum = displayNum.toString() + remainder;
  
    if (displayNum[0] != '1' && (this.unit == "cup" || this.unit == "part")) {
      return displayNum + ' ' + this.unit + "s";
    } else if (this.unit == "discrete") {
      return displayNum;
    } else { return displayNum + ' ' + this.unit; }
  }
}

class Ingredient {
  id;
  amount; // amounts in volume?
  
  constructor(id, num, unit) {
    this.id = id;
    this.amount = new Amount(num, unit);
  }
  
  scaleConvert(ratio, unit) {
    //console.log("converting", this.id);
    var newAmount = this.amount.scaleConvert(ratio, unit);
    return new Ingredient(this.id, newAmount.num, newAmount.unit);
  }
  
  toHTML() {
    if (this.amount.unit == "to taste") {
      return this.id + ' ' + this.amount.unit;
    }
    
    var amountHTML = this.amount.toHTML();
    if (this.amount.unit == "discrete" && (this.amount.num > 1 || this.amount.num == 0)) {
      return amountHTML + ' ' + this.id + 's';
    } else {
      return amountHTML + ' ' + this.id;
    }
  }
}

class Recipe {
  id;
  source;
  starterAmount;
  ingredients = [];
  
  constructor(id, starterAmount, ingredients, source = "") {
    this.id = id;
    this.source = source;
    this.starterAmount = starterAmount;
    this.ingredients = ingredients;
  }
  
  static fromObject(obj) {
    return new Recipe(obj.id, obj.starterAmount, obj.ingredients, obj.source);
  }
  
  setStarterAmt(amount) {
    this.starterAmount = amount;
  }
  
  scaleConvert(ratio, unit) {
    // return a new Recipe appropriately scaled
    //var newStarterAmt = this.starterAmount.scaleConvert(ratio, unit);
    var newIngredients = []
    for (var i=0; i < this.ingredients.length; i++) {
      newIngredients.push(this.ingredients[i].scaleConvert(ratio, unit));
    }
    return new Recipe(this.id, this.starterAmount, newIngredients, this.source);
  }
  
  toHTML() {
    var title = "<h2><a href ='" + this.source+ "'>Sourdough "+this.id+"</a></h2>";
    var rows = [];
    rows[0] = "<th>" + this.starterAmount.toHTML() + " sourdough starter</th>";
    for (var i=0; i < this.ingredients.length; i++) {
      var newRow = "<tr><td>"+ this.ingredients[i].toHTML() + "</td></tr>";
      rows[i+1] = newRow;
    }
    return title + "<table>" + rows.join('') + "</table>";
  }
}

var feeding = {
  id: "Starter Feeding",
  starterAmount: new Amount(0.5, "cup"),
  ingredients: [
    new Ingredient("flour", 1, "cup"),
    new Ingredient("water", 0.5, "cup")
  ],
  source: "https://www.kingarthurbaking.com/recipes/feeding-and-maintaining-your-sourdough-starter-recipe"
}

var bread = {
  id: "Basic Loaf",
  starterAmount: new Amount(1, "cup"), // 1 cup = 227g
  ingredients: [
    new Ingredient("flour", 602, "g"),
    new Ingredient("water", 340, "g"),
    new Ingredient("salt", 2.5, "tsp")
  ],
  source: "https://www.kingarthurbaking.com/recipes/extra-tangy-sourdough-bread-recipe"
}

// source: https://thegingeredwhisk.com/sourdough-naan/
var naan = {
  id: "Naan",
  starterAmount: new Amount(1, "cup"),
  ingredients: [
    new Ingredient("milk", 0.5, "cup"),
    new Ingredient("yogurt", 0.25, "cup"),
    new Ingredient("flour", 2, "cup"),
    new Ingredient("baking powder", 1, "tsp"),
    new Ingredient("salt", 1, "pinch"),
    new Ingredient("butter", 5, "tbsp")
  ],
  source: "https://thegingeredwhisk.com/sourdough-naan/"
}

// source: https://dontwastethecrumbs.com/sourdough-pancakes/
var pancakes = {
  id: "Pancakes",
  starterAmount: new Amount(1.5, "cup"),
  ingredients: [
    new Ingredient("butter", 4, "tbsp"),
    new Ingredient("egg", 2, "discrete"),
    new Ingredient("milk", 1, "cup"),
    new Ingredient("vanilla extract", 1, "tsp"),
    new Ingredient("flour", 1.5, "cup"),
    new Ingredient("baking soda", 1, "tsp"),
    new Ingredient("baking powder", 1, "tsp"),
    new Ingredient("salt", 1, "tsp")
  ],
  source: "https://dontwastethecrumbs.com/sourdough-pancakes/"
}

// source: https://www.feastingathome.com/sourdough-biscuits/
var biscuits = {
  id: "Scallion Biscuits",
  starterAmount: new Amount(0.75, "cup"),
  ingredients: [
    new Ingredient("flour", 1.5, "cup"),
    new Ingredient("salt", 1, "tsp"),
    new Ingredient("baking powder", 2, "tsp"),
    new Ingredient("butter", 8, "tbsp"),
    new Ingredient("scallions", 0.5, "cup"),
    new Ingredient("sour cream/yogurt", 0.5, "cup")
  ],
  source: "https://www.feastingathome.com/sourdough-biscuits/"
}

var recipes = [];
recipes[pancakes.id] = Recipe.fromObject(pancakes);
recipes[naan.id] = Recipe.fromObject(naan);
recipes[biscuits.id] = Recipe.fromObject(biscuits);
recipes[feeding.id] = Recipe.fromObject(feeding);
recipes[bread.id] = Recipe.fromObject(bread);

$(document).ready(function() {
  // functions to load
  function loadRecipeList() {
    // for now, load recipes from a static JS list
    // TODO: eventually load from a JSON file or other data storage format for more extendability
    // TODO: let users input their own recipe and add to stored list
    for (var x in recipes) {
      $("#recipe-select").append(new Option(recipes[x].id, recipes[x].id));
    }
  }
  
  function scaleRecipe() {
    return selectedRecipe.starterAmount.getRatioTo(discardAmount);
    //console.log(ratio);
  }
    
  function displayRecipe(recipe) {
    $("#recipe").html(recipe.toHTML());
  }
  
  function updateDisplay() {
      var scaledRecipe = selectedRecipe.scaleConvert(scaleRecipe(), "auto");
      scaledRecipe.setStarterAmt(discardAmount); 
      displayRecipe(scaledRecipe); 
  }
  
  // init
  loadRecipeList();
  var discardAmount = new Amount($("#discard-amt").val(), $("#discard-unit").val()); // user-defined amount of discard sourdough starter available to use
  var selectedRecipe = recipes[$("#recipe-select").val()];
  
  console.log(recipes);
  updateDisplay();
  
  $("#recipe-select").selectmenu({
    change: function( event, data ) {
      //console.log("recipe selection changed to", data.item.value);
      selectedRecipe = recipes[data.item.value];
      updateDisplay();
    }
  });
  
  $("#discard-amt").change(function() {
    //console.log("discard amount changed");
    //console.log($("#discard-amt").val());
    discardAmount.num = parseFloat($("#discard-amt").val().toString());
    updateDisplay();
  })
  
  $("#discard-unit").change(function() {
    discardAmount = discardAmount.convert($("#discard-unit").val());
    console.log(discardAmount);
    $("#discard-amt").val(discardAmount.num.toString());
    updateDisplay();
  })
})