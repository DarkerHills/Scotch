import type { Category } from "@/lib/types";

/**
 * Hand-authored seed catalog. Brand names are used as ordinary retail
 * product listings; all prices, costs, stock and supplier relationships are
 * fictional demo values.
 *
 * Tuple: [name, brand, category, size, unitCost, retailPrice, packSize, velocity/day, supplierKey]
 */
type Row = [string, string, Category, string, number, number, number, number, string | null];

export const CATALOG: Row[] = [
  // Whiskey
  ["Jameson Irish Whiskey", "Jameson", "Whiskey", "750 ml", 19.5, 29.99, 12, 2.0, "northwind"],
  ["Jameson Irish Whiskey", "Jameson", "Whiskey", "1.75 L", 38.0, 54.99, 6, 0.6, "northwind"],
  ["Maker's Mark Bourbon", "Maker's Mark", "Whiskey", "750 ml", 22.4, 34.99, 12, 1.4, "northwind"],
  ["Buffalo Trace Bourbon", "Buffalo Trace", "Whiskey", "750 ml", 19.8, 29.99, 12, 1.6, "northwind"],
  ["Woodford Reserve Bourbon", "Woodford Reserve", "Whiskey", "750 ml", 27.5, 42.99, 6, 0.9, "northwind"],
  ["Bulleit Bourbon", "Bulleit", "Whiskey", "750 ml", 21.9, 33.99, 12, 1.1, "northwind"],
  ["Jack Daniel's Old No. 7", "Jack Daniel's", "Whiskey", "750 ml", 18.9, 27.99, 12, 2.4, "northwind"],
  ["Jack Daniel's Old No. 7", "Jack Daniel's", "Whiskey", "1.75 L", 36.5, 49.99, 6, 0.8, "northwind"],
  ["Johnnie Walker Black Label", "Johnnie Walker", "Whiskey", "750 ml", 27.9, 41.99, 12, 1.0, "highland"],
  ["Glenfiddich 12 Year", "Glenfiddich", "Whiskey", "750 ml", 34.5, 52.99, 6, 0.5, "highland"],
  ["The Macallan 12 Double Cask", "The Macallan", "Whiskey", "750 ml", 49.0, 74.99, 6, 0.35, "highland"],
  ["Lagavulin 16 Year", "Lagavulin", "Whiskey", "750 ml", 66.0, 99.99, 6, 0.12, "highland"],
  ["Crown Royal Canadian", "Crown Royal", "Whiskey", "750 ml", 19.9, 29.99, 12, 1.3, "northwind"],
  ["Fireball Cinnamon Whisky", "Fireball", "Whiskey", "750 ml", 11.2, 17.99, 12, 2.2, "northwind"],
  ["Rittenhouse Straight Rye", "Rittenhouse", "Whiskey", "750 ml", 19.0, 28.99, 6, 0.4, "northwind"],
  ["Redbreast 12 Year", "Redbreast", "Whiskey", "750 ml", 46.0, 69.99, 6, 0.25, "highland"],
  ["Eagle Rare 10 Year", "Eagle Rare", "Whiskey", "750 ml", 26.0, 39.99, 6, 0.7, "northwind"],
  ["Monkey Shoulder Blended Malt", "Monkey Shoulder", "Whiskey", "750 ml", 23.5, 35.99, 6, 0.6, "highland"],
  // Vodka
  ["Tito's Handmade Vodka", "Tito's", "Vodka", "750 ml", 14.9, 22.99, 12, 3.6, "copperline"],
  ["Tito's Handmade Vodka", "Tito's", "Vodka", "1.75 L", 26.9, 38.99, 6, 1.8, "copperline"],
  ["Grey Goose Vodka", "Grey Goose", "Vodka", "750 ml", 22.5, 34.99, 6, 1.2, "copperline"],
  ["Absolut Vodka", "Absolut", "Vodka", "750 ml", 13.2, 19.99, 12, 1.4, "lakeshore"],
  ["Ketel One Vodka", "Ketel One", "Vodka", "750 ml", 17.9, 26.99, 12, 0.9, "copperline"],
  ["Smirnoff No. 21 Vodka", "Smirnoff", "Vodka", "750 ml", 9.8, 15.99, 12, 1.5, "lakeshore"],
  ["Belvedere Vodka", "Belvedere", "Vodka", "750 ml", 24.0, 36.99, 6, 0.5, "copperline"],
  ["Stolichnaya Vodka", "Stolichnaya", "Vodka", "750 ml", 13.5, 20.99, 12, 0.4, "lakeshore"],
  ["Deep Eddy Lemon Vodka", "Deep Eddy", "Vodka", "750 ml", 12.9, 19.99, 12, 0.6, "lakeshore"],
  ["New Amsterdam Vodka", "New Amsterdam", "Vodka", "1.75 L", 15.9, 23.99, 6, 0.7, "lakeshore"],
  ["Chopin Potato Vodka", "Chopin", "Vodka", "750 ml", 21.0, 32.99, 6, 0.15, "copperline"],
  // Gin
  ["Tanqueray London Dry Gin", "Tanqueray", "Gin", "750 ml", 17.5, 26.99, 12, 1.0, "copperline"],
  ["Hendrick's Gin", "Hendrick's", "Gin", "750 ml", 25.5, 38.99, 6, 0.9, "craft"],
  ["Bombay Sapphire Gin", "Bombay Sapphire", "Gin", "750 ml", 17.9, 26.99, 12, 0.9, "copperline"],
  ["Aviation American Gin", "Aviation", "Gin", "750 ml", 19.0, 29.99, 6, 0.4, "craft"],
  ["The Botanist Islay Dry Gin", "The Botanist", "Gin", "750 ml", 28.0, 42.99, 6, 0.25, "craft"],
  ["Beefeater London Dry Gin", "Beefeater", "Gin", "750 ml", 14.5, 21.99, 12, 0.6, "copperline"],
  ["Monkey 47 Schwarzwald Dry Gin", "Monkey 47", "Gin", "500 ml", 34.0, 52.99, 6, 0.12, "craft"],
  ["Roku Japanese Craft Gin", "Roku", "Gin", "750 ml", 20.5, 31.99, 6, 0.35, "craft"],
  // Rum
  ["Bacardí Superior White Rum", "Bacardí", "Rum", "750 ml", 10.9, 16.99, 12, 1.2, "lakeshore"],
  ["Captain Morgan Spiced Rum", "Captain Morgan", "Rum", "750 ml", 12.5, 18.99, 12, 1.3, "lakeshore"],
  ["Diplomático Reserva Exclusiva", "Diplomático", "Rum", "750 ml", 25.5, 38.99, 6, 0.4, "caribe"],
  ["Mount Gay Eclipse Rum", "Mount Gay", "Rum", "750 ml", 16.5, 24.99, 6, 0.3, "caribe"],
  ["Plantation 3 Stars Rum", "Plantation", "Rum", "750 ml", 15.0, 22.99, 6, 0.35, "caribe"],
  ["Kraken Black Spiced Rum", "Kraken", "Rum", "750 ml", 14.0, 21.99, 12, 0.7, "caribe"],
  ["Malibu Coconut Rum", "Malibu", "Rum", "750 ml", 12.0, 18.99, 12, 0.9, "lakeshore"],
  // Tequila & mezcal
  ["Casamigos Blanco Tequila", "Casamigos", "Tequila", "750 ml", 32.0, 49.99, 6, 1.5, "agave"],
  ["Don Julio Blanco Tequila", "Don Julio", "Tequila", "750 ml", 33.5, 51.99, 6, 1.2, "agave"],
  ["Patrón Silver Tequila", "Patrón", "Tequila", "750 ml", 31.0, 47.99, 6, 1.3, "agave"],
  ["Espolòn Blanco Tequila", "Espolòn", "Tequila", "750 ml", 17.5, 26.99, 6, 1.4, "agave"],
  ["Casamigos Reposado Tequila", "Casamigos", "Tequila", "750 ml", 35.0, 54.99, 6, 0.7, "agave"],
  ["Don Julio 1942 Añejo", "Don Julio", "Tequila", "750 ml", 112.0, 169.99, 6, 0.15, "agave"],
  ["Herradura Reposado Tequila", "Herradura", "Tequila", "750 ml", 30.0, 45.99, 6, 0.35, "agave"],
  ["Olmeca Altos Plata Tequila", "Olmeca Altos", "Tequila", "750 ml", 17.0, 25.99, 6, 0.6, "agave"],
  ["Del Maguey Vida Mezcal", "Del Maguey", "Tequila", "750 ml", 25.5, 38.99, 6, 0.3, "agave"],
  ["1800 Silver Tequila", "1800", "Tequila", "750 ml", 18.5, 28.99, 6, 0.5, "agave"],
  // Liqueur
  ["Aperol Aperitivo", "Aperol", "Liqueur", "750 ml", 17.9, 26.99, 6, 1.4, "metro"],
  ["Campari Bitter", "Campari", "Liqueur", "750 ml", 21.5, 32.99, 6, 0.6, "metro"],
  ["Baileys Original Irish Cream", "Baileys", "Liqueur", "750 ml", 18.5, 27.99, 12, 0.8, "northwind"],
  ["Kahlúa Coffee Liqueur", "Kahlúa", "Liqueur", "750 ml", 15.5, 23.99, 12, 0.5, "caribe"],
  ["Cointreau Orange Liqueur", "Cointreau", "Liqueur", "750 ml", 26.0, 39.99, 6, 0.5, "caribe"],
  ["St-Germain Elderflower", "St-Germain", "Liqueur", "750 ml", 25.0, 37.99, 6, 0.35, "metro"],
  ["Jägermeister", "Jägermeister", "Liqueur", "750 ml", 17.0, 25.99, 12, 0.9, "northwind"],
  ["Disaronno Amaretto", "Disaronno", "Liqueur", "750 ml", 20.5, 30.99, 6, 0.3, "metro"],
  ["Chambord Black Raspberry", "Chambord", "Liqueur", "750 ml", 23.0, 34.99, 6, 0.12, "metro"],
  // Red wine
  ["Josh Cellars Cabernet Sauvignon", "Josh Cellars", "Red wine", "750 ml", 9.5, 15.99, 12, 2.2, "harbor"],
  ["Meiomi Pinot Noir", "Meiomi", "Red wine", "750 ml", 13.9, 21.99, 12, 1.4, "harbor"],
  ["Caymus Napa Valley Cabernet", "Caymus", "Red wine", "750 ml", 58.0, 89.99, 6, 0.3, "goldengate"],
  ["The Prisoner Red Blend", "The Prisoner", "Red wine", "750 ml", 31.0, 47.99, 6, 0.5, "harbor"],
  ["19 Crimes Red Blend", "19 Crimes", "Red wine", "750 ml", 7.9, 12.99, 12, 1.6, "harbor"],
  ["Apothic Red Blend", "Apothic", "Red wine", "750 ml", 7.5, 11.99, 12, 1.1, "harbor"],
  ["La Crema Sonoma Coast Pinot Noir", "La Crema", "Red wine", "750 ml", 15.5, 24.99, 12, 0.6, "goldengate"],
  ["Catena Malbec", "Catena", "Red wine", "750 ml", 14.0, 21.99, 12, 0.7, "harbor"],
  ["Decoy Cabernet Sauvignon", "Decoy", "Red wine", "750 ml", 16.5, 25.99, 12, 0.5, "goldengate"],
  ["Bogle Old Vine Zinfandel", "Bogle", "Red wine", "750 ml", 8.9, 13.99, 12, 0.5, "harbor"],
  ["Chateau Ste. Michelle Merlot", "Chateau Ste. Michelle", "Red wine", "750 ml", 9.5, 14.99, 12, 0.3, "goldengate"],
  ["Ruffino Chianti Classico Riserva", "Ruffino", "Red wine", "750 ml", 19.0, 28.99, 12, 0.25, "harbor"],
  // White wine
  ["Kim Crawford Sauvignon Blanc", "Kim Crawford", "White wine", "750 ml", 11.5, 17.99, 12, 2.4, "harbor"],
  ["Santa Margherita Pinot Grigio", "Santa Margherita", "White wine", "750 ml", 15.5, 24.99, 12, 1.5, "harbor"],
  ["Kendall-Jackson Vintner's Reserve Chardonnay", "Kendall-Jackson", "White wine", "750 ml", 10.5, 16.99, 12, 1.3, "harbor"],
  ["Cloudy Bay Sauvignon Blanc", "Cloudy Bay", "White wine", "750 ml", 22.0, 33.99, 12, 0.4, "goldengate"],
  ["Whispering Angel Rosé", "Whispering Angel", "White wine", "750 ml", 15.9, 24.99, 12, 1.4, "harbor"],
  ["La Crema Sonoma Coast Chardonnay", "La Crema", "White wine", "750 ml", 14.0, 22.99, 12, 0.7, "goldengate"],
  ["Chateau Ste. Michelle Riesling", "Chateau Ste. Michelle", "White wine", "750 ml", 7.5, 11.99, 12, 0.5, "goldengate"],
  ["Rombauer Carneros Chardonnay", "Rombauer", "White wine", "750 ml", 27.0, 41.99, 6, 0.35, "goldengate"],
  ["Oyster Bay Sauvignon Blanc", "Oyster Bay", "White wine", "750 ml", 8.9, 13.99, 12, 0.7, "harbor"],
  // Sparkling
  ["Veuve Clicquot Yellow Label Brut", "Veuve Clicquot", "Sparkling", "750 ml", 41.0, 62.99, 6, 0.7, "maison"],
  ["Moët & Chandon Impérial Brut", "Moët & Chandon", "Sparkling", "750 ml", 39.0, 58.99, 6, 0.6, "maison"],
  ["La Marca Prosecco", "La Marca", "Sparkling", "750 ml", 10.5, 16.99, 12, 1.6, "harbor"],
  ["Chandon Brut", "Chandon", "Sparkling", "750 ml", 15.0, 22.99, 6, 0.5, "maison"],
  ["Mionetto Prosecco Brut", "Mionetto", "Sparkling", "750 ml", 9.0, 14.99, 12, 0.8, "harbor"],
  ["Dom Pérignon Vintage 2013", "Dom Pérignon", "Sparkling", "750 ml", 165.0, 249.99, 6, 0.06, "maison"],
  ["Freixenet Cordon Negro Brut", "Freixenet", "Sparkling", "750 ml", 7.5, 11.99, 12, 0.6, "maison"],
  // Beer & cider
  ["Modelo Especial", "Modelo", "Beer & cider", "12-pack · 12 oz cans", 13.2, 19.99, 2, 3.2, "ridgeline"],
  ["Corona Extra", "Corona", "Beer & cider", "12-pack · 12 oz bottles", 13.5, 19.99, 2, 2.6, "ridgeline"],
  ["Michelob Ultra", "Michelob", "Beer & cider", "12-pack · 12 oz cans", 12.9, 18.99, 2, 2.0, "ridgeline"],
  ["Stella Artois", "Stella Artois", "Beer & cider", "6-pack · 11.2 oz bottles", 7.2, 10.99, 4, 1.2, "ridgeline"],
  ["Guinness Draught", "Guinness", "Beer & cider", "4-pack · 14.9 oz cans", 6.9, 10.49, 6, 0.8, "ridgeline"],
  ["Lagunitas IPA", "Lagunitas", "Beer & cider", "6-pack · 12 oz bottles", 7.5, 11.49, 4, 0.9, "ridgeline"],
  ["White Claw Variety Pack", "White Claw", "Beer & cider", "12-pack · 12 oz cans", 14.0, 20.99, 2, 2.2, "lakeshore"],
  ["Angry Orchard Crisp Apple", "Angry Orchard", "Beer & cider", "6-pack · 12 oz bottles", 6.8, 10.49, 4, 0.5, "ridgeline"],
  ["Athletic Run Wild Non-Alcoholic IPA", "Athletic Brewing", "Beer & cider", "6-pack · 12 oz cans", 8.0, 12.99, 4, 0.4, null],
];

