"use client"

import { useState, useCallback } from "react"
import { getFieldHistory, type FieldHistoryResult } from "@/features/admin/actions/field-history-actions"

/**
 * خطاف معزول لجلب سجل تعديلات حقل معين
 * يغلف استدعاء Server Action مع إدارة حالات التحميل والخطأ
 */
export function useFieldHistory(
  tableName: string,
  recordId: string,
  fieldName: string
) {
  const [data, setData] = useState<FieldHistoryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!tableName || !recordId || !fieldName) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getFieldHistory(tableName, recordId, fieldName)

      if (result.error) {
        setError(result.error)
      } else {
        setData(result)
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "خطأ غير متوقع"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [tableName, recordId, fieldName])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return { data, isLoading, error, fetchHistory, reset }
}
