export type JobCategory = "packaging" | "book_commercial";

export interface ExtraField {
  label: string;
  value: string;
  field_type: "text" | "number" | "select";
}

// ─── Template Types (Packaging) 1-12 ───

export const TEMPLATE_TYPES = {
  1: "Reverse Tuck End",
  2: "Straight Tuck End",
  3: "TTSLB",
  4: "TTAB",
  5: "Simplex Tray",
  6: "Frame-Vue Tray",
  7: "Four Corner Beers",
  8: "Gable Top",
  9: "Sleeve",
  10: "Pillow Box",
  11: "Seal End",
  12: "Custom",
} as const;

export const TEMPLATE_TYPES_TH: Record<number, string> = {
  1: "กล่องฝาเสียบกลับด้าน",
  2: "กล่องฝาเสียบตรง",
  3: "ฝาเสียบบน ล็อคก้น",
  4: "ฝาเสียบบน ก้นอัตโนมัติ",
  5: "ถาดธรรมดา",
  6: "ถาดมีกรอบ/หน้าต่าง",
  7: "กล่อง 4 มุม",
  8: "กล่องหูหิ้ว",
  9: "ปลอก/Sleeve",
  10: "กล่องหมอน",
  11: "กล่องซีลปลาย",
  12: "แบบพิเศษ",
};

export type ColorLimitLevel = "light" | "standard" | "dark";
export type PrintType = "offset" | "digital" | "flexo" | "jetpress" | "konica" | "no_print";
export type DiecutStatus = "new" | "existing" | "none";
export type InspectionLevel = "normal" | "strict" | "aql" | "100";
export type DimensionReference = "ID" | "OD" | "Score";
export type MaterialFamily = "corrugated" | "paperboard" | "other";
export type ComponentRole = "primary" | "secondary";

// ─── Print & Color Detail (per side) ───

export interface SpecialInk {
  name: string;
  pantone_ref?: string;
  ink_type: "pantone" | "metallic" | "fluorescent" | "white";
}

export interface PrintColorDetail {
  print_type: PrintType;
  colors: "cmyk" | "special" | "mixed" | "none";
  color_count: number;
  color_limit: ColorLimitLevel;
  special_inks: SpecialInk[];
  approved_color_ref?: string | null;
}

// ─── After Press Detail ───

export interface DiecutSpec {
  status: DiecutStatus;
  reference?: string;
}

export interface AssemblySpec {
  has_glue: boolean;
  glue_spots: number;
}

export interface FoilSpec {
  enabled: boolean;
  color?: string | null;
  area_est?: string | null;
  position_ref?: string | null;
}

export interface AfterPressDetail {
  diecut: DiecutSpec;
  assembly: AssemblySpec;
  inspection: InspectionLevel;
  coating?: string | null;
  foil?: string | FoilSpec | null;
  emboss: boolean;
  deboss: boolean;
}

// ─── Dimension / Material / Packing Spec ───

export interface DimensionSpec {
  width: number;
  height: number;
  depth?: number;
  unit: string;
  reference?: DimensionReference | null;      // ID, OD, Score
  orientation?: "portrait" | "landscape" | null;
  flaps?: { dust?: number; t?: number; g?: number; ol?: number } | null;
  dieline_files?: string[] | null;
}

export interface MaterialSpec {
  family?: MaterialFamily | null;             // corrugated, paperboard, other
  type: string;
  code?: string;
  gsm: number;
  brand?: string | null;                      // paper brand e.g. "Apollopape FSC"
  board_type?: string;
  flute?: string | null;                      // E, B, C, BC (corrugated)
  grade?: string | null;                      // e.g. "DP250/CA105/CA125"
}

export interface PackingSpec {
  method?: string | null;                     // paper_band, kraft_wrap, carton, pallet, shrink
  pack_per_carton?: number | null;
  pallet_req?: boolean | null;                // palletised?
  pallet_note?: string | null;               // e.g. "export pallet"
}

// ─── Component Spec ───

export interface ComponentSpec {
  component_name: string;
  template_type?: number | null;
  job_category: JobCategory;
  role?: ComponentRole;
  dimensions?: DimensionSpec;
  paper?: MaterialSpec;
  outside: PrintColorDetail;
  inside: PrintColorDetail | "no_print";
  after_press: AfterPressDetail;
  finishing: string[];
  packing?: PackingSpec | string | null;
  quantity: number;
  set_qty?: number | null;
  units_per_set?: number;
  // Book/commercial fields
  pages?: number | null;                     // total pages (extent)
  pages_text?: string | null;                // raw text e.g. "12 or 13 text spreads + cover"
  binding?: string | null;                   // e.g. "Board book binding", "Perfect binding", "Saddle stitch"
  extra_fields?: ExtraField[];
  confidence?: number;
}

// ─── Blocking Question (AI ask-back) ───

