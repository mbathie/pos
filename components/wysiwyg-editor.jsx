'use client'

import './wysiwyg-editor.css'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import UnderlineExtension from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, Heading4, Heading5, Heading6, 
  Type, IndentIncrease, IndentDecrease, Link as LinkIcon, Unlink 
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function WysiwygEditor({ 
  content, 
  onChange, 
  placeholder = 'Start typing...',
  minHeight = '150px',
  showToolbar = true,
  toolbarPosition = 'top', // 'top' or 'bottom'
  className = '',
  toolbarOptions = {
    headings: true,
    bold: true,
    italic: true,
    underline: true,
    bulletList: true,
    orderedList: true,
    alignment: true,
    indent: true,
    link: false
  }
}) {
  const [linkUrl, setLinkUrl] = useState('')
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        bulletList: toolbarOptions.bulletList ? {
          keepMarks: true,
          keepAttributes: false,
        } : false,
        orderedList: toolbarOptions.orderedList ? {
          keepMarks: true,
          keepAttributes: false,
        } : false,
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
      ...(toolbarOptions.headings ? [Heading.extend({
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
      })] : []),
      ...(toolbarOptions.alignment ? [TextAlign.configure({
        types: ['heading', 'paragraph']
      })] : []),
      ...(toolbarOptions.underline ? [UnderlineExtension] : []),
      ...(toolbarOptions.link ? [Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: {
          class: 'wysiwyg-link',
        },
      })] : [])
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        placeholder: placeholder
      }
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML())
      }
    },
    immediatelyRender: false // Fix SSR hydration issue
  })

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  // Add click handler for links
  useEffect(() => {
    if (!editor || !toolbarOptions.link) return

    const preventLinkNavigation = (event) => {
      // Check if clicked element is a link or inside a link
      let target = event.target
      while (target && target !== editor.view.dom) {
        if (target.tagName === 'A' || target.classList?.contains('wysiwyg-link')) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          return false
        }
        target = target.parentElement
      }
    }

    const handleClick = (event) => {
      // Check if clicked element is a link or inside a link
      let target = event.target
      while (target && target !== editor.view.dom) {
        if (target.tagName === 'A' || target.classList?.contains('wysiwyg-link')) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          
          // Get the position in the document
          const pos = editor.view.posAtDOM(target, 0)
          
          // Move cursor to the link position
          editor.chain()
            .focus()
            .setTextSelection(pos)
            .run()
          
          // Use TipTap's extendMarkRange to select the entire link
          setTimeout(() => {
            editor.chain()
              .focus()
              .extendMarkRange('link')
              .run()
            
            // Get link URL and open popover
            const href = target.getAttribute('href')
            setLinkUrl(href || '')
            setLinkPopoverOpen(true)
          }, 0)
          
          return false
        }
        target = target.parentElement
      }
    }

    const editorElement = editor.view.dom
    
    // Prevent all link navigation within the editor
    const preventAllLinkClicks = (e) => {
      const link = e.target.closest('a')
      if (link && editorElement.contains(link)) {
        e.preventDefault()
        return false
      }
    }
    
    // Add multiple handlers to ensure links don't navigate
    editorElement.addEventListener('mousedown', preventLinkNavigation, true)
    editorElement.addEventListener('click', handleClick, true) // Use capture phase
    editorElement.addEventListener('auxclick', preventAllLinkClicks, true) // Middle click
    
    // Prevent link navigation globally within editor
    document.addEventListener('click', preventAllLinkClicks, true)

    return () => {
      editorElement.removeEventListener('mousedown', preventLinkNavigation, true)
      editorElement.removeEventListener('click', handleClick, true)
      editorElement.removeEventListener('auxclick', preventAllLinkClicks, true)
      document.removeEventListener('click', preventAllLinkClicks, true)
    }
  }, [editor, toolbarOptions.link])

  const setLink = useCallback(() => {
    const url = linkUrl

    // cancelled
    if (!url) {
      setLinkPopoverOpen(false)
      return
    }

    // empty - remove link
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      setLinkPopoverOpen(false)
      setLinkUrl('')
      return
    }

    // Check if we're editing an existing link
    const isEditingLink = editor.isActive('link')
    
    if (isEditingLink) {
      // Just update the href of the existing link
      editor.chain().focus().setLink({ href: url }).run()
    } else {
      // Creating a new link
      const { from, to } = editor.state.selection
      if (from === to) {
        // No selection, don't insert anything
        // User should select text first
      } else {
        // Apply link to selection only
        editor.chain().focus().setLink({ href: url }).run()
      }
    }
    
    setLinkUrl('')
    setLinkPopoverOpen(false)
  }, [editor, linkUrl])

  const addLink = useCallback(() => {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    
    // Check if selection already has a link
    const previousUrl = editor.getAttributes('link').href
    setLinkUrl(previousUrl || '')
    setLinkPopoverOpen(true)
  }, [editor])

  if (!editor) {
    return null
  }

  const toolbar = (
    <div className="border-b bg-muted p-2 flex justify-between items-center">
      <div className="flex flex-wrap gap-1">
        {/* Text type controls */}
        {toolbarOptions.headings && (
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
        )}

        {/* Text formatting controls */}
        {(toolbarOptions.bold || toolbarOptions.italic || toolbarOptions.underline) && (
          <div className="flex gap-1 pr-2 border-r">
            {toolbarOptions.bold && (
              <Toggle
                size="sm"
                pressed={editor.isActive('bold')}
                onPressedChange={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-4 w-4" />
              </Toggle>
            )}
            {toolbarOptions.italic && (
              <Toggle
                size="sm"
                pressed={editor.isActive('italic')}
                onPressedChange={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-4 w-4" />
              </Toggle>
            )}
            {toolbarOptions.underline && (
              <Toggle
                size="sm"
                pressed={editor.isActive('underline')}
                onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Toggle>
            )}
          </div>
        )}

        {/* Link controls */}
        {toolbarOptions.link && (
          <div className="flex gap-1 pr-2 border-r">
            <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
              <PopoverTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('link')}
                  onPressedChange={addLink}
                >
                  <LinkIcon className="h-4 w-4" />
                </Toggle>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Set Link URL</div>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          setLink()
                        } else if (e.key === 'Escape') {
                          setLinkPopoverOpen(false)
                          setLinkUrl('')
                        }
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={setLink}>Set</Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setLinkPopoverOpen(false)
                        setLinkUrl('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {editor.isActive('link') && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-1.5"
                onClick={() => editor.chain().focus().unsetLink().run()}
              >
                <Unlink className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* List controls */}
        {(toolbarOptions.bulletList || toolbarOptions.orderedList) && (
          <div className="flex gap-1 pr-2 border-r">
            {toolbarOptions.bulletList && (
              <Toggle
                size="sm"
                pressed={editor.isActive('bulletList')}
                onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </Toggle>
            )}
            {toolbarOptions.orderedList && (
              <Toggle
                size="sm"
                pressed={editor.isActive('orderedList')}
                onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </Toggle>
            )}
          </div>
        )}

        {/* Alignment controls */}
        {toolbarOptions.alignment && (
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
        )}

        {/* Indent controls */}
        {toolbarOptions.indent && (
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
        )}
      </div>
    </div>
  )

  return (
    <div className={`border rounded-lg ${className}`}>
      {showToolbar && toolbarPosition === 'top' && toolbar}
      
      <div className="p-4" style={{ minHeight }}>
        <EditorContent 
          editor={editor} 
          className="max-w-none focus:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:outline-none" 
        />
      </div>
      
      {showToolbar && toolbarPosition === 'bottom' && toolbar}
    </div>
  )
}