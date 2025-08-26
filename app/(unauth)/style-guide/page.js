'use client'
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  Check, X, Info, AlertCircle, ChevronRight, Search, Filter, 
  Settings, User, ShoppingCart, Calendar as CalendarIcon, Clock,
  CheckCircle, XCircle, AlertTriangle, Home, Package, Users,
  CreditCard, BarChart, Menu, Plus, Edit, Trash2, Download, MoreHorizontal,
  Copy, Loader2, FileX, Accessibility
} from 'lucide-react';

export default function StyleGuidePage() {
  const [date, setDate] = useState(null);
  const [switchOn, setSwitchOn] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [progress, setProgress] = useState(65);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied "${text}" to clipboard`);
  };

  const sections = [
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'forms', label: 'Forms' },
    { id: 'badges', label: 'Badges' },
    { id: 'cards', label: 'Cards' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'tables', label: 'Tables' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'loading', label: 'Loading' },
    { id: 'empty-states', label: 'Empty States' },
    { id: 'progress', label: 'Progress' },
    { id: 'icons', label: 'Icons' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'best-practices', label: 'Best Practices' },
    { id: 'states', label: 'Component States' },
    { id: 'destructive', label: 'Destructive Actions' },
    { id: 'layout', label: 'Layout Patterns' },
    { id: 'responsive', label: 'Responsive' }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Floating Navigation */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 hidden xl:block">
        <Card className="w-48 max-h-[70vh] overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <nav className="space-y-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2">UI/UX Style Guide</h1>
        <p className="text-lg text-muted-foreground">
          Design system and component library for the POS application
        </p>
      </div>

      {/* Color Palette */}
      <section id="colors" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => copyToClipboard('bg-primary')}>
            <CardContent className="p-0">
              <div className="h-24 bg-primary rounded-t-lg relative group">
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Copy className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="p-4">
                <p className="font-medium">Primary</p>
                <p className="text-sm text-muted-foreground">Brand color</p>
                <code className="text-xs bg-muted px-1 py-0.5 rounded mt-1 block">bg-primary</code>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="h-24 bg-secondary rounded-t-lg" />
              <div className="p-4">
                <p className="font-medium">Secondary</p>
                <p className="text-sm text-muted-foreground">Supporting</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="h-24 bg-destructive rounded-t-lg" />
              <div className="p-4">
                <p className="font-medium">Destructive</p>
                <p className="text-sm text-muted-foreground">Errors/Delete</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="h-24 bg-muted rounded-t-lg" />
              <div className="p-4">
                <p className="font-medium">Muted</p>
                <p className="text-sm text-muted-foreground">Backgrounds</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="h-24 bg-accent rounded-t-lg" />
              <div className="p-4">
                <p className="font-medium">Accent</p>
                <p className="text-sm text-muted-foreground">Highlights</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="h-24 bg-card rounded-t-lg border" />
              <div className="p-4">
                <p className="font-medium">Card</p>
                <p className="text-sm text-muted-foreground">Card bg</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="h-24 bg-background rounded-t-lg border" />
              <div className="p-4">
                <p className="font-medium">Background</p>
                <p className="text-sm text-muted-foreground">Main bg</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="h-24 bg-foreground rounded-t-lg" />
              <div className="p-4">
                <p className="font-medium">Foreground</p>
                <p className="text-sm text-muted-foreground">Text color</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Colors */}
        <h3 className="text-lg font-semibold mt-6 mb-3">Chart Colors</h3>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-chart-1 rounded" />
            <span className="text-sm">Chart 1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-chart-2 rounded" />
            <span className="text-sm">Chart 2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-chart-3 rounded" />
            <span className="text-sm">Chart 3</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-chart-4 rounded" />
            <span className="text-sm">Chart 4</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-chart-5 rounded" />
            <span className="text-sm">Chart 5</span>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Typography */}
      <section id="typography" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Typography</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h1 className="text-4xl font-bold">Heading 1 - 4xl Bold</h1>
              <p className="text-sm text-muted-foreground mt-1">Hero sections, landing pages</p>
            </div>
            <div>
              <h2 className="text-3xl font-semibold">Heading 2 - 3xl Semibold</h2>
              <p className="text-sm text-muted-foreground mt-1">Major section headers</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold">Heading 3 - 2xl Semibold</h3>
              <p className="text-sm text-muted-foreground mt-1">Major section headers</p>
            </div>
            <div>
              <h4 className="text-xl font-semibold">Heading 4 - xl Semibold</h4>
              <p className="text-sm text-muted-foreground mt-1">Page titles (recommended)</p>
            </div>
            <div>
              <h5 className="text-lg font-medium">Heading 5 - lg Medium</h5>
              <p className="text-sm text-muted-foreground mt-1">Card titles, subsections</p>
            </div>
            <div>
              <p className="text-base">Body Text - Base (16px)</p>
              <p className="text-sm text-muted-foreground mt-1">Default paragraph text</p>
            </div>
            <div>
              <p className="text-sm">Small Text - sm (14px)</p>
              <p className="text-sm text-muted-foreground mt-1">Supporting text, labels</p>
            </div>
            <div>
              <p className="text-xs">Extra Small - xs (12px)</p>
              <p className="text-sm text-muted-foreground mt-1">Captions, timestamps</p>
            </div>
            <div>
              <p className="text-muted-foreground">Muted Text</p>
              <p className="text-sm text-muted-foreground mt-1">Secondary information</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Page Layout Typography */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Page Layout Typography</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Page Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Page Title Example */}
              <div className="p-4 border rounded-lg">
                <h3 className="text-xl font-semibold mb-1">Page Title Example</h3>
                <p className="text-sm text-muted-foreground">This is the recommended size for page titles with subtitle</p>
                <div className="mt-4 p-2 bg-muted rounded text-xs">
                  <code>text-xl font-semibold + text-sm text-muted-foreground</code>
                </div>
              </div>

              {/* Card Title Example */}
              <div className="p-4 border rounded-lg">
                <h4 className="text-lg font-medium mb-1">Card or Section Title</h4>
                <p className="text-sm text-muted-foreground">Use for card headers and section titles within a page</p>
                <div className="mt-4 p-2 bg-muted rounded text-xs">
                  <code>text-lg font-medium + text-sm text-muted-foreground</code>
                </div>
              </div>

              {/* Subsection Example */}
              <div className="p-4 border rounded-lg">
                <h5 className="text-base font-medium mb-1">Subsection Title</h5>
                <p className="text-sm text-muted-foreground">For smaller sections within cards</p>
                <div className="mt-4 p-2 bg-muted rounded text-xs">
                  <code>text-base font-medium + text-sm text-muted-foreground</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Spacing */}
      <section id="spacing" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Spacing System</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-muted-foreground">Consistent spacing using Tailwind's spacing scale</p>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16">p-1</span>
                <div className="bg-primary/20 p-1 rounded">4px</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16">p-2</span>
                <div className="bg-primary/20 p-2 rounded">8px</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16">p-3</span>
                <div className="bg-primary/20 p-3 rounded">12px</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16">p-4</span>
                <div className="bg-primary/20 p-4 rounded">16px (default)</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16">p-6</span>
                <div className="bg-primary/20 p-6 rounded">24px</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16">p-8</span>
                <div className="bg-primary/20 p-8 rounded">32px</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Buttons */}
      <section id="buttons" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Buttons</h2>
        
        <div className="space-y-6">
          {/* Button Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button className="cursor-pointer">Default</Button>
              <Button variant="secondary" className="cursor-pointer">Secondary</Button>
              <Button variant="destructive" className="cursor-pointer">Destructive</Button>
              <Button variant="outline" className="cursor-pointer">Outline</Button>
              <Button variant="ghost" className="cursor-pointer">Ghost</Button>
              <Button variant="link" className="cursor-pointer">Link</Button>
            </CardContent>
          </Card>

          {/* Button Sizes */}
          <Card>
            <CardHeader>
              <CardTitle>Button Sizes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Button size="sm" className="cursor-pointer">Small</Button>
              <Button className="cursor-pointer">Default</Button>
              <Button size="lg" className="cursor-pointer">Large</Button>
              <Button size="icon" className="cursor-pointer"><Settings className="h-4 w-4" /></Button>
            </CardContent>
          </Card>

          {/* Button States */}
          <Card>
            <CardHeader>
              <CardTitle>Button States & Icons</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button className="cursor-pointer">
                <Check className="mr-2 h-4 w-4" />
                With Icon
              </Button>
              <Button disabled className="cursor-pointer">Disabled</Button>
              <Button className="cursor-pointer">
                Loading
                <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              </Button>
              <Button variant="outline" className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Forms */}
      <section id="forms" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Form Elements</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input id="search" className="pl-10" placeholder="Search..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disabled">Disabled Input</Label>
                <Input id="disabled" disabled placeholder="Disabled" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select & Textarea</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Option</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Type your message here." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checkboxes & Toggle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" checked={checkboxChecked} onCheckedChange={setCheckboxChecked} />
                <Label htmlFor="terms" className="cursor-pointer">Accept terms and conditions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="updates" />
                <Label htmlFor="updates" className="cursor-pointer">Send me updates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="marketing" />
                <Label htmlFor="marketing" className="cursor-pointer">Marketing emails</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="disabled-check" disabled />
                <Label htmlFor="disabled-check" className="cursor-pointer opacity-50">Disabled checkbox</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Switch & Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="airplane-mode" checked={switchOn} onCheckedChange={setSwitchOn} />
                <Label htmlFor="airplane-mode" className="cursor-pointer">Enable notifications</Label>
              </div>
              <div className="space-y-2">
                <Label>Date Picker</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start cursor-pointer">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? date.toLocaleDateString('en-US') : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Badges */}
      <section id="badges" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Badges & Status</h2>
        <Card>
          <CardHeader>
            <CardTitle>Badge Variants</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Cards */}
      <section id="cards" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Cards</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Card</CardTitle>
              <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card content with some text.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card with Footer</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card has a footer section.</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full cursor-pointer">Action</Button>
            </CardFooter>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Highlighted Card
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Card with primary border color.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Alerts */}
      <section id="alerts" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Alerts & Notifications</h2>
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>This is a default alert message.</AlertDescription>
          </Alert>

          <Alert className="border-green-500/20 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900 dark:text-green-100">Success</AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">Operation completed successfully!</AlertDescription>
          </Alert>

          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-100">Warning</AlertTitle>
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">Please review before proceeding.</AlertDescription>
          </Alert>

          <Alert className="border-red-500/20 bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-900 dark:text-red-100">Error</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-200">Something went wrong. Please try again.</AlertDescription>
          </Alert>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Tables */}
      <section id="tables" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Tables</h2>
        <div className="space-y-6">
          {/* Basic Table */}
          <Card>
            <CardHeader>
              <CardTitle>Table Design</CardTitle>
              <CardDescription>Standard table with proper header styling and cell alignment</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/50">
                      <TableHead className="font-medium">Order ID</TableHead>
                      <TableHead className="font-medium">Customer</TableHead>
                      <TableHead className="font-medium">Product</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium align-middle">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span>ORD-0001</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="max-w-xs">
                          <span className="break-words">John Doe with a potentially long name that wraps</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="max-w-xs">
                          <span className="break-words">Product A - Extended description</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge>Active</Badge>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">View details</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Edit</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium align-middle">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 flex-shrink-0"></div>
                          <span>ORD-0002</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">Jane Smith</TableCell>
                      <TableCell className="align-middle">Product B</TableCell>
                      <TableCell className="align-middle">
                        <Badge variant="secondary">Pending</Badge>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">View details</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Edit</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium align-middle">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span>ORD-0003</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">Bob Johnson</TableCell>
                      <TableCell className="align-middle">Product C</TableCell>
                      <TableCell className="align-middle">
                        <Badge variant="outline">Completed</Badge>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">View details</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Edit</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Table Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Table Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Header styling:</strong> Use <code className="text-xs bg-muted px-1 py-0.5 rounded">bg-muted/50</code> with <code className="text-xs bg-muted px-1 py-0.5 rounded">font-medium</code>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Cell alignment:</strong> Use <code className="text-xs bg-muted px-1 py-0.5 rounded">align-middle</code> for better visual balance (use <code className="text-xs bg-muted px-1 py-0.5 rounded">align-top</code> only for consistently multi-line content)
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Text wrapping:</strong> Use <code className="text-xs bg-muted px-1 py-0.5 rounded">break-words</code> with <code className="text-xs bg-muted px-1 py-0.5 rounded">max-w-xs</code> for long content
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Row hover:</strong> Use <code className="text-xs bg-muted px-1 py-0.5 rounded">hover:bg-muted/50</code> for interactive feedback
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Actions:</strong> Use dropdown menu with ghost button for row actions
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Visual elements:</strong> Avatars and icons in first column for better scanning
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Tabs */}
      <section id="tabs" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Tabs</h2>
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="tab1">
              <TabsList className="">
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">Content for tab 1</TabsContent>
              <TabsContent value="tab2">Content for tab 2</TabsContent>
              <TabsContent value="tab3">Content for tab 3</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Loading States */}
      <section id="loading" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Loading States</h2>
        
        <div className="space-y-6">
          {/* Skeleton Loading */}
          <Card>
            <CardHeader>
              <CardTitle>Skeleton Loading</CardTitle>
              <CardDescription>Use for content that's still loading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              </div>
              <div className="mt-4 p-2 bg-muted rounded text-xs">
                <code>import {`{Skeleton}`} from '@/components/ui/skeleton'</code>
              </div>
            </CardContent>
          </Card>

          {/* Spinner Loading */}
          <Card>
            <CardHeader>
              <CardTitle>Loading Spinners</CardTitle>
              <CardDescription>For buttons and inline loading states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <Button disabled className="cursor-pointer">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </Button>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
              </div>
              <div className="mt-4 p-2 bg-muted rounded text-xs">
                <code>import {`{Loader2}`} from 'lucide-react'</code>
              </div>
            </CardContent>
          </Card>

          {/* Table Loading State */}
          <Card>
            <CardHeader>
              <CardTitle>Table Loading</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/50">
                      <TableHead className="font-medium">Name</TableHead>
                      <TableHead className="font-medium">Email</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-[120px]" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Empty States */}
      <section id="empty-states" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Empty States</h2>
        
        <div className="space-y-6">
          {/* Basic Empty State */}
          <Card>
            <CardHeader>
              <CardTitle>No Data Found</CardTitle>
              <CardDescription>When there's no content to display</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't made any transactions yet. Create your first transaction to get started.
                </p>
                <Button className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Empty State */}
          <Card>
            <CardHeader>
              <CardTitle>Search Empty State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter to find what you're looking for.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Empty State Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Use descriptive icons:</strong> Choose icons that relate to the missing content
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Explain why it's empty:</strong> Help users understand the current state
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Provide clear action:</strong> Show users what they can do next
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Keep it positive:</strong> Focus on what users can do, not what's missing
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Progress */}
      <section id="progress" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Progress Indicators</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label>Progress Bar</Label>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <span className="text-sm">Loading spinner</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Icons */}
      <section id="icons" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Icons (Lucide)</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-6 md:grid-cols-12 gap-4">
              <div className="flex flex-col items-center gap-1">
                <Home className="h-5 w-5" />
                <span className="text-xs">Home</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <User className="h-5 w-5" />
                <span className="text-xs">User</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Settings className="h-5 w-5" />
                <span className="text-xs">Settings</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Search className="h-5 w-5" />
                <span className="text-xs">Search</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Filter className="h-5 w-5" />
                <span className="text-xs">Filter</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">Cart</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Package className="h-5 w-5" />
                <span className="text-xs">Package</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Users className="h-5 w-5" />
                <span className="text-xs">Users</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Payment</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <BarChart className="h-5 w-5" />
                <span className="text-xs">Chart</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CalendarIcon className="h-5 w-5" />
                <span className="text-xs">Calendar</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Clock className="h-5 w-5" />
                <span className="text-xs">Clock</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Accessibility */}
      <section id="accessibility" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Accessibility Guidelines</h2>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Core Principles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Keyboard Navigation</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>All interactive elements are focusable</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Tab order follows logical flow</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Focus indicators are clearly visible</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Visual Design</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>4.5:1 contrast ratio for normal text</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>3:1 contrast ratio for large text</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Information not conveyed by color alone</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Accessibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accessible-input">Accessible Input Example</Label>
                  <Input 
                    id="accessible-input" 
                    placeholder="Enter your email"
                    aria-describedby="input-help"
                  />
                  <p id="input-help" className="text-sm text-muted-foreground">
                    We'll never share your email with anyone else.
                  </p>
                </div>
                <div className="p-3 bg-muted rounded text-xs">
                  <code>✓ Label linked with htmlFor/id</code><br/>
                  <code>✓ Helper text linked with aria-describedby</code><br/>
                  <code>✓ Descriptive placeholder text</code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-center">
                <Button className="cursor-pointer">Normal State</Button>
                <Button className="cursor-pointer ring-2 ring-primary ring-offset-2">Focused State</Button>
                <Button disabled className="opacity-50 cursor-not-allowed">Disabled State</Button>
              </div>
              <div className="p-3 bg-muted rounded text-xs space-y-1">
                <div><code>✓ cursor-pointer for interactive elements</code></div>
                <div><code>✓ Focus ring for keyboard navigation</code></div>
                <div><code>✓ Disabled state clearly indicated</code></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Screen Reader Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Semantic HTML:</strong> Use proper heading hierarchy (h1, h2, h3)
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Alt text:</strong> All images have descriptive alt attributes
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>ARIA labels:</strong> Complex interactions have proper ARIA attributes
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>Live regions:</strong> Dynamic content updates are announced
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Best Practices */}
      <section id="best-practices" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">UX/UI Best Practices</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Do's
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Use consistent spacing (4px grid system)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Add cursor-pointer class to all interactive elements</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Provide clear visual feedback for user actions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Use semantic color meanings (red for destructive)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Maintain visual hierarchy with font sizes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Use loading states for async operations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Don'ts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 mt-0.5" />
                  <span>Mix different button styles in same context</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 mt-0.5" />
                  <span>Use custom colors outside the palette</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 mt-0.5" />
                  <span>Create forms without proper labels</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 mt-0.5" />
                  <span>Ignore responsive design principles</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 mt-0.5" />
                  <span>Use inconsistent icon sizes</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 mt-0.5" />
                  <span>Forget hover/focus states</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Component States */}
      <section id="states" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Component States</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive States</CardTitle>
            <CardDescription>Hover, focus, active, and disabled states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-center">
              <Button className="cursor-pointer hover:bg-primary/90">Hover Me</Button>
              <span className="text-sm text-muted-foreground">Default → Hover state</span>
            </div>
            <div className="flex gap-4 items-center">
              <Button className="cursor-pointer ring-2 ring-primary ring-offset-2">Focused</Button>
              <span className="text-sm text-muted-foreground">Focus ring for keyboard nav</span>
            </div>
            <div className="flex gap-4 items-center">
              <Button disabled className="opacity-50 cursor-not-allowed">Disabled</Button>
              <span className="text-sm text-muted-foreground">50% opacity, no pointer</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Destructive Actions */}
      <section id="destructive" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Destructive Actions</h2>
        <Card>
          <CardHeader>
            <CardTitle>Dangerous Action Styling</CardTitle>
            <CardDescription>How to style delete, cancel, and other destructive actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h5 className="text-base font-medium mb-3">In Dropdown Menus</h5>
              <div className="space-y-2">
                <div className="p-2 hover:bg-muted rounded cursor-pointer">
                  <span className="text-sm">Edit</span>
                </div>
                <div className="p-2 hover:bg-muted rounded cursor-pointer">
                  <span className="text-sm">Make a copy</span>
                </div>
                <div className="p-2 hover:bg-muted rounded cursor-pointer">
                  <span className="text-sm">Delete</span>
                </div>
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <code>Use standard DropdownMenuItem - no special colors needed</code>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h5 className="text-base font-medium mb-3">Destructive Buttons</h5>
              <div className="flex gap-4">
                <Button variant="destructive" className="cursor-pointer">Delete</Button>
                <Button variant="outline" className="cursor-pointer">
                  Cancel
                </Button>
              </div>
              <div className="mt-4 p-2 bg-muted rounded text-xs">
                <code>Use variant="destructive" for primary destructive actions only</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Layout Examples */}
      <section id="layout" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Layout Patterns</h2>
        
        <div className="space-y-6">
          {/* Grid Layout */}
          <Card>
            <CardHeader>
              <CardTitle>Grid Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded">Column 1</div>
                <div className="bg-muted p-4 rounded">Column 2</div>
                <div className="bg-muted p-4 rounded">Column 3</div>
              </div>
            </CardContent>
          </Card>

          {/* Flex Layout */}
          <Card>
            <CardHeader>
              <CardTitle>Flexbox Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="bg-muted p-2 rounded">Logo</div>
                  <div className="bg-muted p-2 rounded">Nav Item</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="cursor-pointer">Settings</Button>
                  <Button size="sm" className="cursor-pointer">Profile</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Responsive Design */}
      <section id="responsive" className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Responsive Design</h2>
        <Card>
          <CardHeader>
            <CardTitle>Breakpoints</CardTitle>
            <CardDescription>Tailwind CSS default breakpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Badge className="w-16">sm</Badge>
                <span className="text-sm">640px - Small devices</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="w-16">md</Badge>
                <span className="text-sm">768px - Medium devices (tablets)</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="w-16">lg</Badge>
                <span className="text-sm">1024px - Large devices (laptops)</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="w-16">xl</Badge>
                <span className="text-sm">1280px - Extra large devices</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="w-16">2xl</Badge>
                <span className="text-sm">1536px - 2X large devices</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}