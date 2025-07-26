export function handleAccountLocked() {
  // Clear the token cookie
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  
  // Redirect to login with message
  window.location.href = '/login?message=Account locked'
}

export function checkApiResponse(response) {
  if (response.status === 401) {
    response.json().then(data => {
      if (data.error === 'Account locked') {
        handleAccountLocked()
      }
    }).catch(() => {
      // If we can't parse the response, still redirect to login
      window.location.href = '/login'
    })
  }
  return response
} 