export const MENU = {
    espressoBar: {
      name: "Espresso Bar",
      items: {
        espresso: { name: "Espresso", price: 3.50, sizes: ["single", "double"], defaultSize: "double" },
        americano: { name: "Americano", price: 4.00, sizes: ["small", "medium", "large"], defaultSize: "medium" },
        latte: { name: "Latte", price: 5.50, sizes: ["small", "medium", "large"], defaultSize: "medium" },
        cappuccino: { name: "Cappuccino", price: 5.00, sizes: ["small", "medium", "large"], defaultSize: "medium" },
        macchiato: { name: "Macchiato", price: 5.50, sizes: ["small", "medium", "large"], defaultSize: "medium" },
        flatWhite: { name: "Flat White", price: 5.50, sizes: ["small", "medium"], defaultSize: "small" },
        mocha: { name: "Mocha", price: 6.00, sizes: ["small", "medium", "large"], defaultSize: "medium" },
      }
    },
    coldDrinks: {
      name: "Cold Drinks",
      items: {
        icedLatte: { name: "Iced Latte", price: 6.00, sizes: ["medium", "large"], defaultSize: "medium" },
        icedAmericano: { name: "Iced Americano", price: 4.50, sizes: ["medium", "large"], defaultSize: "medium" },
        coldBrew: { name: "Cold Brew", price: 5.50, sizes: ["medium", "large"], defaultSize: "medium" },
        frappuccino: { name: "Frappuccino", price: 7.00, sizes: ["medium", "large"], defaultSize: "medium", coldOnly: true },
        icedMatcha: { name: "Iced Matcha Latte", price: 6.50, sizes: ["medium", "large"], defaultSize: "medium" },
      }
    },
    hotDrinks: {
      name: "Hot Drinks",
      items: {
        hotMatcha: { name: "Hot Matcha Latte", price: 6.00, sizes: ["small", "medium", "large"], defaultSize: "medium" },
        hotChocolate: { name: "Hot Chocolate", price: 5.50, sizes: ["small", "medium", "large"], defaultSize: "medium" },
        chaiLatte: { name: "Chai Latte", price: 5.50, sizes: ["small", "medium", "large"], defaultSize: "medium" },
        tea: { name: "Tea", price: 3.50, sizes: ["small", "medium", "large"], defaultSize: "medium" },
      }
    },
    food: {
      name: "Food",
      items: {
        croissant: { name: "Croissant", price: 4.00 },
        avocadoToast: { name: "Avocado Toast", price: 12.00 },
        bagel: { name: "Bagel with Cream Cheese", price: 5.00 },
        blueberryMuffin: { name: "Blueberry Muffin", price: 3.50 },
        bananaBread: { name: "Banana Bread", price: 4.00 },
      }
    }
  }
  
  export const MILK_OPTIONS = [
    "whole milk", "skim milk", "oat milk", "almond milk", "soy milk", "coconut milk"
  ]
  
  export const ORDERING_RULES = `
  MENU RULES AND GUARDRAILS:
  
  1. TEMPERATURE RULES:
     - Frappuccinos are ALWAYS cold/blended. Never make them hot.
     - Cold brew is ALWAYS cold. Never make it hot.
     - Iced drinks (Iced Latte, Iced Americano, Iced Matcha) are ALWAYS cold.
     - Hot drinks (Hot Matcha, Hot Chocolate, Chai Latte, Tea) are ALWAYS hot.
     - Espresso bar drinks (Latte, Cappuccino, Americano, etc.) can be made hot or iced if requested.
  
  2. ESPRESSO SHOT RULES:
     - Maximum 4 espresso shots in any drink. Reject requests for more.
     - A "latte with no espresso" is just plain milk - reject this politely.
     - A "cappuccino with no espresso" is just foamed milk - reject this politely.
  
  3. SIZE RULES:
     - Espresso only comes in single or double. No large/medium espresso.
     - Flat white only comes in small or medium.
     - Food items have no size options.
  
  4. MODIFICATION RULES:
     - Always ask about milk preference for espresso-based drinks if not specified.
     - Always ask about hot or iced for espresso bar drinks if not specified.
     - Sweetness levels: none, light, regular, extra.
     - Ice levels: no ice, light ice, regular ice, extra ice.
  
  5. IMPOSSIBLE REQUESTS:
     - Reject requests for items not on the menu politely.
     - Reject requests that make no sense (e.g. "hot frappuccino", "latte with no milk and no espresso").
     - Maximum order size is 10 items. Reject larger orders politely.
  
  6. PRICING:
     - Oat milk, almond milk, coconut milk add $0.75 to the drink price.
     - Extra espresso shot adds $1.00 per shot.
     - Always confirm the total before finalizing the order.
  `