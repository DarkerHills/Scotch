import type { BottleShape, Category, Thumb } from "@/lib/types";

/**
 * Illustrated product thumbnails. Each product gets a bottle silhouette by
 * category and brand-inspired colors, so tables read like a real catalog
 * without shipping third-party product photography.
 */
type T = [BottleShape, string, string, string, string]; // shape, glass, liquid, label, accent

const CATEGORY_DEFAULT: Record<Category, T> = {
  Whiskey: ["whiskey", "#e7d9c4", "#b4692a", "#f4ecdc", "#7a3e12"],
  Vodka: ["slim", "#e6eef2", "#eef4f7", "#ffffff", "#335cff"],
  Gin: ["gin", "#dfeee6", "#eef6f1", "#ffffff", "#0b4627"],
  Rum: ["whiskey", "#e9dcc6", "#8a4a1c", "#f6ede0", "#681219"],
  Tequila: ["squat", "#e8eef0", "#f1f4f2", "#f7f3ea", "#1c1c1c"],
  Liqueur: ["round", "#3a2a22", "#3a2a22", "#f4e7c9", "#c9a227"],
  "Red wine": ["wine", "#203a2a", "#203a2a", "#f4efe4", "#681219"],
  "White wine": ["wine", "#cfd7a8", "#e2d98e", "#ffffff", "#c9a227"],
  Sparkling: ["sparkling", "#1f3a2a", "#1f3a2a", "#f6f0dc", "#c9a227"],
  "Beer & cider": ["can", "#d1d1d1", "#d1d1d1", "#ffffff", "#335cff"],
};

