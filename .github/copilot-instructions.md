# Copilot Instructions for Feed Reminder

## Overview
This project is a reminder application designed to help users manage their feeds effectively. It utilizes Next.js for server-side rendering and React for building user interfaces. The architecture is modular, with clear separation of concerns across components, hooks, and modules.

## Architecture
- **Root Layout**: The main layout is defined in `src/app/layout.tsx`, which wraps the application in necessary providers like `TRPCReactProvider` and `NuqsAdapter` for state management and API handling.
- **Data Layer**: The database connection is established in `src/db/index.ts` using `drizzle-orm`, which interacts with a PostgreSQL database.
- **API Layer**: The API routes are defined using TRPC in `src/app/api/trpc/[trpc]/route.ts`, allowing for type-safe API calls.
- **Component Structure**: UI components are organized under `src/components/ui`, following a consistent pattern for styling and functionality.

## Developer Workflows
- **Running the Application**: Use `npm run dev` to start the development server. This will enable hot reloading for a smoother development experience.
- **Database Management**: Use `npm run db:push` to push schema changes to the database. This command utilizes `drizzle-kit` for managing database migrations.
- **Testing and Linting**: Run `npm run lint` to check for code quality issues. Ensure that all components are tested adequately before merging changes.

## Project Conventions
- **Component Naming**: Components are named using PascalCase and are stored in their respective directories based on functionality (e.g., `src/components/ui` for UI components).
- **Styling**: Tailwind CSS is used for styling, with utility classes applied directly in JSX. Ensure to follow the established class naming conventions for consistency.
- **State Management**: Use React Query for data fetching and state management, as seen in `src/modules/agents/views/agents-view.tsx`.

## Integration Points
- **TRPC**: The application uses TRPC for type-safe API calls. Ensure to define routers in `src/trpc/routers/_app.ts` and create procedures in respective module directories.
- **Database**: The application connects to a PostgreSQL database using environment variables defined in `.env`. Ensure to set `DATABASE_URL` correctly.
- **External Libraries**: The project relies on several external libraries, including `@radix-ui` for UI components and `react-query` for data fetching. Refer to `package.json` for a complete list of dependencies.

## Communication Patterns
- **Props and Context**: Components communicate through props and context providers. Ensure to pass necessary data down the component tree to maintain a clean and manageable state.
- **Hooks**: Custom hooks are used for encapsulating logic, such as `useAgentsFilters` in `src/modules/agents/hooks/use-agents-filters.ts`. This promotes reusability and separation of concerns.

## Examples
- **Using TRPC in Components**: In `src/modules/agents/views/agents-view.tsx`, the `useSuspenseQuery` hook is used to fetch agent data, demonstrating how to handle asynchronous data fetching with TRPC.
- **Creating a New Component**: When creating a new UI component, follow the structure in `src/components/ui`, ensuring to include necessary props and styles as per the conventions outlined above.

---

This document serves as a guide for AI coding agents to navigate and contribute effectively to the Feed Reminder project. For any unclear sections or additional information needed, please provide feedback for further iterations.