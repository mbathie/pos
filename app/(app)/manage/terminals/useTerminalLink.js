import { useState, useEffect } from 'react'
import { useGlobals } from '@/lib/globals'
import { toast } from 'sonner'

// Generate a unique browser ID
function generateBrowserId() {
  return 'browser_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
}

export function useTerminalLink() {
  const { terminal, setTerminal, clearTerminal } = useGlobals()
  const [linkingStatus, setLinkingStatus] = useState({}) // { terminalId: 'linking'|'unlinking'|null }
  const [browserId, setBrowserId] = useState(null)

  // Initialize browser ID on first load (store directly in localStorage)
  useEffect(() => {
    const stored = localStorage.getItem('browserId')
    if (stored) {
      setBrowserId(stored)
    } else {
      const newBrowserId = generateBrowserId()
      localStorage.setItem('browserId', newBrowserId)
      setBrowserId(newBrowserId)
      console.log('🆔 Generated browser ID:', newBrowserId)
    }
  }, [])

  // Check if a terminal is linked to this browser
  const checkTerminalLinkStatus = async (terminalId) => {
    if (!browserId) return null
    
    try {
      const res = await fetch(`/api/terminals/${terminalId}/link?browserId=${browserId}`)
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch (error) {
      console.error('Error checking terminal link status:', error)
    }
    return null
  }

  // Link a terminal to this browser
  const linkTerminal = async (terminalId) => {
    if (!browserId) {
      console.error('No browser ID available')
      return false
    }

    setLinkingStatus(prev => ({ ...prev, [terminalId]: 'linking' }))

    try {
      console.log('🔗 Linking terminal:', terminalId, 'to browser:', browserId)
      
      const res = await fetch(`/api/terminals/${terminalId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          browserId, 
          action: 'link' 
        })
      })

      const data = await res.json()

      if (res.ok) {
        // Update global state
        setTerminal(terminalId)
        console.log('✅ Terminal linked successfully:', data.message)
        toast.success(data.message || 'Terminal linked successfully')
        return true
      } else {
        console.log('❌ Failed to link terminal:', data.error)
        toast.error(data.error || 'Failed to link terminal')
        return false
      }
    } catch (error) {
      console.log('❌ Error linking terminal:', error)
      toast.error('Failed to link terminal. Please try again.')
      return false
    } finally {
      setLinkingStatus(prev => ({ ...prev, [terminalId]: null }))
    }
  }

  // Unlink a terminal from this browser
  const unlinkTerminal = async (terminalId) => {
    if (!browserId) {
      console.error('No browser ID available')
      return false
    }

    setLinkingStatus(prev => ({ ...prev, [terminalId]: 'unlinking' }))

    try {
      console.log('🔓 Unlinking terminal:', terminalId, 'from browser:', browserId)
      
      const res = await fetch(`/api/terminals/${terminalId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          browserId, 
          action: 'unlink' 
        })
      })

      const data = await res.json()

      if (res.ok) {
        // Always clear global state when unlinking (force clear weird states)
        clearTerminal()
        console.log('✅ Terminal unlinked successfully:', data.message)
        console.log('🧹 Cleared global terminal state')
        toast.success(data.message || 'Terminal unlinked successfully')
        return true
      } else {
        console.log('❌ Failed to unlink terminal:', data.error)
        toast.error(data.error || 'Failed to unlink terminal')
        return false
      }
    } catch (error) {
      console.log('❌ Error unlinking terminal:', error)
      toast.error('Failed to unlink terminal. Please try again.')
      return false
    } finally {
      setLinkingStatus(prev => ({ ...prev, [terminalId]: null }))
    }
  }

  // Check if this browser has any linked terminal
  const getLinkedTerminal = () => {
    return terminal
  }

  // Check if a specific terminal is linked to this browser
  const isTerminalLinked = (terminalId) => {
    return terminal === terminalId
  }

  // Get the status of a terminal (linking/unlinking/null)
  const getTerminalStatus = (terminalId) => {
    return linkingStatus[terminalId] || null
  }

  // Force reset all browser/terminal state (for debugging weird states)
  const resetBrowserState = () => {
    clearTerminal()
    const newBrowserId = generateBrowserId()
    localStorage.setItem('browserId', newBrowserId)
    setBrowserId(newBrowserId)
    console.log('🔄 Reset browser state - new browser ID:', newBrowserId)
  }

  return {
    browserId,
    linkTerminal,
    unlinkTerminal,
    checkTerminalLinkStatus,
    getLinkedTerminal,
    isTerminalLinked,
    getTerminalStatus,
    resetBrowserState,
    linkingStatus
  }
} 