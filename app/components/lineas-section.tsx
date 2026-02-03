"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Linea } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
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
    imagen: "",
  })
  const [isUploading, setIsUploading] = useState(false)

  const resetForm = () => {
    setFormData({
      descripcion: "",
      imagen: "",
    })
    setEditingLinea(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingLinea) {
        await onUpdateLinea(editingLinea.id, {
          descripcion: formData.descripcion,
          imagen: formData.imagen || null,
        })
      } else {
        await onCreateLinea({
          descripcion: formData.descripcion,
          imagen: formData.imagen || undefined,
        })
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
      imagen: linea.imagen || "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (linea: Linea) => {
    setLineaToDelete(linea)
    setIsDeleteDialogOpen(true)
  }

  const removeImageFromStorage = async (imageUrl: string) => {
    if (!imageUrl || !imageUrl.includes('supabase.co')) return
    try {
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/')
      const imagenesIndex = pathParts.findIndex(part => part === 'imagenes')
      if (imagenesIndex !== -1 && imagenesIndex + 2 < pathParts.length) {
        const filePath = pathParts.slice(imagenesIndex + 1).join('/')
        await supabase.storage.from('imagenes').remove([filePath])
      }
    } catch (error) {
      console.error('Error al eliminar imagen del storage:', error)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!lineaToDelete) return
    try {
      if (lineaToDelete.imagen) {
        await removeImageFromStorage(lineaToDelete.imagen)
      }
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

  const uploadImagen = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten archivos de imagen')
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('El archivo es demasiado grande. Máximo 2MB')
    }
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `lineas/${fileName}`

    const { error } = await supabase.storage
      .from('imagenes')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const url = await uploadImagen(file)
      if (url) setFormData({ ...formData, imagen: url })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al subir imagen')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveImagen = async () => {
    if (formData.imagen) {
      await removeImageFromStorage(formData.imagen)
    }
    setFormData({ ...formData, imagen: '' })
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

              <div className="space-y-3">
                <Label>Imagen de la Línea</Label>

                {/* Vista previa */}
                {formData.imagen && (
                  <div className="relative">
                    <div className="w-32 h-32 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={formData.imagen}
                        alt="Imagen preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { e.currentTarget.src = '/placeholder.jpg' }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={handleRemoveImagen}
                      title="Eliminar imagen"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Subida de archivo */}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="imagen-linea-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="imagen-linea-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <div className="flex flex-col items-center space-y-2">
                        {isUploading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        ) : (
                          <Upload className="h-6 w-6 text-gray-400" />
                        )}
                        <p className="text-sm font-medium text-gray-700">
                          {isUploading ? 'Subiendo...' : 'Haz clic para seleccionar imagen'}
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF hasta 2MB
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isUploading}>
                {isUploading ? "Procesando..." : editingLinea ? "Actualizar" : "Crear"} Línea
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
              <TableHead>Imagen</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineas.map((linea) => (
              <TableRow key={linea.id}>
                <TableCell>{linea.id}</TableCell>
                <TableCell>
                  {linea.imagen ? (
                    <div className="w-10 h-10 border rounded overflow-hidden bg-gray-50">
                      <img src={linea.imagen} alt={linea.descripcion} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Sin imagen</span>
                  )}
                </TableCell>
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