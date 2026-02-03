import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para las líneas
export interface Linea {
  id: number
  descripcion: string
  imagen?: string | null
  created_at: string
}

// Tipos para las categorías
export interface Categoria {
  id: number
  descripcion: string
  fk_id_linea?: number
  created_at: string
  linea?: Linea
}

// Tipos para las marcas
export interface Marca {
  id: number
  descripcion: string
  logo?: string
  created_at: string
}

// Tipos para los productos
export interface Producto {
  id: number
  created_at: string
  descripcion: string
  descripcion_detallada?: string
  precio: number
  codigo?: string
  imagen?: string
  imagen_2?: string
  imagen_3?: string
  imagen_4?: string
  imagen_5?: string
  destacado?: boolean
  activo?: boolean
  tiene_stock?: boolean
  aplica_todos_plan?: boolean
  aplica_solo_categoria?: boolean
  aplica_plan_especial?: boolean
  fk_id_categoria?: number
  fk_id_marca?: number
  categoria?: Categoria
  marca?: Marca
}

// Tipos para los planes de financiación
export interface PlanFinanciacion {
  id: number
  nombre: string
  cuotas: number
  recargo_porcentual?: number
  recargo_fijo?: number
  monto_minimo: number
  monto_maximo?: number
  anticipo_minimo?: number
  anticipo_minimo_fijo?: number
  activo: boolean
  created_at: string
  updated_at: string
  categorias?: PlanCategoria[]
}

// Tipo para la relación muchos a muchos entre planes y categorías
export interface PlanCategoria {
  id: number
  fk_id_plan: number
  fk_id_categoria: number
  created_at: string
  plan?: PlanFinanciacion
  categoria?: Categoria
}

// Tipos para productos por plan
export interface ProductoPlan {
  id: number
  fk_id_producto: number
  fk_id_plan: number
  activo: boolean
  destacado: boolean
  created_at: string
  producto?: Producto
  plan?: PlanFinanciacion
}

// Tipos para productos por plan por defecto (tabla oculta)
export interface ProductoPlanDefault {
  id: number
  fk_id_producto?: number
  fk_id_plan: number
  fk_id_combo?: number
  activo: boolean
  created_at: string
  producto?: Producto
  plan?: PlanFinanciacion
  combo?: Combo
}

// Tipos para combos
export interface Combo {
  id: number
  nombre: string
  descripcion?: string
  fecha_vigencia_inicio?: string
  fecha_vigencia_fin?: string
  descuento_porcentaje: number
  precio_combo: number
  precio_original: number
  imagen?: string
  imagen_2?: string
  imagen_3?: string
  imagen_4?: string
  imagen_5?: string
  activo: boolean
  created_at: string
  updated_at: string
  fk_id_categoria?: number
  categoria?: Categoria
  productos?: ComboProducto[]
}

// Tipos para la relación combo-productos
export interface ComboProducto {
  id: number
  fk_id_combo: number
  fk_id_producto: number
  cantidad: number
  precio_unitario?: number
  created_at: string
  producto?: Producto
  combo?: Combo
}

// Tipo para las zonas
export interface Zona {
  id: number
  nombre: string | null
  created_at: string
}

// Tipo para la configuración
export interface Configuracion {
  id: number
  created_at: string
  telefono: string | null
}

// Tipo para la configuración de zonas
export interface ConfiguracionZona {
  id: number
  fk_id_zona: number
  telefono: string
  created_at: string
  zona?: Zona
}

// Tipo para la configuración web
export interface ConfiguracionWeb {
  id: number
  created_at: string
  
  // Configuraciones Desktop
  logo_url?: string
  logo_width: number
  logo_height: number
  
  appbar_height: number
  appbar_background_color: string
  appbar_text_color: string
  
  section_title_size: number
  section_subtitle_size: number
  section_text_size: number
  
  search_box_width: number
  search_box_height: number
  
  home_section_height: number
  
  // Configuraciones Mobile
  mobile_logo_width: number
  mobile_logo_height: number
  
  mobile_appbar_height: number
  
  mobile_section_title_size: number
  mobile_section_subtitle_size: number
  mobile_section_text_size: number
  
  mobile_search_box_width: number
  mobile_search_box_height: number
  
  mobile_home_section_height: number
  
  // Colores generales
  primary_color: string
  secondary_color: string
  accent_color: string
  
  // Tipografías
  font_family_primary: string
  font_family_secondary: string
  
  // Configuración Home Section
  home_display_plan_id?: number
  home_display_products_count: number
  home_display_category_filter?: number
  home_display_brand_filter?: number
  home_display_featured_only: boolean
  combos: boolean
  titulo_seccion_combos?: string
  combos_subtitulo?: string
  titulo_seccion_promos?: string
  titulo_seccion_destacados?: string

  // Banners del home
  banner_1?: string
  banner_2?: string
  banner_3?: string
} 