"use client"

import { useState } from "react"
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import * as XLSX from 'xlsx'
import type { Marca } from "@/lib/supabase"

interface ImportMarcasDialogProps {
  onCreateMarca: (marca: Omit<Marca, 'id' | 'created_at'>) => Promise<Marca | undefined>
}

interface ImportResult {
  success: number
  errors: { row: number; descripcion: string; error: string }[]
}

export function ImportMarcasDialog({ onCreateMarca }: ImportMarcasDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
        descripcion?: string
        Descripcion?: string
        DESCRIPCION?: string
        logo?: string
        Logo?: string
        LOGO?: string
      }>

      const result: ImportResult = {
        success: 0,
        errors: []
      }

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const rowNumber = i + 2 // +2 porque Excel empieza en 1 y tiene header

        // Buscar campos (case insensitive)
        const descripcion = row.descripcion || row.Descripcion || row.DESCRIPCION
        const logo = row.logo || row.Logo || row.LOGO

        if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
          result.errors.push({
            row: rowNumber,
            descripcion: descripcion?.toString() || 'N/A',
            error: 'Falta el campo "descripcion" o está vacío'
          })
          continue
        }

        try {
          const marcaData = {
            descripcion: descripcion.trim(),
            logo: logo && typeof logo === 'string' && logo.trim() !== '' ? logo.trim() : null
          }

          await onCreateMarca(marcaData)
          result.success++
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            descripcion: descripcion,
            error: error instanceof Error ? error.message : 'Error desconocido'
          })
        }
      }

      setImportResult(result)
    } catch (error) {
      console.error('Error al procesar archivo:', error)
      setImportResult({
        success: 0,
        errors: [{
          row: 0,
          descripcion: 'N/A',
          error: `Error al leer el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }]
      })
    } finally {
      setIsImporting(false)
      // Reset input
      e.target.value = ''
    }
  }

  const downloadTemplate = () => {
    const template = [
      { descripcion: 'Marca 1', logo: 'https://ejemplo.com/logo1.png' },
      { descripcion: 'Marca 2', logo: 'https://ejemplo.com/logo2.png' },
      { descripcion: 'Marca sin logo', logo: '' }
    ]

    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marcas')
    XLSX.writeFile(workbook, 'plantilla_marcas.xlsx')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Marcas desde Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Instrucciones:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>El archivo debe ser formato Excel (.xlsx o .xls)</li>
              <li>Debe contener una columna llamada "descripcion"</li>
              <li>Opcionalmente puede incluir una columna "logo" con la URL del logo</li>
              <li>La primera fila debe ser el encabezado</li>
              <li>Puedes descargar la plantilla de ejemplo a continuación</li>
            </ul>
          </div>

          {/* Botón para descargar plantilla */}
          <div>
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar Plantilla de Ejemplo
            </Button>
          </div>

          {/* Input de archivo */}
          <div>
            <Label htmlFor="file-upload" className="block mb-2">
              Seleccionar archivo Excel
            </Label>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
            />
          </div>

          {/* Loader */}
          {isImporting && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-sm">Importando marcas...</span>
            </div>
          )}

          {/* Resultados */}
          {importResult && (
            <div className="space-y-3">
              {/* Resumen */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-semibold text-green-900">
                    {importResult.success} marca(s) importada(s) correctamente
                  </span>
                </div>
              </div>

              {/* Errores */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="font-semibold text-red-900">
                      {importResult.errors.length} error(es) encontrado(s)
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="text-sm text-red-800 space-y-1">
                      {importResult.errors.map((error, idx) => (
                        <li key={idx}>
                          <strong>Fila {error.row}:</strong> {error.descripcion} - {error.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
