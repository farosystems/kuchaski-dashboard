"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Linea } from "@/lib/supabase"
import { ImportLineasDialog } from "./import-lineas-dialog"

interface LineasSectionProps {
  lineas: Linea[]
  onCreateLinea: (linea: Omit<Linea, 'id' | 'created_at'>) => Promise<Linea | undefined>
  onUpdateLinea: (id: number, updates: Partial<Linea>) => Promise<Linea | undefined>
  onDeleteLinea: (id: number) => Promise<void>
}

export function LineasSection({ lineas, onCreateLinea, onUpdateLinea, onDeleteLinea }: LineasSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [lineaToDelete, setLineaToDelete] = useState<Linea | null>(null)
  const [editingLinea, setEditingLinea] = useState<Linea | null>(null)
  const [formData, setFormData] = useState({
    descripcion: "",
  })

  const resetForm = () => {
    setFormData({
      descripcion: "",
    })
    setEditingLinea(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const lineaData = {
      descripcion: formData.descripcion,
    }

    try {
      if (editingLinea) {
        await onUpdateLinea(editingLinea.id, lineaData)
      } else {
        await onCreateLinea(lineaData)
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar línea:', error)
    }
  }

  const handleEdit = (linea: Linea) => {
    setEditingLinea(linea)
    setFormData({
      descripcion: linea.descripcion,
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (linea: Linea) => {
    setLineaToDelete(linea)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!lineaToDelete) return
    try {
      await onDeleteLinea(lineaToDelete.id)
      setIsDeleteDialogOpen(false)
      setLineaToDelete(null)
    } catch (error) {
      console.error('Error al eliminar línea:', error)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setLineaToDelete(null)
  }

  return (
    <>
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestión de Líneas</CardTitle>
        <div className="flex gap-2">
          <ImportLineasDialog onCreateLinea={onCreateLinea} />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (open) {
              setIsDialogOpen(true)
            }
            // No permitir cerrar con clic fuera o ESC
          }}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Línea
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{editingLinea ? "Editar Línea" : "Nueva Línea"}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-4"
                onClick={() => {
                  setIsDialogOpen(false)
                  resetForm()
                }}
              >
                ✕
              </Button>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingLinea ? "Actualizar" : "Crear"} Línea
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineas.map((linea) => (
              <TableRow key={linea.id}>
                <TableCell>{linea.id}</TableCell>
                <TableCell className="font-medium">{linea.descripcion}</TableCell>
                <TableCell>{new Date(linea.created_at).toLocaleDateString('es-AR')}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(linea)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(linea)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Modal de confirmación de eliminación */}
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-gray-700 text-sm">
              ¿Estás seguro de que quieres eliminar la línea <strong>"{lineaToDelete?.descripcion}"</strong>?
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-yellow-600 text-lg mr-2">⚠️</span>
              <span className="font-medium text-yellow-800 text-sm">Atención</span>
            </div>
            <p className="text-yellow-700 text-xs mt-1">
              Esta acción no se puede deshacer. La línea será eliminada permanentemente.
            </p>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleDeleteCancel} size="sm">
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDeleteConfirm} size="sm">
            Eliminar
          </Button>
        </div>
      </DialogContent>
         </Dialog>
   </>
  )
}