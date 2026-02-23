"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Producto {
  id: string
  descripcion: string
  codigo: string
  precio: number
}

interface Promo {
  id?: string
  nombre: string
  descripcion: string
  descuento_porcentaje: number
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
}

interface PromoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  promo?: Promo & { productos?: string[] }
  onSuccess: () => void
}

export function PromoModal({ open, onOpenChange, promo, onSuccess }: PromoModalProps) {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [productos, setProductos] = useState<Producto[]>([])
  const [selectedProductos, setSelectedProductos] = useState<Set<string>>(new Set())
  const [loadingProductos, setLoadingProductos] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    descuento_porcentaje: "",
    fecha_inicio: "",
    fecha_fin: "",
    activa: true
  })

  useEffect(() => {
    if (open) {
      loadProductos()
      if (promo) {
        setFormData({
          nombre: promo.nombre,
          descripcion: promo.descripcion || "",
          descuento_porcentaje: promo.descuento_porcentaje.toString(),
          fecha_inicio: promo.fecha_inicio.split('T')[0],
          fecha_fin: promo.fecha_fin.split('T')[0],
          activa: promo.activa
        })
        setSelectedProductos(new Set(promo.productos || []))
      } else {
        resetForm()
      }
    }
  }, [open, promo])

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      descuento_porcentaje: "",
      fecha_inicio: "",
      fecha_fin: "",
      activa: true
    })
    setSelectedProductos(new Set())
    setSearchTerm("")
  }

  const loadProductos = async () => {
    setLoadingProductos(true)
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id, descripcion, codigo, precio")
        .order("descripcion")

      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      console.error("Error cargando productos:", error)
      toast.error("Error al cargar productos")
    } finally {
      setLoadingProductos(false)
    }
  }

  const toggleProducto = (productoId: string) => {
    const newSelected = new Set(selectedProductos)
    if (newSelected.has(productoId)) {
      newSelected.delete(productoId)
    } else {
      newSelected.add(productoId)
    }
    setSelectedProductos(newSelected)
  }

  const filteredProductos = productos.filter(p =>
    p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      const promoData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        descuento_porcentaje: parseFloat(formData.descuento_porcentaje),
        fecha_inicio: `${formData.fecha_inicio}T00:00:00`,
        fecha_fin: `${formData.fecha_fin}T23:59:59`,
        activa: formData.activa
      }

      let promoId: string

      if (promo?.id) {
        // Actualizar promo existente
        const { error: updateError } = await supabase
          .from("promos")
          .update(promoData)
          .eq("id", promo.id)

        if (updateError) throw updateError
        promoId = promo.id

        // Eliminar TODOS los productos anteriores
        const { error: deleteError } = await supabase
          .from("promo_productos")
          .delete()
          .eq("promo_id", promoId)

        if (deleteError) {
          console.error("Error eliminando productos anteriores:", deleteError)
          throw deleteError
        }
      } else {
        // Crear nueva promo
        const { data: newPromo, error: insertError } = await supabase
          .from("promos")
          .insert(promoData)
          .select()
          .single()

        if (insertError) throw insertError
        promoId = newPromo.id
      }

      // Insertar productos seleccionados (solo si hay productos)
      if (selectedProductos.size > 0) {
        const promoProductos = Array.from(selectedProductos).map(productoId => ({
          promo_id: promoId,
          producto_id: productoId
        }))

        const { error: productosError } = await supabase
          .from("promo_productos")
          .insert(promoProductos)

        if (productosError) {
          console.error("Error insertando productos:", productosError)
          throw productosError
        }
      }

      toast.success(promo?.id ? "Promo actualizada" : "Promo creada exitosamente")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error guardando promo:", error)
      toast.error("Error al guardar la promo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{promo?.id ? "Editar" : "Nueva"} Promoción</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descuento">Descuento (%) *</Label>
              <Input
                id="descuento"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.descuento_porcentaje}
                onChange={(e) => setFormData({ ...formData, descuento_porcentaje: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio *</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha Fin *</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="activa"
              checked={formData.activa}
              onCheckedChange={(checked) => setFormData({ ...formData, activa: checked as boolean })}
            />
            <Label htmlFor="activa" className="cursor-pointer">Promo activa</Label>
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label>Productos en la promoción *</Label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar productos por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {loadingProductos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {filteredProductos.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No se encontraron productos
                    </div>
                  ) : (
                    filteredProductos.map((producto) => (
                      <div
                        key={producto.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                      >
                        <Checkbox
                          checked={selectedProductos.has(producto.id)}
                          onCheckedChange={() => toggleProducto(producto.id)}
                        />
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => toggleProducto(producto.id)}
                        >
                          <div className="font-medium">{producto.descripcion}</div>
                          <div className="text-sm text-gray-500">
                            {producto.codigo} - ${producto.precio.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              {selectedProductos.size} producto{selectedProductos.size !== 1 ? 's' : ''} seleccionado{selectedProductos.size !== 1 ? 's' : ''}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {promo?.id ? "Actualizar" : "Crear"} Promo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