const BRAND: Record<string, Partial<{ shape: BottleShape; glass: string; liquid: string; label: string; accent: string }>> = {
  Jameson: { glass: "#3e6b48", liquid: "#3e6b48", label: "#f3ead6", accent: "#0b4627" },
  "Maker's Mark": { shape: "square", accent: "#b3122a", label: "#f1e7d0" },
  "Buffalo Trace": { label: "#efe3c8", accent: "#5c3b1e" },
  "Woodford Reserve": { shape: "square", label: "#e9dcc0", accent: "#3b2a1a" },
  Bulleit: { shape: "square", label: "#f0dfb8", accent: "#8a4a1c" },
  "Jack Daniel's": { shape: "square", label: "#1c1c1c", accent: "#f5f5f5" },
  "Johnnie Walker": { shape: "square", label: "#1c1c1c", accent: "#c9a227" },
  Glenfiddich: { shape: "gin", glass: "#2f5b3b", liquid: "#2f5b3b", label: "#f2ead8", accent: "#c9a227" },
  "The Macallan": { label: "#f2ead8", accent: "#7a1f1f" },
  Lagavulin: { label: "#f1e5c6", accent: "#1c1c1c" },
  "Crown Royal": { shape: "round", label: "#4a2a7a", accent: "#c9a227" },
  Fireball: { label: "#e93544", accent: "#ffa468" },
  Rittenhouse: { label: "#f3e4c4", accent: "#b3122a" },
  Redbreast: { label: "#b3122a", accent: "#f4ecdc" },
  "Eagle Rare": { label: "#f0e2c2", accent: "#1c1c1c" },
  "Monkey Shoulder": { shape: "round", label: "#f4ecdc", accent: "#c26a1d" },
  "Tito's": { label: "#efe2c6", accent: "#7a5a2e" },
  "Grey Goose": { glass: "#e1e8ec", accent: "#335cff" },
  Absolut: { shape: "round", accent: "#335cff" },
  "Ketel One": { accent: "#0b4627" },
  Smirnoff: { accent: "#e93544" },
  Belvedere: { glass: "#e7ecee", accent: "#c9a227" },
  Stolichnaya: { accent: "#b3122a" },
  "Deep Eddy": { accent: "#e6b800", liquid: "#f6efb8" },
  "New Amsterdam": { accent: "#1c1c1c" },
  Chopin: { accent: "#5c5c5c" },
  Tanqueray: { glass: "#2e6a40", liquid: "#2e6a40", label: "#f2ead8", accent: "#b3122a" },
  "Hendrick's": { shape: "squat", glass: "#1f2a2a", liquid: "#1f2a2a", label: "#efe6d2", accent: "#1c1c1c" },
  "Bombay Sapphire": { glass: "#3f73b8", liquid: "#3f73b8", label: "#e8eef9", accent: "#c9a227" },
  Aviation: { shape: "slim", glass: "#cfd8dc", accent: "#335cff" },
  "The Botanist": { accent: "#5c5c5c" },
  Beefeater: { accent: "#b3122a" },
  "Monkey 47": { shape: "squat", glass: "#4a3122", liquid: "#4a3122", label: "#efe6d2", accent: "#1c1c1c" },
  Roku: { shape: "square", accent: "#b3122a" },
  "Bacardí": { shape: "slim", glass: "#e8eef0", liquid: "#f3f6f7", label: "#ffffff", accent: "#b3122a" },
  "Captain Morgan": { accent: "#b3122a", label: "#f4e7c9" },
  "Diplomático": { shape: "squat", glass: "#3a2416", liquid: "#3a2416", label: "#f2e6d0", accent: "#c9a227" },
  "Mount Gay": { label: "#f2e6d0", accent: "#b3122a" },
  Plantation: { label: "#f2e6d0", accent: "#0b4627" },
  Kraken: { shape: "round", glass: "#1c1c1c", liquid: "#1c1c1c", label: "#e9dcc0", accent: "#1c1c1c" },
  Malibu: { shape: "slim", glass: "#f4f4f4", liquid: "#f4f4f4", label: "#ffffff", accent: "#e93544" },
  Casamigos: { label: "#f6f2ea", accent: "#1c1c1c" },
  "Don Julio": { shape: "slim", label: "#f2e6d0", accent: "#1c1c1c" },
  "Patrón": { label: "#f3f0e4", accent: "#1daf61" },
  "Espolòn": { shape: "slim", label: "#f0e6e0", accent: "#335cff" },
  Herradura: { shape: "slim", liquid: "#d8a35a", accent: "#681219" },
  "Olmeca Altos": { accent: "#0b4627" },
  "Del Maguey": { shape: "round", glass: "#d9e4e0", label: "#efe2c6", accent: "#c26a1d" },
  "1800": { shape: "square", accent: "#1c1c1c" },
  Aperol: { shape: "round", glass: "#e9eef0", liquid: "#fa7319", label: "#fff3eb", accent: "#e16614" },
  Campari: { shape: "slim", glass: "#e9eef0", liquid: "#c4122f", label: "#ffffff", accent: "#c4122f" },
  Baileys: { glass: "#3a2a22", liquid: "#3a2a22", label: "#f4e7c9", accent: "#681219" },
  "Kahlúa": { glass: "#24170f", liquid: "#24170f", label: "#f6d36b", accent: "#b3122a" },
  Cointreau: { shape: "square", glass: "#c9631d", liquid: "#c9631d", label: "#f4ecdc", accent: "#b3122a" },
  "St-Germain": { shape: "slim", glass: "#e8eef0", liquid: "#f1eccd", label: "#f4ecdc", accent: "#c9a227" },
  "Jägermeister": { shape: "square", glass: "#1f4a2c", liquid: "#1f4a2c", label: "#f28a1d", accent: "#1c1c1c" },
  Disaronno: { shape: "square", glass: "#b86a2a", liquid: "#b86a2a", label: "#f4ecdc", accent: "#5c3b1e" },
  Chambord: { glass: "#4b1f4f", liquid: "#4b1f4f", label: "#c9a227", accent: "#4b1f4f" },
  "Veuve Clicquot": { label: "#f7a521", accent: "#1c1c1c" },
  "Moët & Chandon": { label: "#f6f0dc", accent: "#1c1c1c" },
  "La Marca": { glass: "#3a5a3c", label: "#d8e6f2", accent: "#335cff" },
  "Dom Pérignon": { label: "#e8ddb7", accent: "#0b4627" },
  Freixenet: { glass: "#1c1c1c", liquid: "#1c1c1c", label: "#1c1c1c", accent: "#c9a227" },
  Modelo: { glass: "#c9a227", liquid: "#c9a227", label: "#122368", accent: "#f6f0dc" },
  Corona: { glass: "#f3d26b", liquid: "#f3d26b", label: "#ffffff", accent: "#335cff" },
  Michelob: { glass: "#e9eef5", liquid: "#e9eef5", label: "#122368", accent: "#c9a227" },
  "Stella Artois": { glass: "#e9e4d8", liquid: "#e9e4d8", label: "#b3122a", accent: "#c9a227" },
  Guinness: { glass: "#1c1c1c", liquid: "#1c1c1c", label: "#1c1c1c", accent: "#c9a227" },
  Lagunitas: { glass: "#e8d9b4", liquid: "#e8d9b4", label: "#f6f0dc", accent: "#3b2a1a" },
  "White Claw": { glass: "#f5f5f5", liquid: "#f5f5f5", label: "#1c1c1c", accent: "#fb4ba3" },
  "Angry Orchard": { glass: "#3e7a3a", liquid: "#3e7a3a", label: "#f6f0dc", accent: "#b3122a" },
  "Athletic Brewing": { glass: "#fa7319", liquid: "#fa7319", label: "#ffffff", accent: "#122368" },
  "Whispering Angel": { glass: "#f3ede6", liquid: "#f4b7a1", label: "#ffffff", accent: "#b78a5a" },
  "Kim Crawford": { glass: "#d9e2b3", label: "#ffffff", accent: "#1c1c1c" },
  "Santa Margherita": { glass: "#d9d8a6", label: "#f4ecdc", accent: "#c9a227" },
  "Cloudy Bay": { glass: "#c8d5a3", label: "#ffffff", accent: "#335cff" },
  "Josh Cellars": { label: "#f4ecdc", accent: "#1c1c1c" },
  Meiomi: { label: "#f2e6d0", accent: "#7a1f1f" },
  Caymus: { label: "#f4ecdc", accent: "#7a1f1f" },
  "The Prisoner": { label: "#1c1c1c", accent: "#f4ecdc" },
  "19 Crimes": { label: "#1c1c1c", accent: "#c9a227" },
  Apothic: { label: "#1c1c1c", accent: "#b3122a" },
};

export function thumbFor(brand: string, category: Category, index: number): Thumb {
  const [shape, glass, liquid, label, accent] = CATEGORY_DEFAULT[category];
  const b = BRAND[brand] ?? {};
  // Slight per-index variation for unbranded fallbacks.
  const variant = index % 3;
  return {
    shape: b.shape ?? shape,
    glass: b.glass ?? glass,
    liquid: b.liquid ?? liquid,
    label: b.label ?? (variant === 1 && !b.accent ? "#f6f0e4" : label),
    accent: b.accent ?? accent,
  };
}

const CATEGORY_TILE: Record<Category, string> = {
  Whiskey: "#f6efe4",
  Vodka: "#eef3f6",
  Gin: "#ecf5ef",
  Rum: "#f5ede4",
  Tequila: "#f2f4ef",
  Liqueur: "#f7efe6",
  "Red wine": "#f5ecec",
  "White wine": "#f5f4e6",
  Sparkling: "#f6f1e3",
  "Beer & cider": "#eef1f6",
};

export function tileFor(category: Category) {
  return CATEGORY_TILE[category];
}

export const NEW_PRODUCT_THUMB = (category: Category): Thumb => thumbFor("", category, 0);