export interface BlockingQuestion {
  field: string;
  component_name?: string | null;
  question_th: string;
  options?: string[];
  priority: number;
}

// ─── Project Spec (top-level container) ───

export interface ProjectSpec {
  project_name?: string | null;
  customer?: string | null;
  brand?: string | null;
  reference_no?: string | null;
  job_category: JobCategory;
  requester_ae?: string | null;
  incoterm?: string | null;                   // FOB, CIF, EXW, DDP
  destination?: string | null;
  currency?: string;                          // THB, USD, HKD
  quote_due_date?: string | null;
  compliance?: string[] | null;               // ["FSC", "Food contact"]
  components: ComponentSpec[];
  blocking_questions: BlockingQuestion[];
  notes?: string | null;
}

// ─── Legacy ParsedSpec (backward compat) ───

export interface ParsedSpec {
  job_category: JobCategory;
  product_type: string;
  product_name?: string;
  dimensions?: { width: number; height: number; depth?: number; unit: string };
  paper?: { type: string; code?: string; gsm: number };
  colors_front: number;
  colors_back: number;
  quantity: number;
  finishing: string[];
  special_instructions?: string;
  confidence?: number;
  extra_fields?: ExtraField[];
}

// ─── Chat ───

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  parsed_spec?: ParsedSpec;
  project_spec?: ProjectSpec;
  blocking_questions?: BlockingQuestion[];
}

// ─── Component Cost (4 blocks) ───

export interface ComponentCostResult {
  component_name: string;
  template_type?: number | null;
  quantity: number;
  cost: {
    materials: number;
    print_press: number;
    after_press: number;
    packing: number;
    logistics?: number;
    subtotal: number;
    unit_cost: number;
    markup_pct?: number;
    breakdown?: Record<string, unknown>;
    error?: string;
  };
}

export interface ProjectCalcResult {
  components: ComponentCostResult[];
  materials_total: number;
  print_total: number;
  after_press_total: number;
  packing_total: number;
  logistics_total: number;
  grand_total: number;
  unit_cost: number;
  quantity: number;
}

// ─── Legacy Calculation Result ───

export interface CalculationResult {
  paper_cost: number;
  plate_cost: number;
  ink_cost: number;
  print_cost: number;
  finishing_cost: number;
  logistics_cost: number;
  other_cost: number;
  subtotal: number;
  markup_pct: number;
  margin_pct: number;
  total_cost: number;
  unit_cost: number;
  breakdown?: Record<string, unknown>;
}

// ─── RFQ ───

export interface RFQItem {
  id?: number;
  product_type: string;
  product_name?: string;
  dimensions_json?: { width: number; height: number; depth?: number; unit: string };
  paper_id?: number;
  paper_gsm?: number;
  colors_front: number;
  colors_back: number;
  quantity: number;
  finishing_json?: string[];
  special_instructions?: string;
  calculation?: CalculationResult;
}

export interface RFQ {
  id: number;
  input_type: string;
  status: string;
  raw_input?: string;
  parsed_spec_json?: Record<string, unknown>;
  items: RFQItem[];
  created_at: string;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  version: number;
  rfq_id: number;
  customer_name?: string;
  customer_company?: string;
  total_price: number;
  discount_pct: number;
  final_price: number;
  currency: string;
  valid_until?: string;
  status: string;
  pdf_url?: string;
  created_at: string;
}

export interface Paper {
  id: number;
  name: string;
  type: string;
  gsm: number;
  size_w?: number;
  size_h?: number;
  price_per_kg: number;
  price_per_sheet?: number;
  active: boolean;
}

export interface Machine {
  id: number;
  name: string;
  type: string;
  max_width?: number;
  max_height?: number;
  speed_sheets_per_hour: number;
  cost_per_hour: number;
  active: boolean;
}

// ─── Default values for creating new components ───

export const DEFAULT_PRINT_COLOR: PrintColorDetail = {
  print_type: "offset",
  colors: "cmyk",
  color_count: 4,
  color_limit: "standard",
  special_inks: [],
};

export const DEFAULT_AFTER_PRESS: AfterPressDetail = {
  diecut: { status: "none" },
  assembly: { has_glue: false, glue_spots: 0 },
  inspection: "normal",
  coating: null,
  foil: null,
  emboss: false,
  deboss: false,
};

export const DEFAULT_COMPONENT: ComponentSpec = {
  component_name: "",
  template_type: null,
  job_category: "packaging",
  role: "primary",
  dimensions: undefined,
  paper: undefined,
  outside: { ...DEFAULT_PRINT_COLOR },
  inside: "no_print",
  after_press: { ...DEFAULT_AFTER_PRESS },
  finishing: [],
  packing: null,
  quantity: 0,
  set_qty: null,
  units_per_set: 1,
  extra_fields: [],
};
