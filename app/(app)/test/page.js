'use client'

import { useState } from "react"

export default function Page() {
  const [state, setState] = useState(false)

  return (
    <>
      <button
        onClick={() => setState(!state)}
        className="rounded-md bg-slate-800 py-2 px-4 text-white text-sm shadow-md hover:bg-slate-700 transition-all"
      >
        Toggle Collapse
      </button>

      <div
        id="collapseContent"
          className={`${state ? 'max-h-0' : 'max-h-96'} max-h-0 overflow-hidden transition-all duration-300 ease-in-out`}
      >
        <div className="mt-4 mx-auto w-8/12 bg-white p-4 rounded-lg shadow border border-slate-200">
          <p className="text-slate-600 font-light">
            Use our Tailwind CSS collapse for your website. You can use it for accordion, collapsible items, and much more.
          </p>
        </div>
      </div>

    </>
  )
}