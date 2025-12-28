import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/canvas/')({
  component: CanvasIndex,
})

// Redirect to home if someone navigates to /canvas without an ID
function CanvasIndex() {
  const navigate = useNavigate()
  
  useEffect(() => {
    navigate({ to: '/' })
  }, [navigate])
  
  return null
}
