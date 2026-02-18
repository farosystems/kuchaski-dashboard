"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Plus, Edit, Trash2, Grid, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X, Bold, Italic, Underline, Type, Palette, Download } from "lucide-react"
import * as XLSX from 'xlsx'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageUpload } from "./image-upload"
import { ImageImporter } from "./image-importer"
import { ExcelMigrator } from "./excel-migrator"
import { CodigoMigrator } from "./codigo-migrator"
import { Producto, Categoria, Marca, Linea } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

interface ProductosSectionProps {
  productos: Producto[]
  categorias: Categoria[]
  marcas: Marca[]
  lineas: Linea[]
  onCreateProducto: (producto: Omit<Producto, 'id' | 'created_at' | 'categoria' | 'marca'>) => Promise<Producto | undefined>
  onUpdateProducto: (id: number, producto: Partial<Producto>) => Promise<Producto | undefined>
  onDeleteProducto: (id: number) => Promise<void>
}

export const ProductosSection = React.memo(({
  productos,
  categorias,
  marcas,
  lineas,
  onCreateProducto,
  onUpdateProducto,
  onDeleteProducto
}: ProductosSectionProps) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategoria, setFilterCategoria] = useState("all")
  const [filterMarca, setFilterMarca] = useState("all")
  const [filterEstado, setFilterEstado] = useState("all")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const itemsPerPage = 15
  const [formData, setFormData] = useState({
    descripcion: "",
    descripcion_detallada: "",
    precio: "",
    codigo: "",
    fk_id_categoria: undefined as string | undefined,
    fk_id_marca: undefined as string | undefined,
    imagenes: [] as string[],
    destacado: false,
    activo: true,
    tiene_stock: true,
    aplica_todos_plan: false,
    aplica_solo_categoria: false,
    aplica_plan_especial: false,
    precio_oferta: "",
    descuento_porcentual: "",
    fecha_vigencia_desde: "",
    fecha_vigencia_hasta: ""
  })
  const [currentColor, setCurrentColor] = useState("#000000")
  const [currentColorCode, setCurrentColorCode] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

  // Lógica de autocompletado para precio_oferta y descuento_porcentual
  const calcularPrecioOferta = useCallback((precioBase: number, descuento: number) => {
    if (precioBase <= 0 || descuento < 0 || descuento > 100) return ""
    const precioOferta = precioBase * (1 - descuento / 100)
    return precioOferta.toFixed(2)
  }, [])

  const calcularDescuento = useCallback((precioBase: number, precioOferta: number) => {
    if (precioBase <= 0 || precioOferta < 0 || precioOferta > precioBase) return ""
    const descuento = ((precioBase - precioOferta) / precioBase) * 100
    return descuento.toFixed(2)
  }, [])

  const handlePrecioChange = useCallback((precio: string) => {
    setFormData(prev => {
      const precioNum = parseFloat(precio)
      const newData = { ...prev, precio }

      // Si hay descuento, recalcular precio_oferta
      if (prev.descuento_porcentual && !isNaN(precioNum)) {
        const descuentoNum = parseFloat(prev.descuento_porcentual)
        newData.precio_oferta = calcularPrecioOferta(precioNum, descuentoNum)
      }

      return newData
    })
  }, [calcularPrecioOferta])

  const handleDescuentoChange = useCallback((descuento: string) => {
    setFormData(prev => {
      const descuentoNum = parseFloat(descuento)
      const precioNum = parseFloat(prev.precio)

      if (!isNaN(precioNum) && !isNaN(descuentoNum) && descuentoNum >= 0 && descuentoNum <= 100) {
        return {
          ...prev,
          descuento_porcentual: descuento,
          precio_oferta: calcularPrecioOferta(precioNum, descuentoNum)
        }
      }

      return { ...prev, descuento_porcentual: descuento }
    })
  }, [calcularPrecioOferta])

  const handlePrecioOfertaChange = useCallback((precioOferta: string) => {
    setFormData(prev => {
      const precioOfertaNum = parseFloat(precioOferta)
      const precioNum = parseFloat(prev.precio)

      if (!isNaN(precioNum) && !isNaN(precioOfertaNum) && precioOfertaNum >= 0) {
        return {
          ...prev,
          precio_oferta: precioOferta,
          descuento_porcentual: calcularDescuento(precioNum, precioOfertaNum)
        }
      }

      return { ...prev, precio_oferta: precioOferta }
    })
  }, [calcularDescuento])

  // Función para formatear fechas sin desfase de zona horaria
  const formatDateFromDB = (dateString: string): string => {
    // La fecha viene como "2025-11-03" de PostgreSQL
    // Parseamos directamente sin crear objeto Date para evitar zona horaria
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }

  // Filtrado de productos por búsqueda y filtros
  const filteredProductos = useMemo(() => {
    let filtered = productos

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(producto => {
        const descripcion = producto.descripcion?.toLowerCase() || ""
        const descripcionDetallada = producto.descripcion_detallada?.toLowerCase() || ""
        const categoria = producto.categoria?.descripcion?.toLowerCase() || ""
        const marca = producto.marca?.descripcion?.toLowerCase() || ""
        const precio = producto.precio?.toString() || ""
        const codigo = producto.codigo?.toLowerCase() || ""
        
        return (
          descripcion.includes(term) ||
          descripcionDetallada.includes(term) ||
          categoria.includes(term) ||
          marca.includes(term) ||
          precio.includes(term) ||
          codigo.includes(term)
        )
      })
    }

    // Filtro por categoría
    if (filterCategoria !== "all") {
      if (filterCategoria === "sin_categoria") {
        filtered = filtered.filter(producto =>
          !producto.fk_id_categoria || producto.fk_id_categoria === null
        )
      } else {
        filtered = filtered.filter(producto =>
          producto.fk_id_categoria?.toString() === filterCategoria
        )
      }
    }

    // Filtro por marca
    if (filterMarca !== "all") {
      filtered = filtered.filter(producto => 
        producto.fk_id_marca?.toString() === filterMarca
      )
    }

    // Filtro por estado (activo/inactivo)
    if (filterEstado !== "all") {
      const isActive = filterEstado === "activo"
      filtered = filtered.filter(producto => producto.activo === isActive)
    }

    return filtered
  }, [productos, searchTerm, filterCategoria, filterMarca, filterEstado])

  // Funciones de paginación
  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProductos = filteredProductos.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Funciones de selección de productos (definidas después de currentProductos)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Seleccionar TODOS los productos filtrados, no solo los de la página actual
      setSelectedProducts(new Set(filteredProductos.map(p => p.id)))
    } else {
      setSelectedProducts(new Set())
    }
  }

  const handleSelectProduct = (productId: number, checked: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(productId)
      } else {
        newSet.delete(productId)
      }
      return newSet
    })
  }

  // Función de exportación a Excel
  const handleExportToExcel = async () => {
    if (selectedProducts.size === 0) {
      alert('Por favor selecciona al menos un producto para exportar')
      return
    }

    setIsExporting(true)
    try {
      const productosAExportar = productos.filter(p => selectedProducts.has(p.id))

      const dataToExport = productosAExportar.map(producto => ({
        "Artículo": producto.codigo || '',
        "Desc. artículo": producto.descripcion,
        "Precio": producto.precio,
        "Agrupación": producto.categoria?.descripcion || '',
        "Marca": producto.marca?.descripcion || '',
        "Linea": categorias.find(c => c.id === producto.fk_id_categoria)?.fk_id_linea
          ? lineas.find(l => l.id === categorias.find(c => c.id === producto.fk_id_categoria)?.fk_id_linea)?.descripcion || ''
          : '',
        aplica_todos_plan: producto.aplica_todos_plan,
        precio_oferta: (producto as any).precio_oferta || '',
        descuento_porcentual: (producto as any).descuento_porcentual || '',
        fecha_vigencia_desde: (producto as any).fecha_vigencia_desde || '',
        fecha_vigencia_hasta: (producto as any).fecha_vigencia_hasta || ''
      }))

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Productos")

      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `productos_exportados_${fecha}.xlsx`)

      // Limpiar selección después de exportar
      setSelectedProducts(new Set())
    } catch (error) {
      console.error('Error exportando a Excel:', error)
      alert('Error al exportar los productos')
    } finally {
      setIsExporting(false)
    }
  }

  // Resetear página cuando cambie la vista, el número de productos, el término de búsqueda o los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [viewMode, filteredProductos.length, searchTerm, filterCategoria, filterMarca, filterEstado])

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Componente de paginación
  const Pagination = () => {
    if (totalPages <= 1) return null

    const getPageNumbers = () => {
      const pages = []
      const maxVisiblePages = 5
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 2) {
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i)
          }
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        }
      }
      
      return pages
    }

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-700">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProductos.length)} de {filteredProductos.length} productos
            {searchTerm && ` (filtrados de ${productos.length} total)`}
          </p>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {getPageNumbers().map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="px-3 py-1 text-sm text-gray-500">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page as number)}
                  className="h-8 w-8 p-0"
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Función helper para obtener todas las imágenes de un producto (memoizada)
  const getAllProductImages = React.useCallback((producto: Producto): string[] => {
    return [
      producto.imagen,
      producto.imagen_2,
      producto.imagen_3,
      producto.imagen_4,
      producto.imagen_5
    ].filter(img => img) as string[]
  }, [])

  const formatPrice = React.useCallback((price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }, [])

  // Función debounced para actualizar la descripción detallada
  const updateDescripcionDetallada = useCallback((content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setFormData(prev => ({ ...prev, descripcion_detallada: content }))
    }, 100)
  }, [])

  // Función para convertir color hex a código descriptivo
  const getColorCode = useCallback((color: string) => {
    const colorMappings: { [key: string]: string } = {
      '#000000': 'Negro',
      '#ffffff': 'Blanco',
      '#ff0000': 'Rojo',
      '#00ff00': 'Verde',
      '#0000ff': 'Azul',
      '#ffff00': 'Amarillo',
      '#ff00ff': 'Magenta',
      '#00ffff': 'Cian',
      '#808080': 'Gris',
      '#800000': 'Marrón',
      '#008000': 'Verde Oscuro',
      '#000080': 'Azul Marino',
      '#800080': 'Púrpura',
      '#808000': 'Oliva',
      '#008080': 'Verde Azulado'
    }
    return colorMappings[color.toLowerCase()] || color.toUpperCase()
  }, [])

  // Función para detectar el color actual en la selección
  const detectCurrentColor = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer as Element

    if (parentElement) {
      const computedStyle = window.getComputedStyle(parentElement as Element)
      const color = computedStyle.color
      
      // Convertir rgb a hex si es necesario
      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1])
        const g = parseInt(rgbMatch[2])
        const b = parseInt(rgbMatch[3])
        const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        setCurrentColor(hexColor)
        setCurrentColorCode(getColorCode(hexColor))
      } else if (color.startsWith('#')) {
        setCurrentColor(color)
        setCurrentColorCode(getColorCode(color))
      }
    }
  }, [getColorCode])

  const resetForm = () => {
    setFormData({
      descripcion: "",
      descripcion_detallada: "",
      precio: "",
      codigo: "",
      fk_id_categoria: undefined,
      fk_id_marca: undefined,
      imagenes: [],
      destacado: false,
      activo: true,
      tiene_stock: true,
      aplica_todos_plan: false,
      aplica_solo_categoria: false,
      aplica_plan_especial: false,
      precio_oferta: "",
      descuento_porcentual: "",
      fecha_vigencia_desde: "",
      fecha_vigencia_hasta: ""
    })
    setEditingProduct(null)
    setCurrentImageIndex(0)
    setCurrentColor("#000000")
    setCurrentColorCode("")
  }

  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto)
    // Recopilar todas las URLs de imagen en un array, filtrando nulos/indefinidos/cadenas vacías
    const productImages = [
      producto.imagen,
      producto.imagen_2,
      producto.imagen_3,
      producto.imagen_4,
      producto.imagen_5,
    ].filter(Boolean) as string[];

    setFormData({
      descripcion: producto.descripcion || "",
      descripcion_detallada: producto.descripcion_detallada || "",
      precio: producto.precio?.toString() || "",
      codigo: producto.codigo || "",
      fk_id_categoria: producto.fk_id_categoria?.toString(),
      fk_id_marca: producto.fk_id_marca?.toString(),
      imagenes: productImages,
      destacado: producto.destacado || false,
      activo: producto.activo ?? true,
      tiene_stock: producto.tiene_stock ?? true,
      aplica_todos_plan: producto.aplica_todos_plan || false,
      aplica_solo_categoria: producto.aplica_solo_categoria || false,
      aplica_plan_especial: producto.aplica_plan_especial || false,
      precio_oferta: (producto as any).precio_oferta?.toString() || "",
      descuento_porcentual: (producto as any).descuento_porcentual?.toString() || "",
      fecha_vigencia_desde: (producto as any).fecha_vigencia_desde || "",
      fecha_vigencia_hasta: (producto as any).fecha_vigencia_hasta || ""
    })
    setCurrentImageIndex(0)
    setTimeout(() => {
      setIsDialogOpen(true)
      // Inicializar el contenido del editor enriquecido después de que se renderice
      setTimeout(() => {
        const editor = document.getElementById('rich-editor')
        if (editor) {
          editor.innerHTML = producto.descripcion_detallada || ''
        }
      }, 150)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      // Si estamos editando, eliminar imágenes que ya no están en el array
      if (editingProduct) {
        const originalImages = [
          editingProduct.imagen,
          editingProduct.imagen_2,
          editingProduct.imagen_3,
          editingProduct.imagen_4,
          editingProduct.imagen_5
        ].filter(Boolean) as string[]

        const imagesToRemove = originalImages.filter(img => !formData.imagenes.includes(img))
        
        // Eliminar imágenes del storage que ya no están en el array
        for (const imageUrl of imagesToRemove) {
          try {
            // Verificar si la imagen es de Supabase o externa
            const isSupabaseImage = imageUrl.includes('supabase.co')
            
            if (isSupabaseImage) {
              const filePath = extractFilePathFromUrl(imageUrl)
              console.log('Eliminando imagen de Supabase:', { imageUrl, filePath })
              
              const { error } = await supabase.storage
                .from('imagenes')
                .remove([filePath])
              
              if (error) {
                console.error('Error eliminando imagen del storage:', error)
              } else {
                console.log('Imagen eliminada exitosamente del storage:', filePath)
              }
            } else {
              console.log('Imagen externa (no se puede eliminar del servidor externo):', imageUrl)
            }
          } catch (error) {
            console.error('Error al eliminar imagen:', error)
          }
        }
      }

          const productoData = {
        descripcion: formData.descripcion,
        descripcion_detallada: formData.descripcion_detallada || undefined,
        precio: parseFloat(formData.precio),
        codigo: formData.codigo?.trim() || undefined,
        fk_id_categoria: formData.fk_id_categoria ? parseInt(formData.fk_id_categoria) : undefined,
        fk_id_marca: formData.fk_id_marca ? parseInt(formData.fk_id_marca) : undefined,
        // Mapear el array de imágenes a los campos individuales de la base de datos
        // Asegurar que los campos se limpien cuando no hay imágenes
        imagen: formData.imagenes[0] && formData.imagenes[0].trim() !== '' ? formData.imagenes[0] : undefined,
        imagen_2: formData.imagenes[1] && formData.imagenes[1].trim() !== '' ? formData.imagenes[1] : undefined,
        imagen_3: formData.imagenes[2] && formData.imagenes[2].trim() !== '' ? formData.imagenes[2] : undefined,
        imagen_4: formData.imagenes[3] && formData.imagenes[3].trim() !== '' ? formData.imagenes[3] : undefined,
        imagen_5: formData.imagenes[4] && formData.imagenes[4].trim() !== '' ? formData.imagenes[4] : undefined,
        destacado: formData.destacado,
        activo: formData.activo,
        tiene_stock: formData.tiene_stock,
        aplica_todos_plan: formData.aplica_todos_plan,
        aplica_solo_categoria: formData.aplica_solo_categoria,
        aplica_plan_especial: formData.aplica_plan_especial,
        precio_oferta: formData.precio_oferta ? parseFloat(formData.precio_oferta) : undefined,
        descuento_porcentual: formData.descuento_porcentual ? parseFloat(formData.descuento_porcentual) : undefined,
        fecha_vigencia_desde: formData.fecha_vigencia_desde || undefined,
        fecha_vigencia_hasta: formData.fecha_vigencia_hasta || undefined
      }

      console.log('Guardando producto con imágenes:', {
        imagenes: formData.imagenes,
        imagen: productoData.imagen,
        imagen_2: productoData.imagen_2,
        imagen_3: productoData.imagen_3,
        imagen_4: productoData.imagen_4,
        imagen_5: productoData.imagen_5
      })
      
      // Verificar si se están limpiando los campos
      const camposLimpios = Object.entries(productoData)
        .filter(([key, value]) => key.startsWith('imagen') && value === undefined)
        .map(([key]) => key)
      
      if (camposLimpios.length > 0) {
        console.log('✅ Campos de imagen que se van a limpiar en la BD:', camposLimpios)
      }


      
      if (editingProduct) {
        await onUpdateProducto(editingProduct.id, productoData)
      } else {
        await onCreateProducto(productoData)
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error al guardar producto:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClick = (producto: Producto) => {
    setProductToDelete(producto)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      // Eliminar todas las imágenes del producto del storage
      const productImages = [
        productToDelete.imagen,
        productToDelete.imagen_2,
        productToDelete.imagen_3,
        productToDelete.imagen_4,
        productToDelete.imagen_5
      ].filter(Boolean) as string[]

            for (const imageUrl of productImages) {
        try {
          // Verificar si la imagen es de Supabase o externa
          const isSupabaseImage = imageUrl.includes('supabase.co')
          
          if (isSupabaseImage) {
            const filePath = extractFilePathFromUrl(imageUrl)
            console.log('Eliminando imagen de Supabase del producto:', { imageUrl, filePath })
            
            const { error } = await supabase.storage
              .from('imagenes')
              .remove([filePath])
            
            if (error) {
              console.error('Error eliminando imagen del storage:', error)
            } else {
              console.log('Imagen eliminada exitosamente del storage:', filePath)
            }
          } else {
            console.log('Imagen externa del producto (no se puede eliminar del servidor externo):', imageUrl)
          }
        } catch (error) {
          console.error('Error al eliminar imagen:', error)
        }
      }

      await onDeleteProducto(productToDelete.id)
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  // Función para limpiar todas las imágenes de un producto
  const handleClearImages = async (producto: Producto) => {
    try {
      console.log('Limpiando todas las imágenes del producto:', producto.id)
      
      // Obtener todas las imágenes del producto
      const productImages = [
        producto.imagen,
        producto.imagen_2,
        producto.imagen_3,
        producto.imagen_4,
        producto.imagen_5
      ].filter(Boolean) as string[]

      // Eliminar imágenes de Supabase storage si existen
      for (const imageUrl of productImages) {
        try {
          const isSupabaseImage = imageUrl.includes('supabase.co')
          
          if (isSupabaseImage) {
            const filePath = extractFilePathFromUrl(imageUrl)
            console.log('Eliminando imagen de Supabase:', filePath)
            
            const { error } = await supabase.storage
              .from('imagenes')
              .remove([filePath])
            
            if (error) {
              console.error('Error eliminando imagen del storage:', error)
            } else {
              console.log('Imagen eliminada exitosamente del storage:', filePath)
            }
          } else {
            console.log('Imagen externa (no se puede eliminar del servidor externo):', imageUrl)
          }
        } catch (error) {
          console.error('Error al eliminar imagen:', error)
        }
      }

      // Limpiar todos los campos de imagen en la base de datos
      const updates = {
        imagen: undefined,
        imagen_2: undefined,
        imagen_3: undefined,
        imagen_4: undefined,
        imagen_5: undefined
      }

      console.log('Limpiando campos de imagen en la BD:', updates)
      await onUpdateProducto(producto.id, updates)
      console.log('✅ Imágenes eliminadas exitosamente del producto:', producto.id)
      
    } catch (error) {
      console.error('Error al limpiar imágenes del producto:', error)
    }
  }

  // Función helper para extraer el path del archivo de una URL de Supabase
  const extractFilePathFromUrl = (imageUrl: string): string => {
    try {
      // Las URLs de Supabase tienen formato: https://xxx.supabase.co/storage/v1/object/public/imagenes/productos/filename.jpg
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/')
      
      // Buscar el índice de 'imagenes' en el path
      const imagenesIndex = pathParts.findIndex(part => part === 'imagenes')
      if (imagenesIndex !== -1 && imagenesIndex + 2 < pathParts.length) {
        // Tomar todo después de 'imagenes' (incluyendo 'productos/filename.jpg')
        const filePath = pathParts.slice(imagenesIndex + 1).join('/')
        return filePath
      }
      
      // Fallback: extraer solo el nombre del archivo
      const fileName = pathParts[pathParts.length - 1]
      return `productos/${fileName}`
    } catch (error) {
      console.error('Error extrayendo path de URL:', error)
      // Fallback: extraer solo el nombre del archivo
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      return `productos/${fileName}`
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setProductToDelete(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
        <CardTitle>Gestión de Productos</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-2"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
              {selectedProducts.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={isExporting}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exportando..." : `Exportar (${selectedProducts.size})`}
                </Button>
              )}
              <ImageImporter productos={productos} onUpdateProducto={onUpdateProducto} />
              <CodigoMigrator 
                productos={productos}
                onProductoUpdated={() => {
                  // Recargar los productos después de actualizar códigos
                  window.location.reload()
                }}
              />
              <ExcelMigrator 
                productos={productos} 
                categorias={categorias} 
                marcas={marcas} 
                lineas={lineas}
                onMigrationCompleted={() => {
                  // Recargar los productos solo cuando se cierre el popup después de cambios
                  window.location.reload()
                }}
              />
                                              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (open) {
                      setIsDialogOpen(true)
                    }
                  }}>
                    <DialogTrigger asChild>
                  <Button onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                    // Limpiar el editor para nuevo producto
                    setTimeout(() => {
                      const editor = document.getElementById('rich-editor')
                      if (editor) {
                        editor.innerHTML = ''
                      }
                    }, 150)
                  }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Producto
                      </Button>
                    </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
                  <div>
                      <DialogHeader>
                        <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-4 top-4"
                          onClick={() => {
                            setIsDialogOpen(false)
                            resetForm()
                          }}
                          disabled={isCreating}
                        >
                          ✕
                        </Button>
                      </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    required
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Código del producto"
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor="precio">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => handlePrecioChange(e.target.value)}
                    required
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* Campos de promoción */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-base font-semibold">Promoción / Oferta</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="descuento_porcentual">Descuento (%)</Label>
                    <Input
                      id="descuento_porcentual"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.descuento_porcentual}
                      onChange={(e) => handleDescuentoChange(e.target.value)}
                      placeholder="Ej: 15"
                      disabled={isCreating}
                    />
                    <p className="text-xs text-gray-500 mt-1">Se calculará automáticamente el precio oferta</p>
                  </div>
                  <div>
                    <Label htmlFor="precio_oferta">Precio Oferta</Label>
                    <Input
                      id="precio_oferta"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precio_oferta}
                      onChange={(e) => handlePrecioOfertaChange(e.target.value)}
                      placeholder="Ej: 42500"
                      disabled={isCreating}
                    />
                    <p className="text-xs text-gray-500 mt-1">Se calculará automáticamente el descuento</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fecha_vigencia_desde">Vigencia Desde</Label>
                    <Input
                      id="fecha_vigencia_desde"
                      type="date"
                      value={formData.fecha_vigencia_desde}
                      onChange={(e) => setFormData({ ...formData, fecha_vigencia_desde: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fecha_vigencia_hasta">Vigencia Hasta</Label>
                    <Input
                      id="fecha_vigencia_hasta"
                      type="date"
                      value={formData.fecha_vigencia_hasta}
                      onChange={(e) => setFormData({ ...formData, fecha_vigencia_hasta: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="descripcion_detallada">Descripción Detallada (opcional)</Label>
                
                {/* Barra de herramientas de formato */}
                <div className="flex flex-wrap gap-2 p-2 border rounded-t-lg bg-gray-50">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      document.execCommand('bold', false, undefined)
                    }}
                    disabled={isCreating}
                    title="Negrita"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      document.execCommand('italic', false, undefined)
                    }}
                    disabled={isCreating}
                    title="Cursiva"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      document.execCommand('underline', false, undefined)
                    }}
                    disabled={isCreating}
                    title="Subrayado"
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                  
                  <div className="border-l mx-2" />
                  
                  <select
                    className="text-xs border rounded px-2 py-1"
                    onChange={(e) => {
                      document.execCommand('fontSize', false, e.target.value)
                    }}
                    disabled={isCreating}
                    title="Tamaño de fuente"
                    defaultValue="3"
                  >
                    <option value="1">Muy pequeño</option>
                    <option value="2">Pequeño</option>
                    <option value="3">Normal</option>
                    <option value="4">Grande</option>
                    <option value="5">Muy grande</option>
                    <option value="6">Extra grande</option>
                  </select>
                  
                  <select
                    className="text-xs border rounded px-2 py-1"
                    onChange={(e) => {
                      document.execCommand('fontName', false, e.target.value)
                    }}
                    disabled={isCreating}
                    title="Tipografía"
                    defaultValue="Arial"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Tahoma">Tahoma</option>
                  </select>
                  
                  <input
                    type="color"
                    value={currentColor}
                    className="w-8 h-8 border rounded cursor-pointer"
                    onChange={(e) => {
                      const newColor = e.target.value
                      setCurrentColor(newColor)
                      setCurrentColorCode(getColorCode(newColor))
                      document.execCommand('foreColor', false, newColor)
                    }}
                    disabled={isCreating}
                    title="Color de texto"
                  />
                  
                  <div className="border-l mx-2" />
                  
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs font-medium text-gray-600">Código:</Label>
                    <Input
                      value={currentColorCode}
                      onChange={(e) => {
                        setCurrentColorCode(e.target.value)
                      }}
                      className="w-20 h-6 text-xs"
                      placeholder="Color"
                      disabled={isCreating}
                      title="Código del color actual"
                    />
                    <div 
                      className="w-4 h-4 border border-gray-300 rounded"
                      style={{ backgroundColor: currentColor }}
                      title={`Color actual: ${currentColor}`}
                    />
                  </div>
                  
                  <div className="border-l mx-2" />
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                    onClick={() => {
                      const editor = document.getElementById('rich-editor')
                      if (editor) {
                        editor.innerHTML = ''
                        setFormData({ ...formData, descripcion_detallada: '' })
                      }
                    }}
                    disabled={isCreating}
                    title="Limpiar formato"
                  >
                    Limpiar
                  </Button>
                </div>
                
                {/* Editor de texto enriquecido */}
                <div
                  id="rich-editor"
                  contentEditable
                  className="min-h-[120px] p-3 border border-t-0 rounded-b-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0
                  }}
                  onInput={(e) => {
                    const content = e.currentTarget.innerHTML
                    updateDescripcionDetallada(content)
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    const text = e.clipboardData?.getData('text/plain') || ''
                    document.execCommand('insertText', false, text)
                  }}
                  onMouseUp={detectCurrentColor}
                  onKeyUp={detectCurrentColor}
                  onFocus={detectCurrentColor}
                  onClick={detectCurrentColor}
                  suppressContentEditableWarning={true}
                />
                
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoria">Categoría</Label>
                  <Select
                    value={formData.fk_id_categoria}
                    onValueChange={(value) => setFormData({ ...formData, fk_id_categoria: value })}
                    disabled={isCreating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id.toString()}>
                          {categoria.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="marca">Marca</Label>
                  <Select
                    value={formData.fk_id_marca}
                    onValueChange={(value) => setFormData({ ...formData, fk_id_marca: value })}
                    disabled={isCreating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas.map((marca) => (
                        <SelectItem key={marca.id} value={marca.id.toString()}>
                          {marca.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Imágenes del Producto</Label>
                          {formData.imagenes.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('Eliminando todas las imágenes del formulario')
                                setFormData({ ...formData, imagenes: [] })
                                setCurrentImageIndex(0)
                              }}
                              disabled={isCreating}
                            >
                              Eliminar todas las imágenes
                            </Button>
                          )}
                        </div>
                        
                        {/* Vista previa de imágenes con navegación */}
                        {formData.imagenes.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>Vista previa de imágenes</span>
                              <span>{currentImageIndex + 1} de {formData.imagenes.length}</span>
                            </div>
                            
                            <div className="relative">
                              <div className="aspect-square w-full max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden border">
                                <img
                                  src={formData.imagenes[currentImageIndex]}
                                  alt={`Imagen ${currentImageIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder.jpg'
                                  }}
                                />
                              </div>
                              
                              {/* Botón eliminar imagen actual */}
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2 h-8 w-8 p-0"
                                onClick={async () => {
                                  const imageUrl = formData.imagenes[currentImageIndex]
                                  
                                  // Eliminar imagen del storage si es de Supabase
                                  if (imageUrl.includes('supabase.co')) {
                                    try {
                                      const filePath = extractFilePathFromUrl(imageUrl)
                                      console.log('Eliminando imagen de Supabase:', filePath)
                                      
                                      const { error } = await supabase.storage
                                        .from('imagenes')
                                        .remove([filePath])
                                      
                                      if (error) {
                                        console.error('Error eliminando imagen del storage:', error)
                                      }
                                    } catch (error) {
                                      console.error('Error al eliminar imagen:', error)
                                    }
                                  }
                                  
                                  // Eliminar de la lista
                                  const newImages = formData.imagenes.filter((_, i) => i !== currentImageIndex)
                                  setFormData({ ...formData, imagenes: newImages })
                                  
                                  // Ajustar índice
                                  if (currentImageIndex >= newImages.length && newImages.length > 0) {
                                    setCurrentImageIndex(newImages.length - 1)
                                  } else if (newImages.length === 0) {
                                    setCurrentImageIndex(0)
                                  }
                                }}
                                disabled={isCreating}
                                title="Eliminar imagen actual"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              
                              {formData.imagenes.length > 1 && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                                    onClick={() => {
                                      setCurrentImageIndex(prev => 
                                        prev === 0 ? formData.imagenes.length - 1 : prev - 1
                                      )
                                    }}
                                    disabled={isCreating}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                                    onClick={() => {
                                      setCurrentImageIndex(prev => 
                                        prev === formData.imagenes.length - 1 ? 0 : prev + 1
                                      )
                                    }}
                                    disabled={isCreating}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                            
                            {formData.imagenes.length > 1 && (
                              <div className="flex justify-center space-x-1">
                                {formData.imagenes.map((_, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    className={`w-2 h-2 rounded-full ${
                                      index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                                    onClick={() => setCurrentImageIndex(index)}
                                    disabled={isCreating}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Sección de subida de imágenes */}
                        <div className="space-y-3">
                          <Label>Subir nuevas imágenes</Label>
                          <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
                            onDrop={async (e) => {
                              e.preventDefault()
                              if (isCreating) return
                              
                              const files = e.dataTransfer.files
                              if (files.length === 0) return
                              
                              const remainingSlots = 5 - formData.imagenes.length
                              if (remainingSlots <= 0) {
                                alert('Ya tienes el máximo de 5 imágenes')
                                return
                              }
                              
                              const filesToUpload = Array.from(files).slice(0, remainingSlots)
                              
                              try {
                                const uploadPromises = filesToUpload.map(async (file) => {
                                  if (!file.type.startsWith('image/')) {
                                    throw new Error('Solo se permiten archivos de imagen')
                                  }
                                  if (file.size > 5 * 1024 * 1024) {
                                    throw new Error('El archivo es demasiado grande. Máximo 5MB')
                                  }
                                  
                                  const fileExt = file.name.split('.').pop()
                                  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                                  const filePath = `productos/${fileName}`
                                  
                                  const { data, error } = await supabase.storage
                                    .from('imagenes')
                                    .upload(filePath, file, {
                                      cacheControl: '3600',
                                      upsert: false
                                    })
                                  
                                  if (error) throw error
                                  
                                  const { data: { publicUrl } } = supabase.storage
                                    .from('imagenes')
                                    .getPublicUrl(filePath)
                                  
                                  return publicUrl
                                })
                                
                                const uploadedUrls = await Promise.all(uploadPromises)
                                setFormData({ ...formData, imagenes: [...formData.imagenes, ...uploadedUrls] })
                              } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : 'Error al subir imagen'
                                alert(errorMessage)
                              }
                            }}
                            onDragOver={(e) => e.preventDefault()}
                          >
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={async (e) => {
                                if (isCreating) return
                                
                                const files = e.target.files
                                if (!files || files.length === 0) return
                                
                                const remainingSlots = 5 - formData.imagenes.length
                                if (remainingSlots <= 0) {
                                  alert('Ya tienes el máximo de 5 imágenes')
                                  return
                                }
                                
                                const filesToUpload = Array.from(files).slice(0, remainingSlots)
                                
                                try {
                                  const uploadPromises = filesToUpload.map(async (file) => {
                                    if (!file.type.startsWith('image/')) {
                                      throw new Error('Solo se permiten archivos de imagen')
                                    }
                                    if (file.size > 5 * 1024 * 1024) {
                                      throw new Error('El archivo es demasiado grande. Máximo 5MB')
                                    }
                                    
                                    const fileExt = file.name.split('.').pop()
                                    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                                    const filePath = `productos/${fileName}`
                                    
                                    const { data, error } = await supabase.storage
                                      .from('imagenes')
                                      .upload(filePath, file, {
                                        cacheControl: '3600',
                                        upsert: false
                                      })
                                    
                                    if (error) throw error
                                    
                                    const { data: { publicUrl } } = supabase.storage
                                      .from('imagenes')
                                      .getPublicUrl(filePath)
                                    
                                    return publicUrl
                                  })
                                  
                                  const uploadedUrls = await Promise.all(uploadPromises)
                                  setFormData({ ...formData, imagenes: [...formData.imagenes, ...uploadedUrls] })
                                } catch (error) {
                                  const errorMessage = error instanceof Error ? error.message : 'Error al subir imagen'
                                  alert(errorMessage)
                                }
                                
                                e.target.value = ''
                              }}
                              className="hidden"
                              id="image-upload-simple"
                              disabled={isCreating}
                            />
                            <label htmlFor="image-upload-simple" className="cursor-pointer">
                              <div className="flex flex-col items-center space-y-2">
                                <Plus className="h-8 w-8 text-gray-400" />
                                <p className="text-sm font-medium text-gray-700">
                                  Arrastra imágenes aquí o haz clic para seleccionar
                                </p>
                                <p className="text-xs text-gray-500">
                                  PNG, JPG, GIF hasta 5MB. Tienes {formData.imagenes.length}/5 imágenes
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Configuración</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="destacado"
                      checked={formData.destacado}
                      onCheckedChange={(checked) => setFormData({ ...formData, destacado: checked })}
                      disabled={isCreating}
                    />
                    <Label htmlFor="destacado">Destacado</Label>
                  </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="activo"
                              checked={formData.activo}
                              onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                              disabled={isCreating}
                            />
                            <Label htmlFor="activo">Activo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="tiene_stock"
                              checked={formData.tiene_stock}
                              onCheckedChange={(checked) => setFormData({ ...formData, tiene_stock: checked })}
                              disabled={isCreating}
                            />
                            <Label htmlFor="tiene_stock">Tiene Stock</Label>
                          </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aplica_todos_plan"
                      checked={formData.aplica_todos_plan}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_todos_plan: checked })}
                      disabled={isCreating}
                    />
                    <Label htmlFor="aplica_todos_plan">Aplica a todos los planes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aplica_solo_categoria"
                      checked={formData.aplica_solo_categoria}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_solo_categoria: checked })}
                      disabled={isCreating}
                    />
                    <Label htmlFor="aplica_solo_categoria">Aplica solo a categoría</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aplica_plan_especial"
                      checked={formData.aplica_plan_especial}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_plan_especial: checked })}
                      disabled={isCreating}
                    />
                            <Label htmlFor="aplica_plan_especial">Aplica a plan especial</Label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Creando..." : editingProduct ? "Actualizar" : "Crear"} Producto
              </Button>
            </form>
                  </div>
          </DialogContent>
        </Dialog>
            </div>
        </div>
      </CardHeader>
        
        {/* Filtros y contador de selección */}
        <div className="px-6 py-4 border-b bg-gray-50">
          {selectedProducts.size > 0 && (
            <div className="mb-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-sm text-blue-700 font-medium">
                {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
                {filteredProductos.length > 0 && ` de ${filteredProductos.length} total${filteredProductos.length !== 1 ? 'es' : ''}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProducts(new Set())}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                Limpiar selección
              </Button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="sin_categoria">Sin categoría</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id.toString()}>
                      {categoria.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterMarca} onValueChange={setFilterMarca}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {marcas.map((marca) => (
                    <SelectItem key={marca.id} value={marca.id.toString()}>
                      {marca.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
      <CardContent>
        {viewMode === 'table' ? (
            <>
          <Table>
            <TableHeader>
                          <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredProductos.length > 0 && filteredProductos.every(p => selectedProducts.has(p.id))}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todos los productos"
                  title={`Seleccionar todos (${filteredProductos.length} productos)`}
                />
              </TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Desc. Det.</TableHead>
              <TableHead>Imágenes</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Precio Oferta</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Destacado</TableHead>
                    <TableHead>Activo</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Aplica Planes</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
                  {currentProductos.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.has(producto.id)}
                      onCheckedChange={(checked) => handleSelectProduct(producto.id, checked as boolean)}
                      aria-label={`Seleccionar ${producto.descripcion}`}
                    />
                  </TableCell>
                  <TableCell>
                    {producto.codigo ? (
                      <span 
                        className="font-mono text-sm bg-gray-100 px-2 py-1 rounded"
                        title={`ID: ${producto.id}`}
                      >
                        {producto.codigo}
                      </span>
                    ) : (
                      <span 
                        className="text-gray-400 text-xs"
                        title={`ID: ${producto.id}`}
                      >
                        Sin código
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{producto.descripcion}</TableCell>
                  <TableCell>
                    {producto.descripcion_detallada ? (
                        <div 
                          className="text-sm text-gray-600 max-w-[150px] truncate"
                          dangerouslySetInnerHTML={{
                            __html: producto.descripcion_detallada.length > 70 
                              ? `${producto.descripcion_detallada.substring(0, 70)}...` 
                              : producto.descripcion_detallada
                          }}
                        />
                    ) : (
                          <span className="text-gray-400 text-xs">Sin descripción</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {producto.imagen ? (
                        <>
                          <div className="w-12 h-12 border rounded overflow-hidden">
                            <img
                              src={producto.imagen}
                              alt={`${producto.descripcion} - Imagen principal`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.jpg'
                              }}
                            />
                          </div>
                          {getAllProductImages(producto).length > 1 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              +{getAllProductImages(producto).length - 1}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin imágenes</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{producto.categoria?.descripcion || '-'}</TableCell>
                  <TableCell>{producto.marca?.descripcion || '-'}</TableCell>
                  <TableCell>{formatPrice(producto.precio)}</TableCell>
                  <TableCell>
                    {(producto as any).precio_oferta ? (
                      <span className="text-green-600 font-semibold">
                        {formatPrice((producto as any).precio_oferta)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(producto as any).descuento_porcentual ? (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                        {(producto as any).descuento_porcentual}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(producto as any).fecha_vigencia_desde && (producto as any).fecha_vigencia_hasta ? (
                      <div className="text-xs">
                        <div>{formatDateFromDB((producto as any).fecha_vigencia_desde)}</div>
                        <div className="text-gray-500">hasta</div>
                        <div>{formatDateFromDB((producto as any).fecha_vigencia_hasta)}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        producto.destacado ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {producto.destacado ? "Destacado" : "Normal"}
                    </span>
                  </TableCell>
                      <TableCell>
                        <Switch
                          checked={producto.activo ?? true}
                          onCheckedChange={async (checked) => {
                            try {
                              await onUpdateProducto(producto.id, { activo: checked })
                            } catch (error) {
                              console.error('Error al actualizar activo:', error)
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={producto.tiene_stock ?? true}
                          onCheckedChange={async (checked) => {
                            try {
                              await onUpdateProducto(producto.id, { tiene_stock: checked })
                            } catch (error) {
                              console.error('Error al actualizar stock:', error)
                            }
                          }}
                        />
                      </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {producto.aplica_todos_plan && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Todos
                        </span>
                      )}
                      {producto.aplica_solo_categoria && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Categoría
                        </span>
                      )}
                      {producto.aplica_plan_especial && (
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          Especial
                        </span>
                      )}
                      {!producto.aplica_todos_plan && !producto.aplica_solo_categoria && !producto.aplica_plan_especial && (
                        <span className="text-gray-400 text-xs">Ninguno</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(producto)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {getAllProductImages(producto).length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleClearImages(producto)}
                          title="Limpiar todas las imágenes"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(producto)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
              <Pagination />
            </>
        ) : (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {currentProductos.map((producto) => (
              <Card key={producto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-100 relative">
                  {producto.imagen ? (
                      <img
                        src={producto.imagen}
                        alt={producto.descripcion}
                        className="w-full h-full object-cover"
                          loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg'
                        }}
                      />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <div className="text-gray-400 text-center">
                        <div className="text-2xl mb-2">📷</div>
                        <div className="text-xs">Sin imagen</div>
                      </div>
                    </div>
                  )}
                  {producto.destacado && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        ⭐
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm line-clamp-2 flex-1">
                        {producto.descripcion}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2">
                        {producto.codigo ? (
                          <span className="font-mono" title={`ID: ${producto.id}`}>
                            {producto.codigo}
                          </span>
                        ) : (
                          <span title={`ID: ${producto.id}`}>
                            #{producto.id}
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="text-lg font-bold text-green-600">
                      {formatPrice(producto.precio)}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 text-xs">
                      {producto.categoria && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {producto.categoria.descripcion}
                        </span>
                      )}
                      {producto.marca && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {producto.marca.descripcion}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 text-xs">
                      {producto.aplica_todos_plan && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                          Todos
                        </span>
                      )}
                      {producto.aplica_solo_categoria && (
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                          Categoría
                        </span>
                      )}
                      {producto.aplica_plan_especial && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">
                          Especial
                        </span>
                      )}
                      {!producto.aplica_todos_plan && !producto.aplica_solo_categoria && !producto.aplica_plan_especial && (
                        <span className="bg-gray-50 text-gray-500 px-2 py-1 rounded border border-gray-200">
                          Sin planes
                        </span>
                      )}
                    </div>
                    
                    {producto.descripcion_detallada && (
                      <div 
                        className="text-xs text-gray-600 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: producto.descripcion_detallada
                        }}
                      />
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-gray-600">Stock:</span>
                      <Switch
                        size="sm"
                        checked={producto.tiene_stock ?? true}
                        onCheckedChange={async (checked) => {
                          try {
                            await onUpdateProducto(producto.id, { tiene_stock: checked })
                          } catch (error) {
                            console.error('Error al actualizar stock:', error)
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-600">Activo:</span>
                      <Switch
                        size="sm"
                        checked={producto.activo ?? true}
                        onCheckedChange={async (checked) => {
                          try {
                            await onUpdateProducto(producto.id, { activo: checked })
                          } catch (error) {
                            console.error('Error al actualizar activo:', error)
                          }
                        }}
                      />
                    </div>
                    
                    <div className="flex gap-1 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(producto)}
                        className="flex-1 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteClick(producto)}
                        className="flex-1 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
              <Pagination />
            </>
        )}
      </CardContent>
    </Card>

    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-gray-700 text-sm">
              ¿Estás seguro de que quieres eliminar el producto <strong>"{productToDelete?.descripcion}"</strong>?
            </p>
          </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <span className="font-medium text-yellow-800 text-sm">Atención</span>
              </div>
              <p className="text-yellow-700 text-xs mt-1">
                Esta acción no se puede deshacer. El producto será eliminado permanentemente.
              </p>
            </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleDeleteCancel} size="sm">
            Cancelar
          </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              size="sm"
            >
              Eliminar
            </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
})