export interface SupplierSeed {
  key: string;
  name: string;
  monogram: string;
  color: string;
  contactName: string;
  contactRole: string;
  domain: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  paymentTerms: string;
  minimumOrder: number;
  onTimeRate: number;
  status: "active" | "on_hold";
  notes: string;
}

export const SUPPLIERS: SupplierSeed[] = [
  {
    key: "northwind",
    name: "Northwind Spirits Co.",
    monogram: "NS",
    color: "#0b4627",
    contactName: "Dana Whitfield",
    contactRole: "Account manager",
    domain: "northwindspirits.example",
    phone: "(555) 014-2290",
    address: "1180 Foundry Row, Unit 4, Louisville, KY",
    leadTimeDays: 7,
    paymentTerms: "Net 30",
    minimumOrder: 500,
    onTimeRate: 0.96,
    status: "active",
    notes: "Primary American & Irish whiskey distributor. Orders placed before Tuesday noon ship the same week. Ask Dana about allocated bourbon releases each quarter.",
  },
  {
    key: "harbor",
    name: "Harbor & Vine Distributors",
    monogram: "HV",
    color: "#7d52f4",
    contactName: "Marcus Ellery",
    contactRole: "Wine specialist",
    domain: "harborvine.example",
    phone: "(555) 018-4471",
    address: "42 Pier Street, Oakland, CA",
    leadTimeDays: 5,
    paymentTerms: "Net 30",
    minimumOrder: 350,
    onTimeRate: 0.93,
    status: "active",
    notes: "Mixed-case discounts above 10 cases. Delivers Tuesdays and Fridays.",
  },
  {
    key: "copperline",
    name: "Copperline Beverage",
    monogram: "CB",
    color: "#e16614",
    contactName: "Priya Raman",
    contactRole: "Sales representative",
    domain: "copperlinebev.example",
    phone: "(555) 011-7302",
    address: "900 Industrial Pkwy, Austin, TX",
    leadTimeDays: 4,
    paymentTerms: "Net 15",
    minimumOrder: 400,
    onTimeRate: 0.98,
    status: "active",
    notes: "Fastest turnaround for core vodka and gin. 2% early-payment discount within 10 days.",
  },
  {
    key: "agave",
    name: "Blue Agave Imports",
    monogram: "BA",
    color: "#335cff",
    contactName: "Luis Carranza",
    contactRole: "Regional director",
    domain: "blueagaveimports.example",
    phone: "(555) 019-8820",
    address: "3300 Mesa Blvd, San Diego, CA",
    leadTimeDays: 10,
    paymentTerms: "Net 30",
    minimumOrder: 600,
    onTimeRate: 0.89,
    status: "active",
    notes: "Premium tequila allocations open in March and September. Longer lead times around holidays.",
  },
  {
    key: "caribe",
    name: "Caribe Trading Company",
    monogram: "CT",
    color: "#68123d",
    contactName: "Simone Baptiste",
    contactRole: "Account manager",
    domain: "caribetrading.example",
    phone: "(555) 013-5546",
    address: "77 Harbor Gate, Miami, FL",
    leadTimeDays: 9,
    paymentTerms: "Net 45",
    minimumOrder: 300,
    onTimeRate: 0.91,
    status: "active",
    notes: "Rum and French liqueurs. Consolidates shipments weekly on Mondays.",
  },
  {
    key: "ridgeline",
    name: "Ridgeline Beer Distribution",
    monogram: "RB",
    color: "#fa7319",
    contactName: "Tom Okafor",
    contactRole: "Route manager",
    domain: "ridgelinebeer.example",
    phone: "(555) 016-3318",
    address: "15 Depot Road, Sacramento, CA",
    leadTimeDays: 3,
    paymentTerms: "Net 7",
    minimumOrder: 200,
    onTimeRate: 0.97,
    status: "active",
    notes: "Delivers Monday, Wednesday, Friday. Keg returns credited on next invoice.",
  },
  {
    key: "maison",
    name: "Maison Bulles Imports",
    monogram: "MB",
    color: "#c9a227",
    contactName: "Claire Duval",
    contactRole: "Champagne portfolio lead",
    domain: "maisonbulles.example",
    phone: "(555) 012-9054",
    address: "210 Vintners Lane, Napa, CA",
    leadTimeDays: 12,
    paymentTerms: "Net 30",
    minimumOrder: 750,
    onTimeRate: 0.9,
    status: "active",
    notes: "Holiday pre-orders close November 1. Prestige cuvées ship in wooden cases.",
  },
  {
    key: "highland",
    name: "Highland Cask Merchants",
    monogram: "HC",
    color: "#124b68",
    contactName: "Ewan MacLeod",
    contactRole: "Single malt specialist",
    domain: "highlandcask.example",
    phone: "(555) 017-6621",
    address: "8 Cooper's Yard, Portland, OR",
    leadTimeDays: 14,
    paymentTerms: "Net 60",
    minimumOrder: 800,
    onTimeRate: 0.87,
    status: "active",
    notes: "Scotch and premium Irish. Imports land every two weeks — plan around the 14-day lead time.",
  },
  {
    key: "goldengate",
    name: "Golden Gate Wine Group",
    monogram: "GG",
    color: "#a3a3a3",
    contactName: "Rachel Kim",
    contactRole: "Account manager",
    domain: "goldengatewine.example",
    phone: "(555) 015-2207",
    address: "501 Embarcadero South, San Francisco, CA",
    leadTimeDays: 6,
    paymentTerms: "Net 30",
    minimumOrder: 400,
    onTimeRate: 0.82,
    status: "on_hold",
    notes: "Account on hold pending a disputed invoice (INV-88213). Do not place new orders until resolved — move urgent items to Harbor & Vine.",
  },
  {
    key: "lakeshore",
    name: "Lakeshore Beverage Supply",
    monogram: "LB",
    color: "#47c2ff",
    contactName: "Jordan Pryce",
    contactRole: "Sales representative",
    domain: "lakeshorebev.example",
    phone: "(555) 010-4485",
    address: "2600 Lake Ave, Chicago, IL",
    leadTimeDays: 5,
    paymentTerms: "Net 15",
    minimumOrder: 250,
    onTimeRate: 0.95,
    status: "active",
    notes: "Value vodka, rum and seltzers. Free delivery over $1,000.",
  },
  {
    key: "craft",
    name: "Craft Spirits Collective",
    monogram: "CS",
    color: "#1daf61",
    contactName: "Noor Haddad",
    contactRole: "Portfolio manager",
    domain: "craftspirits.example",
    phone: "(555) 014-9913",
    address: "64 Distillery Lane, Denver, CO",
    leadTimeDays: 8,
    paymentTerms: "Net 30",
    minimumOrder: 300,
    onTimeRate: 0.92,
    status: "active",
    notes: "Craft and imported gin. Offers staff tasting kits with orders over $1,500.",
  },
  {
    key: "metro",
    name: "Metro Aperitivo & Liqueur",
    monogram: "MA",
    color: "#fb4ba3",
    contactName: "Gianni Russo",
    contactRole: "Account manager",
    domain: "metroaperitivo.example",
    phone: "(555) 018-0036",
    address: "19 Vespa Court, Brooklyn, NY",
    leadTimeDays: 4,
    paymentTerms: "Net 15",
    minimumOrder: 200,
    onTimeRate: 0.94,
    status: "active",
    notes: "Italian aperitivi and French liqueurs. Spritz season promo runs April–August.",
  },
];

