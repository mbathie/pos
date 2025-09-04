#!/bin/bash

echo "🔄 Starting update process for shadcn-ui and Tailwind CSS..."
echo ""

# Update Tailwind CSS and related packages
echo "📦 Updating Tailwind CSS packages..."
npm update tailwindcss @tailwindcss/postcss @tailwindcss/typography autoprefixer postcss

# Update shadcn-ui CLI to latest
echo ""
echo "📦 Installing/updating shadcn-ui CLI..."
npx shadcn@latest init -y

# Get list of all installed shadcn components
echo ""
echo "🔍 Detecting installed shadcn components..."

# Update each shadcn component
echo ""
echo "📦 Updating shadcn components..."
echo "This will check and update all components to their latest versions..."

# Common shadcn components - add or remove as needed for your project
components=(
  "accordion"
  "alert"
  "alert-dialog"
  "aspect-ratio"
  "avatar"
  "badge"
  "breadcrumb"
  "button"
  "calendar"
  "card"
  "carousel"
  "checkbox"
  "collapsible"
  "command"
  "context-menu"
  "dialog"
  "drawer"
  "dropdown-menu"
  "form"
  "hover-card"
  "input"
  "label"
  "menubar"
  "navigation-menu"
  "pagination"
  "popover"
  "progress"
  "radio-group"
  "resizable"
  "scroll-area"
  "select"
  "separator"
  "sheet"
  "skeleton"
  "slider"
  "sonner"
  "switch"
  "table"
  "tabs"
  "textarea"
  "toast"
  "toaster"
  "toggle"
  "toggle-group"
  "tooltip"
)

# Update each component
for component in "${components[@]}"; do
  echo "Checking $component..."
  npx shadcn@latest add "$component" -y --overwrite 2>/dev/null || echo "  ⏭️  $component not installed or no updates"
done

# Update other shadcn-related packages
echo ""
echo "📦 Updating other shadcn-related packages..."
npm update @radix-ui/react-icons lucide-react class-variance-authority clsx tailwind-merge cmdk vaul emblor sonner

# Update the multi-select component if it's from the registry
echo ""
echo "📦 Updating custom registry components..."
npx shadcn@latest diff multi-select 2>/dev/null || echo "Multi-select is a custom component"

# Clean install to resolve any dependency issues
echo ""
echo "🧹 Cleaning and reinstalling dependencies..."
npm install

echo ""
echo "✅ Update complete!"
echo ""
echo "⚠️  Important notes:"
echo "  1. Review any component changes in git diff"
echo "  2. Test your application thoroughly"
echo "  3. Some custom components may need manual updates"
echo "  4. Check CHANGELOG for breaking changes"
echo ""
echo "Run 'git diff' to see what changed"