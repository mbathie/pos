'use client'

import { useEffect } from 'react'

export default function ApiDocs() {
  useEffect(() => {
    // Prevent multiple initializations
    if (document.getElementById('swagger-css-loaded')) return

    // Load CSS
    const cssLink = document.createElement('link')
    cssLink.id = 'swagger-css-loaded'
    cssLink.rel = 'stylesheet'
    cssLink.href = 'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css'
    document.head.appendChild(cssLink)

    // Load JS
    const jsScript = document.createElement('script')
    jsScript.src = 'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js'
    jsScript.onload = () => {
      // Initialize Swagger UI
      if (window.SwaggerUIBundle && !window.swaggerUIInitialized) {
        window.swaggerUIInitialized = true
        window.SwaggerUIBundle({
          url: '/api-spec.json',
          dom_id: '#swagger-ui',
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIBundle.presets.standalone
          ],
          deepLinking: true,
          showExtensions: true,
          showCommonExtensions: true
        })
      }
    }
    document.head.appendChild(jsScript)

    return () => {
      // Cleanup
      const css = document.getElementById('swagger-css-loaded')
      if (css) css.remove()
      
      if (jsScript.parentNode) {
        jsScript.parentNode.removeChild(jsScript)
      }
      
      window.swaggerUIInitialized = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">POS System API Documentation</h1>
          <p className="text-gray-600">
            Complete API reference for the POS system endpoints
          </p>
        </div>
        
        <div id="swagger-ui"></div>
      </div>
    </div>
  )
}