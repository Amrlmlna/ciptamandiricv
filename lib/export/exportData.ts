type ExportEntity = "patients" | "appointments" | "users" | "all"

interface ExportOptions {
  entity: ExportEntity
  filters?: Record<string, unknown>
  fileName?: string
}

export async function exportDataToExcel({ entity, filters, fileName }: ExportOptions) {
  const response = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity, filters }),
  })

  if (!response.ok) {
    let errorMessage = "Gagal mengekspor data"
    try {
      const errorPayload = await response.json()
      errorMessage = errorPayload?.message ?? errorMessage
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage)
  }

  const blob = await response.blob()
  const resolvedFileName = fileName ?? extractFileName(response.headers.get("Content-Disposition"), entity)

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = resolvedFileName
  document.body.appendChild(link)
  link.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(link)
}

function extractFileName(disposition: string | null, entity: ExportEntity) {
  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/i)
    if (match?.[1]) {
      return match[1]
    }
  }
  const timestamp = new Date().toISOString().split("T")[0]
  return `export-${entity}-${timestamp}.xlsx`
}
