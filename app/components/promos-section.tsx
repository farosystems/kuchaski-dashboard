"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Percent, Calendar, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PromoModal } from "./promo-modal"

interface Promo {
  id: string
  nombre: string
  descripcion: string
  descuento_porcentaje: number
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
  created_at: string
}

interface PromoWithProducts extends Promo {
  productos: string[]
  productos_count: number
}

export function PromosSection() {
  const [promos, setPromos] = useState<PromoWithProducts[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPromo, setSelectedPromo] = useState<PromoWithProducts | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [promoToDelete, setPromoToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadPromos()
  }, [])

  const loadPromos = async () => {
    setLoading(true)
    try {
      // Cargar promos
      const { data: promosData, error: promosError } = await supabase
        .from("promos")
        .select("*")
        .order("created_at", { ascending: false })

      if (promosError) throw promosError

      // Cargar productos asociados a cada promo
      const promosWithProducts = await Promise.all(
        (promosData || []).map(async (promo) => {
          const { data: productos, error } = await supabase
            .from("promo_productos")
            .select("producto_id")
            .eq("promo_id", promo.id)

          return {
            ...promo,
            productos: productos?.map(p => p.producto_id) || [],
            productos_count: productos?.length || 0
          }
        })
      )

      setPromos(promosWithProducts)
    } catch (error) {
      console.error("Error cargando promos:", error)
      toast.error("Error al cargar las promociones")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (promo: PromoWithProducts) => {
    setSelectedPromo(promo)
    setModalOpen(true)
  }

  const handleDelete = async () => {
    if (!promoToDelete) return

    try {
      const { error } = await supabase
        .from("promos")
        .delete()
        .eq("id", promoToDelete)

      if (error) throw error

      toast.success("Promo eliminada exitosamente")
      loadPromos()
    } catch (error) {
      console.error("Error eliminando promo:", error)
      toast.error("Error al eliminar la promo")
    } finally {
      setDeleteDialogOpen(false)
      setPromoToDelete(null)
    }
  }

  const confirmDelete = (id: string) => {
    setPromoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    // Extraer solo la parte de fecha (YYYY-MM-DD) sin conversión de zona horaria
    const datePart = dateString.split('T')[0]
    const [year, month, day] = datePart.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isPromoActive = (promo: Promo) => {
    if (!promo.activa) return false
    const now = new Date()
    // Parsear fechas sin conversión de zona horaria
    const inicioPart = promo.fecha_inicio.split('T')[0]
    const finPart = promo.fecha_fin.split('T')[0]
    const [yi, mi, di] = inicioPart.split('-').map(Number)
    const [yf, mf, df] = finPart.split('-').map(Number)
    const inicio = new Date(yi, mi - 1, di)
    const fin = new Date(yf, mf - 1, df, 23, 59, 59)
    return now >= inicio && now <= fin
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Promociones</CardTitle>
            <Button
              onClick={() => {
                setSelectedPromo(undefined)
                setModalOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Promo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando promociones...</div>
          ) : promos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay promociones creadas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promos.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{promo.nombre}</div>
                        {promo.descripcion && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {promo.descripcion}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Percent className="h-4 w-4 mr-1" />
                        {promo.descuento_porcentaje}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        <div>
                          <div>{formatDate(promo.fecha_inicio)}</div>
                          <div className="text-gray-500">{formatDate(promo.fecha_fin)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-1" />
                        {promo.productos_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isPromoActive(promo) ? "default" : "secondary"}>
                        {isPromoActive(promo) ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(promo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(promo.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PromoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        promo={selectedPromo}
        onSuccess={loadPromos}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar promoción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también todas las
              asociaciones de productos con esta promoción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
