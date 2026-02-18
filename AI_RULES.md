# AI Development Rules

## Tech Stack
- **Framework**: React 18 with TypeScript for robust, type-safe frontend development.
- **Build Tool**: Vite for fast development and optimized builds.
- **Styling**: Tailwind CSS for utility-first styling and rapid UI development.
- **UI Components**: shadcn/ui (built on Radix UI) for accessible, customizable, and consistent UI elements.
- **Routing**: React Router for client-side navigation and routing logic.
- **Icons**: Lucide React for a clean and consistent icon set.
- **Backend/Database**: Supabase (where applicable) for authentication and data storage.
- **State Management**: React Hooks (useState, useMemo, useEffect) and Context API for local and global state.

## Core Rules & Guidelines

### 1. Code Structure
- **Pages**: Store all main view components in `src/pages/`.
- **Components**: Store reusable UI components in `src/components/`. UI primitives from shadcn go in `src/components/ui/`.
- **Routing**: Define all routes centrally in `src/App.tsx`.
- **Entry Point**: The default landing page is `src/pages/Index.tsx`.
- **Naming**: Use PascalCase for component files and camelCase for utility/hook files.

### 2. Styling Principles
- **Tailwind First**: Always use Tailwind CSS utility classes for styling. Avoid writing custom CSS in `.css` files unless absolutely necessary.
- **Responsive Design**: Use Tailwind's responsive prefixes (e.g., `sm:`, `md:`, `lg:`) to ensure mobile-friendly layouts.
- **Consistency**: Stick to the project's color palette and spacing scale defined in `tailwind.config.ts`.

### 3. Component Usage
- **shadcn/ui**: Prioritize using existing shadcn components. If a new component is needed, check if it can be built by composing existing ones.
- **Lucide Icons**: Use `lucide-react` for all iconography.
- **Accessibility**: Ensure all interactive elements are accessible, following the patterns established by Radix UI.

### 4. Development Philosophy
- **Simplicity**: Keep code simple and elegant. Avoid overengineering or adding unnecessary complexity.
- **Functional Components**: Use functional components with hooks. Avoid class components.
- **Type Safety**: Maintain strict TypeScript definitions. Avoid using `any`.
- **Performance**: Use `useMemo` and `useCallback` appropriately to optimize expensive calculations or prevent unnecessary re-renders.

### 5. Data Handling
- **Supabase**: Use the Supabase client for database interactions and authentication.
- **Hooks**: Encapsulate data fetching logic in custom hooks (e.g., `src/hooks/`) to keep components clean.
- **Form Management**: Use `react-hook-form` along with shadcn's form components for robust form handling.

### 6. File Edits
- **Surgical Changes**: Use `search_replace` for small, specific changes.
- **Full Writes**: Use `write_file` for new files or major refactors.
- **Verification**: Always run type checks after making changes to ensure project integrity.