export interface ProductOverride {
  stock: number;
  reorderPoint?: number;
  targetStock?: number;
}

/**
 * Downtown store hand-tuned stock levels so the demo story is coherent:
 * 12 products are low, 3 are out, 3 are approaching their reorder point.
 * Keys are catalog indexes.
 */
export const DOWNTOWN_OVERRIDES: Record<number, ProductOverride> = {
  0: { stock: 8, reorderPoint: 20, targetStock: 32 }, // Jameson 750 — the PRD example
  18: { stock: 11 }, // Tito's 750
  44: { stock: 16 }, // Casamigos Blanco
  75: { stock: 14 }, // Kim Crawford
  91: { stock: 9 }, // Modelo
  54: { stock: 7 }, // Aperol
  3: { stock: 13 }, // Buffalo Trace
  30: { stock: 6 }, // Hendrick's
  64: { stock: 9 }, // Meiomi
  71: { stock: 3 }, // Decoy (supplier on hold)
  47: { stock: 15 }, // Espolòn
  86: { stock: 6 }, // La Marca
  45: { stock: 0 }, // Don Julio Blanco — out
  9: { stock: 0 }, // Glenfiddich 12 — out, covered by an open PO
  99: { stock: 0 }, // Athletic NA — out, no supplier
  20: { stock: 11 }, // Grey Goose — approaching
  63: { stock: 21 }, // Josh Cabernet — approaching
  92: { stock: 20 }, // Corona — approaching
  // Slow movers holding cash
  11: { stock: 14 }, // Lagavulin
  89: { stock: 6 }, // Dom Pérignon
  49: { stock: 9 }, // Don Julio 1942
  65: { stock: 16 }, // Caymus
  35: { stock: 11 }, // Monkey 47
  62: { stock: 10 }, // Chambord
};

