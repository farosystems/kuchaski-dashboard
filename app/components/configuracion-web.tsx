"use client"

import React, { useState } from "react"
import { Monitor, Smartphone, Save, Palette, Type, Layout, Upload, Home, Settings, Image as ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ConfiguracionWeb, PlanFinanciacion, Categoria, Marca, supabase } from "@/lib/supabase"

interface ConfiguracionWebProps {
  configuracionWeb?: ConfiguracionWeb | null
  onUpdateConfiguracionWeb: (updates: Partial<ConfiguracionWeb>) => Promise<ConfiguracionWeb | undefined>
  planes?: PlanFinanciacion[]
  categorias?: Categoria[]
  marcas?: Marca[]
}

export function ConfiguracionWebComponent({ 
  configuracionWeb,
  onUpdateConfiguracionWeb,
  planes = [],
  categorias = [],
  marcas = []
}: ConfiguracionWebProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Logo
    logo_url: configuracionWeb?.logo_url || "",
    logo_width: configuracionWeb?.logo_width || 200,
    logo_height: configuracionWeb?.logo_height || 60,
    
    // AppBar Desktop
    appbar_height: configuracionWeb?.appbar_height || 64,
    appbar_background_color: configuracionWeb?.appbar_background_color || "#ffffff",
    appbar_text_color: configuracionWeb?.appbar_text_color || "#000000",
    
    // Tipografías Desktop
    section_title_size: configuracionWeb?.section_title_size || 24,
    section_subtitle_size: configuracionWeb?.section_subtitle_size || 18,
    section_text_size: configuracionWeb?.section_text_size || 16,
    
    // Búsqueda Desktop
    search_box_width: configuracionWeb?.search_box_width || 400,
    search_box_height: configuracionWeb?.search_box_height || 40,
    
    // Home Desktop
    home_section_height: configuracionWeb?.home_section_height || 500,
    
    // Mobile
    mobile_logo_width: configuracionWeb?.mobile_logo_width || 150,
    mobile_logo_height: configuracionWeb?.mobile_logo_height || 45,
    mobile_appbar_height: configuracionWeb?.mobile_appbar_height || 56,
    
    // Home Section Configuration
    home_display_plan_id: configuracionWeb?.home_display_plan_id || null,
    home_display_products_count: configuracionWeb?.home_display_products_count || 12,
    home_display_category_filter: configuracionWeb?.home_display_category_filter || null,
    home_display_brand_filter: configuracionWeb?.home_display_brand_filter || null,
    home_display_featured_only: configuracionWeb?.home_display_featured_only || false,
    combos: configuracionWeb?.combos || false,
    titulo_seccion_combos: configuracionWeb?.titulo_seccion_combos || "Combos Especiales",
    combos_subtitulo: configuracionWeb?.combos_subtitulo || "",
    titulo_seccion_promos: configuracionWeb?.titulo_seccion_promos || "Promociones",
    titulo_seccion_destacados: configuracionWeb?.titulo_seccion_destacados || "Productos Destacados",

    // Banners
    banner_1: configuracionWeb?.banner_1 || "",
    banner_2: configuracionWeb?.banner_2 || "",
    banner_3: configuracionWeb?.banner_3 || ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      await onUpdateConfiguracionWeb(formData)
    } catch (error) {
      console.error('Error al actualizar configuración web:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleReset = () => {
    setFormData({
      logo_url: "",
      logo_width: 200,
      logo_height: 60,
      appbar_height: 64,
      appbar_background_color: "#ffffff",
      appbar_text_color: "#000000",
      section_title_size: 24,
      section_subtitle_size: 18,
      section_text_size: 16,
      search_box_width: 400,
      search_box_height: 40,
      home_section_height: 500,
      mobile_logo_width: 150,
      mobile_logo_height: 45,
      mobile_appbar_height: 56,
      home_display_plan_id: null,
      home_display_products_count: 12,
      home_display_category_filter: null,
      home_display_brand_filter: null,
      home_display_featured_only: false,
      combos: false,
      titulo_seccion_combos: "Combos Especiales",
      combos_subtitulo: "",
      titulo_seccion_promos: "Promociones",
      titulo_seccion_destacados: "Productos Destacados",
      banner_1: "",
      banner_2: "",
      banner_3: ""
    })
  }

  const handleImageUpload = async (field: 'banner_1' | 'banner_2' | 'banner_3' | 'logo_url', file: File) => {
    try {
      setIsLoading(true)

      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Tamaño máximo: 5MB')
        return
      }

      const fileExt = file.name.split('.').pop()
      const prefix = field === 'logo_url' ? 'logo' : 'banner'
      const folder = field === 'logo_url' ? 'logos' : 'banners'
      const fileName = `${prefix}-${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('imagenes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error de Supabase Storage:', error)
        throw error
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('imagenes')
        .getPublicUrl(filePath)

      console.log('Imagen subida exitosamente:', publicUrl)
      handleInputChange(field, publicUrl)
    } catch (error) {
      console.error('Error al subir imagen:', error)
      alert('Error al subir la imagen. Por favor intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Configuración Web
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            Restablecer
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="desktop" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="desktop" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile
              </TabsTrigger>
              <TabsTrigger value="home" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Home Section
              </TabsTrigger>
            </TabsList>

            <TabsContent value="desktop" className="space-y-6 mt-6">
              {/* Logo Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <h3 className="text-lg font-semibold">Logo</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <Label htmlFor="logo_url">URL del Logo</Label>
                      <Input
                        id="logo_url"
                        value={formData.logo_url}
                        onChange={(e) => handleInputChange('logo_url', e.target.value)}
                        placeholder="https://ejemplo.com/logo1.png o subir desde PC"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_file">O subir logo desde PC</Label>
                    <Input
                      id="logo_file"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          await handleImageUpload('logo_url', file)
                          // Reset the input after upload
                          e.target.value = ''
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500">Formatos: JPG, PNG, GIF, WEBP (Máx. 5MB)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="logo_width">Ancho (px)</Label>
                      <Input
                        id="logo_width"
                        type="number"
                        value={formData.logo_width}
                        onChange={(e) => handleInputChange('logo_width', parseInt(e.target.value) || 0)}
                        min={50}
                        max={500}
                      />
                    </div>
                    <div>
                      <Label htmlFor="logo_height">Alto (px)</Label>
                      <Input
                        id="logo_height"
                        type="number"
                        value={formData.logo_height}
                        onChange={(e) => handleInputChange('logo_height', parseInt(e.target.value) || 0)}
                        min={20}
                        max={200}
                      />
                    </div>
                    <div className="flex items-center justify-center border rounded-lg p-4">
                      {formData.logo_url ? (
                        <img
                          src={formData.logo_url}
                          alt="Vista previa del logo"
                          style={{
                            width: `${Math.min(formData.logo_width, 100)}px`,
                            height: `${Math.min(formData.logo_height, 50)}px`,
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">Vista previa del logo</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* AppBar Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Barra de Navegación</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="appbar_height">Altura (px)</Label>
                    <Input
                      id="appbar_height"
                      type="number"
                      value={formData.appbar_height}
                      onChange={(e) => handleInputChange('appbar_height', parseInt(e.target.value) || 0)}
                      min={40}
                      max={120}
                    />
                  </div>
                  <div>
                    <Label htmlFor="appbar_background_color">Color de Fondo</Label>
                    <div className="flex gap-2">
                      <Input
                        id="appbar_background_color"
                        type="color"
                        value={formData.appbar_background_color}
                        onChange={(e) => handleInputChange('appbar_background_color', e.target.value)}
                        className="w-16"
                      />
                      <Input
                        value={formData.appbar_background_color}
                        onChange={(e) => handleInputChange('appbar_background_color', e.target.value)}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="appbar_text_color">Color de Texto</Label>
                    <div className="flex gap-2">
                      <Input
                        id="appbar_text_color"
                        type="color"
                        value={formData.appbar_text_color}
                        onChange={(e) => handleInputChange('appbar_text_color', e.target.value)}
                        className="w-16"
                      />
                      <Input
                        value={formData.appbar_text_color}
                        onChange={(e) => handleInputChange('appbar_text_color', e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </TabsContent>

            <TabsContent value="mobile" className="space-y-6 mt-6">
              {/* Mobile Logo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Logo Móvil</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mobile_logo_width">Ancho (px)</Label>
                    <Input
                      id="mobile_logo_width"
                      type="number"
                      value={formData.mobile_logo_width}
                      onChange={(e) => handleInputChange('mobile_logo_width', parseInt(e.target.value) || 0)}
                      min={80}
                      max={300}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile_logo_height">Alto (px)</Label>
                    <Input
                      id="mobile_logo_height"
                      type="number"
                      value={formData.mobile_logo_height}
                      onChange={(e) => handleInputChange('mobile_logo_height', parseInt(e.target.value) || 0)}
                      min={30}
                      max={100}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Mobile AppBar */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Barra de Navegación Móvil</h3>
                <div>
                  <Label htmlFor="mobile_appbar_height">Altura (px)</Label>
                  <Input
                    id="mobile_appbar_height"
                    type="number"
                    value={formData.mobile_appbar_height}
                    onChange={(e) => handleInputChange('mobile_appbar_height', parseInt(e.target.value) || 0)}
                    min={40}
                    max={80}
                  />
                </div>
              </div>


            </TabsContent>

            <TabsContent value="home" className="space-y-6 mt-6">
              {/* Home Section Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <h3 className="text-lg font-semibold">Configuración de Productos en Home</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Configura qué plan y productos mostrar en la sección principal del sitio web
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Plan Selection */}
                  <div>
                    <Label htmlFor="home_display_plan_id">Plan a Mostrar</Label>
                    <Select 
                      value={formData.home_display_plan_id?.toString() || "null"} 
                      onValueChange={(value) => handleInputChange('home_display_plan_id', value === "null" ? null : parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar plan..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Sin filtro de plan</SelectItem>
                        {planes.filter(plan => plan.activo).map(plan => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            {plan.nombre} ({plan.cuotas} cuotas)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Products Count */}
                  <div>
                    <Label htmlFor="home_display_products_count">Cantidad de Productos</Label>
                    <Input
                      id="home_display_products_count"
                      type="number"
                      value={formData.home_display_products_count}
                      onChange={(e) => handleInputChange('home_display_products_count', parseInt(e.target.value) || 12)}
                      min={4}
                      max={50}
                      placeholder="12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Filter */}
                  <div>
                    <Label htmlFor="home_display_category_filter">Filtrar por Categoría (Opcional)</Label>
                    <Select 
                      value={formData.home_display_category_filter?.toString() || "null"} 
                      onValueChange={(value) => handleInputChange('home_display_category_filter', value === "null" ? null : parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Todas las categorías</SelectItem>
                        {categorias.map(categoria => (
                          <SelectItem key={categoria.id} value={categoria.id.toString()}>
                            {categoria.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Brand Filter */}
                  <div>
                    <Label htmlFor="home_display_brand_filter">Filtrar por Marca (Opcional)</Label>
                    <Select 
                      value={formData.home_display_brand_filter?.toString() || "null"} 
                      onValueChange={(value) => handleInputChange('home_display_brand_filter', value === "null" ? null : parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las marcas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Todas las marcas</SelectItem>
                        {marcas.map(marca => (
                          <SelectItem key={marca.id} value={marca.id.toString()}>
                            {marca.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="home_display_featured_only"
                      checked={formData.home_display_featured_only}
                      onCheckedChange={(checked) => handleInputChange('home_display_featured_only', checked)}
                    />
                    <Label htmlFor="home_display_featured_only">Solo mostrar productos destacados</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="combos"
                      checked={formData.combos}
                      onCheckedChange={(checked) => handleInputChange('combos', checked)}
                    />
                    <Label htmlFor="combos">Habilitar combos en la aplicación</Label>
                  </div>
                </div>

                {/* Campos para títulos de secciones */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold">Títulos de Secciones</h4>

                  {/* Campo para título de sección de combos */}
                  {formData.combos && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="titulo_seccion_combos">Título de la sección de combos</Label>
                        <Input
                          id="titulo_seccion_combos"
                          value={formData.titulo_seccion_combos}
                          onChange={(e) => handleInputChange('titulo_seccion_combos', e.target.value)}
                          placeholder="Ej: Combos Especiales, Ofertas Combo, etc."
                          maxLength={50}
                        />
                        <p className="text-xs text-gray-500">
                          Este será el título que aparecerá en la sección de combos del sitio web
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="combos_subtitulo">Subtítulo de la sección de combos</Label>
                        <Input
                          id="combos_subtitulo"
                          value={formData.combos_subtitulo}
                          onChange={(e) => handleInputChange('combos_subtitulo', e.target.value)}
                          placeholder="Ej: Las mejores ofertas en paquetes combinados"
                          maxLength={100}
                        />
                        <p className="text-xs text-gray-500">
                          Este será el subtítulo que aparecerá debajo del título en la sección de combos
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Campo para título de sección de promociones */}
                  <div className="space-y-2">
                    <Label htmlFor="titulo_seccion_promos">Título de la sección de promociones</Label>
                    <Input
                      id="titulo_seccion_promos"
                      value={formData.titulo_seccion_promos}
                      onChange={(e) => handleInputChange('titulo_seccion_promos', e.target.value)}
                      placeholder="Ej: Promociones, Ofertas Especiales, etc."
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500">
                      Este será el título que aparecerá en la sección de promociones del sitio web
                    </p>
                  </div>

                  {/* Campo para título de sección de destacados */}
                  <div className="space-y-2">
                    <Label htmlFor="titulo_seccion_destacados">Título de la sección de productos destacados</Label>
                    <Input
                      id="titulo_seccion_destacados"
                      value={formData.titulo_seccion_destacados}
                      onChange={(e) => handleInputChange('titulo_seccion_destacados', e.target.value)}
                      placeholder="Ej: Productos Destacados, Lo Más Vendido, etc."
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500">
                      Este será el título que aparecerá en la sección de productos destacados del sitio web
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                </div>

                <Separator />

                {/* Banners Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <h3 className="text-lg font-semibold">Banners del Home</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Configura hasta 3 banners para mostrar en el carrusel principal del home
                  </p>

                  {/* Banner 1 */}
                  <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="banner_1" className="text-base font-semibold">Banner 1</Label>
                      {formData.banner_1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInputChange('banner_1', '')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner_1_url">URL de la imagen</Label>
                      <Input
                        id="banner_1_url"
                        value={formData.banner_1}
                        onChange={(e) => handleInputChange('banner_1', e.target.value)}
                        placeholder="https://ejemplo.com/banner1.jpg o subir desde PC"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner_1_file">O subir imagen desde PC</Label>
                      <Input
                        id="banner_1_file"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            await handleImageUpload('banner_1', file)
                            // Reset the input after upload
                            e.target.value = ''
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500">Formatos: JPG, PNG, GIF, WEBP (Máx. 5MB)</p>
                    </div>

                    {formData.banner_1 && (
                      <div className="mt-3">
                        <Label className="text-sm text-gray-600 mb-2 block">Vista previa:</Label>
                        <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-white">
                          <img
                            src={formData.banner_1}
                            alt="Vista previa Banner 1"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12" fill="%23999"%3EError al cargar%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Banner 2 */}
                  <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="banner_2" className="text-base font-semibold">Banner 2</Label>
                      {formData.banner_2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInputChange('banner_2', '')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner_2_url">URL de la imagen</Label>
                      <Input
                        id="banner_2_url"
                        value={formData.banner_2}
                        onChange={(e) => handleInputChange('banner_2', e.target.value)}
                        placeholder="https://ejemplo.com/banner2.jpg o subir desde PC"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner_2_file">O subir imagen desde PC</Label>
                      <Input
                        id="banner_2_file"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            await handleImageUpload('banner_2', file)
                            // Reset the input after upload
                            e.target.value = ''
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500">Formatos: JPG, PNG, GIF, WEBP (Máx. 5MB)</p>
                    </div>

                    {formData.banner_2 && (
                      <div className="mt-3">
                        <Label className="text-sm text-gray-600 mb-2 block">Vista previa:</Label>
                        <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-white">
                          <img
                            src={formData.banner_2}
                            alt="Vista previa Banner 2"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12" fill="%23999"%3EError al cargar%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Banner 3 */}
                  <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="banner_3" className="text-base font-semibold">Banner 3</Label>
                      {formData.banner_3 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInputChange('banner_3', '')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner_3_url">URL de la imagen</Label>
                      <Input
                        id="banner_3_url"
                        value={formData.banner_3}
                        onChange={(e) => handleInputChange('banner_3', e.target.value)}
                        placeholder="https://ejemplo.com/banner3.jpg o subir desde PC"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner_3_file">O subir imagen desde PC</Label>
                      <Input
                        id="banner_3_file"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            await handleImageUpload('banner_3', file)
                            // Reset the input after upload
                            e.target.value = ''
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500">Formatos: JPG, PNG, GIF, WEBP (Máx. 5MB)</p>
                    </div>

                    {formData.banner_3 && (
                      <div className="mt-3">
                        <Label className="text-sm text-gray-600 mb-2 block">Vista previa:</Label>
                        <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-white">
                          <img
                            src={formData.banner_3}
                            alt="Vista previa Banner 3"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12" fill="%23999"%3EError al cargar%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Preview Info */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Vista previa de la configuración:</h4>
                  <div className="text-sm text-blue-800">
                    <p><strong>Plan seleccionado:</strong> {
                      formData.home_display_plan_id 
                        ? planes.find(p => p.id === formData.home_display_plan_id)?.nombre || 'Plan no encontrado'
                        : 'Ningún plan específico (mostrará productos con precios base)'
                    }</p>
                    <p><strong>Cantidad de productos:</strong> {formData.home_display_products_count}</p>
                    <p><strong>Categoría:</strong> {
                      formData.home_display_category_filter 
                        ? categorias.find(c => c.id === formData.home_display_category_filter)?.descripcion || 'Categoría no encontrada'
                        : 'Todas las categorías'
                    }</p>
                    <p><strong>Marca:</strong> {
                      formData.home_display_brand_filter 
                        ? marcas.find(m => m.id === formData.home_display_brand_filter)?.descripcion || 'Marca no encontrada'
                        : 'Todas las marcas'
                    }</p>
                    <p><strong>Solo destacados:</strong> {formData.home_display_featured_only ? 'Sí' : 'No'}</p>
                    <p><strong>Combos habilitados:</strong> {formData.combos ? 'Sí' : 'No'}</p>
                    {formData.combos && (
                      <>
                        <p><strong>Título sección combos:</strong> "{formData.titulo_seccion_combos}"</p>
                        {formData.combos_subtitulo && (
                          <p><strong>Subtítulo sección combos:</strong> "{formData.combos_subtitulo}"</p>
                        )}
                      </>
                    )}
                    <p><strong>Título sección promociones:</strong> "{formData.titulo_seccion_promos}"</p>
                    <p><strong>Título sección destacados:</strong> "{formData.titulo_seccion_destacados}"</p>
                  </div>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </form>
      </CardContent>
    </Card>
  )
}