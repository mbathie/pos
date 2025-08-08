'use client'

import './waiver.css'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TypographyLarge, TypographyMuted } from '@/components/ui/typography'
import { ArrowLeft, Save, Loader2, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading4, Heading5, Heading6, CheckCircle, Type, IndentIncrease, IndentDecrease } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import UnderlineExtension from '@tiptap/extension-underline'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import { Toggle } from '@/components/ui/toggle'

export default function WaiverSettingsPage() {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(Date.now())

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Paragraph.extend({
        addAttributes() {
          return {
            style: {
              default: null,
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                if (!attributes.style) {
                  return {}
                }
                return {
                  style: attributes.style,
                }
              },
            },
          }
        },
      }),
      Heading.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                if (!attributes.style) {
                  return {}
                }
                return {
                  style: attributes.style,
                }
              },
            },
          }
        },
      }).configure({
        levels: [4, 5, 6]
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      UnderlineExtension
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none'
      }
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
    immediatelyRender: false // Fix SSR hydration issue
  })

  // Load existing waiver content
  useEffect(() => {
    const fetchWaiverContent = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/waiver/content')
        if (res.ok) {
          const data = await res.json()
          const loadedContent = data.content || getDefaultWaiverContent()
          setContent(loadedContent)
          setOriginalContent(loadedContent)
          if (editor) {
            editor.commands.setContent(loadedContent)
          }
        } else {
          // Set default content if no waiver exists
          const defaultContent = getDefaultWaiverContent()
          setContent(defaultContent)
          setOriginalContent(defaultContent)
          if (editor) {
            editor.commands.setContent(defaultContent)
          }
        }
      } catch (error) {
        console.error('Error fetching waiver content:', error)
        toast.error('Failed to load waiver content')
        // Set default content on error
        const defaultContent = getDefaultWaiverContent()
        setContent(defaultContent)
        setOriginalContent(defaultContent)
        if (editor) {
          editor.commands.setContent(defaultContent)
        }
      } finally {
        setLoading(false)
      }
    }

    if (editor) {
      fetchWaiverContent()
    }
  }, [editor])

  const getDefaultWaiverContent = () => {
    return `
      <h2>Liability Waiver and Release Agreement</h2>
      <p><strong>Please read this document carefully before signing.</strong></p>
      
      <h3>Assumption of Risk</h3>
      <p>I understand that participation in activities involves inherent risks, including but not limited to physical injury, property damage, or other harm. I voluntarily assume all risks associated with my participation.</p>
      
      <h3>Release of Liability</h3>
      <p>I hereby release, waive, discharge, and covenant not to sue the organization, its officers, employees, agents, and representatives from any and all liability, claims, demands, actions, or causes of action arising out of or related to any loss, damage, or injury that may be sustained by me during participation in activities.</p>
      
      <h3>Medical Treatment</h3>
      <p>I authorize the organization to provide or arrange for emergency medical treatment if necessary. I understand that I am responsible for any medical expenses incurred.</p>
      
      <h3>Photography Release</h3>
      <p>I grant permission for photographs or videos taken during activities to be used for promotional purposes.</p>
      
      <h3>Agreement</h3>
      <p>By signing below, I acknowledge that I have read and understood this waiver, and I agree to be bound by its terms.</p>
    `
  }


  const hasChanges = content !== originalContent && originalContent !== ''

  // Auto-save every 10 seconds if there are changes
  useEffect(() => {
    if (!hasChanges) return

    const autoSaveTimer = setTimeout(async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/waiver/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })

        if (res.ok) {
          setOriginalContent(content)
          setLastSaved(Date.now())
        }
      } catch (error) {
        console.error('Auto-save error:', error)
      } finally {
        setSaving(false)
      }
    }, 10000) // 10 seconds

    return () => clearTimeout(autoSaveTimer)
  }, [content, hasChanges])

  if (!editor) {
    return null
  }

  return (
    <div className="px-4 flex flex-col gap-4 mb-4">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <TypographyLarge>Waiver Content Settings</TypographyLarge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legal Waiver Content</CardTitle>
          <TypographyMuted>
            Customize the legal waiver that customers must agree to when signing up for classes, courses, or activities.
            This content will be displayed to customers during the registration process.
          </TypographyMuted>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="h-96 bg-muted animate-pulse rounded-md" />
          ) : (
            <>
              {/* Editor with toolbar at top */}
              <div className="border rounded-lg relative">
                {/* Top toolbar with formatting controls and save buttons */}
                <div className="sticky top-0 z-10 border-b bg-muted p-2 flex justify-between items-center rounded-t-md">
                  {/* Left side - formatting controls */}
                  <div className="flex flex-wrap gap-1">
                    <div className="flex gap-1 pr-2 border-r">
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('paragraph')}
                        onPressedChange={() => editor.chain().focus().setParagraph().run()}
                      >
                        <Type className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('heading', { level: 4 })}
                        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                      >
                        <Heading4 className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('heading', { level: 5 })}
                        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                      >
                        <Heading5 className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('heading', { level: 6 })}
                        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
                      >
                        <Heading6 className="h-4 w-4" />
                      </Toggle>
                    </div>

                    <div className="flex gap-1 pr-2 border-r">
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('bold')}
                        onPressedChange={() => editor.chain().focus().toggleBold().run()}
                      >
                        <Bold className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('italic')}
                        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                      >
                        <Italic className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('underline')}
                        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                      >
                        <UnderlineIcon className="h-4 w-4" />
                      </Toggle>
                    </div>

                    <div className="flex gap-1 pr-2 border-r">
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('bulletList')}
                        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                      >
                        <List className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('orderedList')}
                        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Toggle>
                    </div>

                    <div className="flex gap-1 pr-2 border-r">
                      <Toggle
                        size="sm"
                        pressed={editor.isActive({ textAlign: 'left' })}
                        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive({ textAlign: 'center' })}
                        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive({ textAlign: 'right' })}
                        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Toggle>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-1.5"
                        onClick={() => {
                          // For lists, use liftListItem
                          if (editor.can().liftListItem('listItem')) {
                            editor.chain().focus().liftListItem('listItem').run()
                          } else {
                            // For paragraphs and headings, decrease margin
                            const { selection } = editor.state
                            const node = selection.$from.parent
                            const nodeType = node.type.name
                            
                            if (nodeType === 'paragraph' || nodeType === 'heading') {
                              const attrs = editor.getAttributes(nodeType)
                              const currentIndent = parseInt(attrs.style?.match(/margin-left:\s*(\d+)/)?.[1] || 0)
                              if (currentIndent > 0) {
                                const newIndent = Math.max(0, currentIndent - 40)
                                editor.chain().focus().updateAttributes(nodeType, {
                                  style: `margin-left: ${newIndent}px`
                                }).run()
                              }
                            }
                          }
                        }}
                      >
                        <IndentDecrease className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-1.5"
                        onClick={() => {
                          // For lists, use sinkListItem
                          if (editor.can().sinkListItem('listItem')) {
                            editor.chain().focus().sinkListItem('listItem').run()
                          } else {
                            // For paragraphs and headings, increase margin
                            const { selection } = editor.state
                            const node = selection.$from.parent
                            const nodeType = node.type.name
                            
                            if (nodeType === 'paragraph' || nodeType === 'heading') {
                              const attrs = editor.getAttributes(nodeType)
                              const currentIndent = parseInt(attrs.style?.match(/margin-left:\s*(\d+)/)?.[1] || 0)
                              const newIndent = currentIndent + 40
                              editor.chain().focus().updateAttributes(nodeType, {
                                style: `margin-left: ${newIndent}px`
                              }).run()
                            }
                          }
                        }}
                      >
                        <IndentIncrease className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Right side - save status icon */}
                  <div className="flex items-center mr-2">
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : hasChanges ? (
                      <Save className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
                
                {/* Editor content area */}
                <div className="min-h-[400px] p-4">
                  <EditorContent editor={editor} className="max-w-none focus:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:outline-none" />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}