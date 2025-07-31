import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { getEmployee } from '@/lib/auth'
import { Terminal } from '@/models'

export async function POST(req, { params }) {
  try {
    await connectDB()
    const { employee, error, status } = await getEmployee()

    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { id } = await params
    const { browserId, action } = await req.json()

    if (!browserId) {
      return NextResponse.json({ error: 'Browser ID is required' }, { status: 400 })
    }

    if (!['link', 'unlink'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "link" or "unlink"' }, { status: 400 })
    }

    console.log(`🔗 ${action === 'link' ? 'Linking' : 'Unlinking'} terminal ${id} ${action === 'link' ? 'to' : 'from'} browser ${browserId}`)

    // Find the terminal
    const terminal = await Terminal.findOne({ 
      _id: id, 
      org: employee.org._id 
    })

    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }

    if (action === 'link') {
      // Check if this browser is already linked to another terminal
      const existingTerminalForBrowser = await Terminal.findOne({
        org: employee.org._id,
        browser: browserId,
        _id: { $ne: id } // Exclude current terminal
      })

      if (existingTerminalForBrowser) {
        return NextResponse.json({ 
          error: `This browser is already linked to terminal "${existingTerminalForBrowser.label}". Please unlink it first.` 
        }, { status: 409 })
      }

      // Check if this terminal is already linked to another browser
      if (terminal.browser && terminal.browser !== browserId) {
        return NextResponse.json({ 
          error: `Terminal "${terminal.label}" is already linked to another browser. Please unlink it first.` 
        }, { status: 409 })
      }

      // Link the terminal to this browser
      terminal.browser = browserId
      await terminal.save()

      console.log(`✅ Terminal "${terminal.label}" linked to browser ${browserId}`)
      
      return NextResponse.json({ 
        message: `Terminal "${terminal.label}" linked successfully`,
        terminal: {
          _id: terminal._id,
          label: terminal.label,
          browser: terminal.browser
        }
      })

    } else { // action === 'unlink'
      // Always allow unlinking - don't check browser match to handle weird states
      console.log(`🔓 Force unlinking terminal "${terminal.label}" (current browser: ${terminal.browser || 'none'})`)

      // Unlink the terminal regardless of current browser state
      terminal.browser = undefined
      await terminal.save()

      console.log(`✅ Terminal "${terminal.label}" unlinked successfully`)
      
      return NextResponse.json({ 
        message: `Terminal "${terminal.label}" unlinked successfully`,
        terminal: {
          _id: terminal._id,
          label: terminal.label,
          browser: null
        }
      })
    }

  } catch (error) {
    console.error('❌ Error in terminal link/unlink:', error)
    return NextResponse.json({ error: 'Failed to process terminal linking' }, { status: 500 })
  }
}

// GET endpoint to check current linking status
export async function GET(req, { params }) {
  try {
    await connectDB()
    const { employee, error, status } = await getEmployee()

    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const browserId = searchParams.get('browserId')

    const terminal = await Terminal.findOne({ 
      _id: id, 
      org: employee.org._id 
    })

    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }

    const isLinkedToThisBrowser = terminal.browser === browserId
    const isLinkedToAnyBrowser = !!terminal.browser

    return NextResponse.json({
      terminal: {
        _id: terminal._id,
        label: terminal.label,
        browser: terminal.browser
      },
      isLinkedToThisBrowser,
      isLinkedToAnyBrowser
    })

  } catch (error) {
    console.error('❌ Error checking terminal link status:', error)
    return NextResponse.json({ error: 'Failed to check terminal status' }, { status: 500 })
  }
} 