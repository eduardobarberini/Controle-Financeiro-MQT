import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'

/**
 * Assina mudanças (insert/update/delete) de uma tabela do schema public via
 * Supabase Realtime. O callback recebe o payload da mudança; a maioria dos
 * usos só o utiliza como gatilho para recarregar os dados.
 *
 * A tabela precisa estar na publicação `supabase_realtime` (ver migrations).
 */
export function useRealtime<TRecord extends { [key: string]: any } = { [key: string]: any }>(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(`rt:${table}:${Math.random().toString(36).slice(2)}`)
      .on<TRecord>(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          callbackRef.current(payload)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, enabled])
}

export default useRealtime
