import { useEffect, useState } from 'react'

export function useStandalone() {
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    const check =
      ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches
    setStandalone(Boolean(check))
  }, [])

  return standalone
}
