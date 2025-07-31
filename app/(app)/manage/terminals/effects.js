/**
 * Terminal Management Effects
 * Contains all business logic and data fetching for terminal management
 */

// Fetch terminals data
export const fetchTerminalsData = async () => {
  try {
    const terminalsResponse = await fetch('/api/terminals')
    const terminalsData = terminalsResponse.ok ? await terminalsResponse.json() : []

    return {
      terminals: terminalsData,
      error: null
    }
  } catch (error) {
    console.error('Failed to fetch data:', error)
    return {
      terminals: [],
      error: error.message
    }
  }
}

// Add a new terminal
export const addTerminal = async (terminalData) => {
  try {
    const response = await fetch('/api/terminals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(terminalData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to add terminal')
    }

    const newTerminal = await response.json()
    return {
      success: true,
      terminal: newTerminal,
      error: null
    }
  } catch (error) {
    console.error('Failed to add terminal:', error)
    return {
      success: false,
      terminal: null,
      error: error.message
    }
  }
}

// Update an existing terminal
export const updateTerminal = async (terminalId, updateData) => {
  try {
    const response = await fetch(`/api/terminals/${terminalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update terminal')
    }

    const updatedTerminal = await response.json()
    return {
      success: true,
      terminal: updatedTerminal,
      error: null
    }
  } catch (error) {
    console.error('Failed to update terminal:', error)
    return {
      success: false,
      terminal: null,
      error: error.message
    }
  }
}

// Delete a terminal
export const deleteTerminal = async (terminalId) => {
  try {
    const response = await fetch(`/api/terminals/${terminalId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete terminal')
    }

    return {
      success: true,
      error: null
    }
  } catch (error) {
    console.error('Failed to delete terminal:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Filter terminals by location
export const getTerminalsForLocation = (terminals, locationId) => {
  return terminals.filter(terminal => terminal.location._id === locationId)
}

// Get status color for terminal status
export const getStatusColor = (status) => {
  switch (status) {
    case 'online': return 'text-primary'
    case 'offline': return 'text-destructive'
    default: return 'text-gray-600'
  }
}

// Get status icon component props
export const getStatusIconType = (status) => {
  return status === 'online' ? 'wifi' : 'wifi-off'
}

// Validate terminal form data
export const validateTerminalForm = (terminalData) => {
  const errors = {}

  if (!terminalData.locationId) {
    errors.locationId = 'Location is required'
  }

  if (!terminalData.label || terminalData.label.trim().length === 0) {
    errors.label = 'Terminal label is required'
  }

  if (terminalData.type === 'physical' && !terminalData.registrationCode) {
    errors.registrationCode = 'Registration code is required for physical terminals'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Create initial terminal form state
export const createInitialTerminalState = () => ({
  label: '',
  registrationCode: '',
  type: 'physical'
})

// Reset terminal form to initial state
export const resetTerminalForm = () => createInitialTerminalState()



// Format terminal type display
export const formatTerminalType = (type) => {
  switch (type) {
    case 'simulated': return 'Simulated'
    case 'physical': return 'Physical'
    default: return 'Unknown'
  }
}

// Format location address
export const formatLocationAddress = (location) => {
  if (!location) return '—'
  
  const addressParts = [
    location.address1,
    location.city,
    location.state
  ].filter(Boolean)
  
  return addressParts.length > 0 ? addressParts.join(', ') : '—'
}

// Terminal management hook-like functionality
export const useTerminalManagement = () => {
  const handleAddTerminal = async (selectedLocationId, newTerminal, onSuccess, onError) => {
    const validation = validateTerminalForm({
      locationId: selectedLocationId,
      ...newTerminal
    })

    if (!validation.isValid) {
      onError?.(validation.errors)
      return false
    }

    const result = await addTerminal({
      locationId: selectedLocationId,
      ...newTerminal
    })

    if (result.success) {
      onSuccess?.(result.terminal)
      return true
    } else {
      onError?.(result.error)
      return false
    }
  }

  const handleDeleteTerminal = async (terminalId, onSuccess, onError) => {
    if (!confirm('Are you sure you want to delete this terminal?')) {
      return false
    }

    const result = await deleteTerminal(terminalId)

    if (result.success) {
      onSuccess?.()
      return true
    } else {
      onError?.(result.error)
      return false
    }
  }

  const handleUpdateTerminal = async (terminalId, updateData, onSuccess, onError) => {
    const result = await updateTerminal(terminalId, updateData)

    if (result.success) {
      onSuccess?.(result.terminal)
      return true
    } else {
      onError?.(result.error)
      return false
    }
  }

  return {
    handleAddTerminal,
    handleDeleteTerminal,
    handleUpdateTerminal
  }
} 