export const FIRST_NAMES = [
  "Avery", "Jordan", "Sam", "Riley", "Morgan", "Casey", "Taylor", "Jamie", "Quinn", "Reese",
  "Harper", "Rowan", "Elliot", "Sasha", "Devon", "Kai", "Noel", "Parker", "Skyler", "Emerson",
  "Hayden", "Milan", "Arden", "Lennox", "Remy", "Blake", "Oakley", "Shiloh", "Marlowe", "Sage",
];
export const LAST_NAMES = [
  "Alvarez", "Brooks", "Chen", "Delgado", "Ellison", "Foster", "Grant", "Hughes", "Ibarra", "Jensen",
  "Kowalski", "Lindqvist", "Moreno", "Nakamura", "Osei", "Patel", "Quintero", "Rossi", "Silva", "Thompson",
  "Underwood", "Vasquez", "Whitaker", "Xu", "Yilmaz", "Zimmerman", "Abara", "Bennett", "Castillo", "Dubois",
];
export const STREETS = [
  "Alder St", "Birch Ave", "Cedar Ln", "Dover Ct", "Elm St", "Fulton Ave", "Grove St", "Hawthorne Rd",
  "Juniper Way", "Kingsley Pl", "Laurel St", "Maple Ave", "Northgate Dr", "Orchard Rd", "Pine St",
];
