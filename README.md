# POS System

A modern, full-featured Point of Sale system built with Next.js, React, and MongoDB.

## Features

### Product Management
- **Multiple Product Types**: Support for both retail shop products and general service products
- **Category Management**: Organize products into categories with drag-and-drop reordering
- **Variations**: Add size/price variations to products (SM, MD, LG, etc.)
- **Modifications**: Create modification groups (Milk options, Syrups, etc.) with individual pricing
- **Auto-Save**: Changes automatically save after 3 seconds with visual indicators
- **Inventory Tracking**: Track quantity and par levels for stock management

### User Interface
- **Modern Design**: Clean, dark theme interface built with shadcn/ui components
- **Drag & Drop**: Reorder categories and product modifications with intuitive drag handles
- **Responsive Tables**: Product listings with expandable detail sheets
- **Visual Feedback**: Real-time save indicators and loading states

### Employee Management
- **PIN-based Authentication**: Secure employee login with PIN codes
- **Role Management**: Support for different employee roles and permissions
- **Multi-location Support**: Manage multiple store locations

### Customer Features
- **Customer Database**: Track customer information and purchase history
- **Membership System**: Support for customer memberships and benefits
- **Mobile App API**: Separate API endpoints for customer mobile application

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Cookie-based for employees, Bearer token for customers
- **State Management**: Immer for immutable state updates
- **Drag & Drop**: @dnd-kit for sortable functionality
- **Editor**: TipTap for WYSIWYG content editing

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB instance (local or cloud)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mbathie/pos.git
cd pos
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
MONGODB_URI=your_mongodb_connection_string
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev --turbopack
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
/app
  /(app)         # Main application routes
    /products    # Product management
      /shop      # Retail shop products
      /general   # General service products
    /customers   # Customer management
    /employees   # Employee management
  /api          # API routes
    /c          # Customer API endpoints
/components     # Reusable React components
/lib           # Utility functions and shared logic
/models        # Mongoose database models
/public        # Static assets
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:headed` - Run headed tests

### Code Conventions

- Use absolute imports from `@/` for all internal imports
- Follow existing component patterns and naming conventions
- Extract shared logic to `/lib` directory
- Keep API routes RESTful and consistent

## API Documentation

### Employee API Endpoints
- `GET /api/products` - List all products
- `POST /api/products` - Create new product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product
- `GET /api/categories` - List categories
- `POST /api/categories/[name]` - Create category

### Customer API Endpoints
- `POST /api/c/auth/login` - Customer login
- `GET /api/c/memberships` - Get customer memberships
- `GET /api/c/locations/[id]` - Get location details

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact the development team or create an issue in the GitHub repository.