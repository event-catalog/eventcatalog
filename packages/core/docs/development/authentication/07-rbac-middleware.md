---
sidebar_position: 7
keywords:
- EventCatalog RBAC
- Role-based access control
- Middleware
- Custom authentication
- Access control
sidebar_label: Role-Based Access Control
title: RBAC Middleware
description: Implementing role-based access control with custom middleware in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="2.44.0" />
<PlanBanner plan="Enterprise" />

# Role-Based Access Control (RBAC) Middleware

EventCatalog supports **Role-Based Access Control (RBAC)** through custom middleware, allowing you to control user access to specific pages and sections based on their roles and groups.

## How it works

The RBAC middleware integrates with EventCatalog's authentication system to provide fine-grained access control:

1. **User authenticates** through your configured identity provider
2. **Middleware evaluates** the user's roles and groups against defined access rules
3. **Access is granted or denied** based on the matching rules for the requested path
4. **User sees appropriate content** or receives a 403 Forbidden response

## Prerequisites

Before setting up RBAC middleware, ensure you have:

- ✅ [Authentication enabled](/docs/development/authentication/enabling-authentication) in your EventCatalog
- ✅ An authentication provider configured (GitHub, Google, Azure AD, etc.)
- ✅ User roles and groups configured in your identity provider

## Setting up RBAC Middleware

### 1. Create the middleware file

Create a `middleware.ts` file in the root of your EventCatalog project:

```typescript title="middleware.ts"
import type { MiddlewareHandler } from 'astro';

interface Locals {
  hasRole: (role: string) => boolean;
  hasGroup: (group: string) => boolean;
  findMatchingRule: (rules: Record<string, () => boolean>, pathname: string) => (() => boolean) | null;
}

export const rbacMiddleware: MiddlewareHandler = async (context, next) => {
  const { locals, url } = context;
  const pathname = url.pathname;

  // Utility functions are available in the locals object
  const { hasRole, hasGroup, findMatchingRule } = locals as Locals;

  // Define your access rules
  // Maps page routes to a function that returns true if the user has access, false otherwise
  // You can use wildcards to match multiple paths
  const accessRules = {
    '/docs/domains/E-Commerce/*': () => !hasGroup('Viewer'),
    '/visualiser/domains/E-Commerce/*': () => !hasGroup('Viewer'),
    '/docs/services/payment/*': () => hasRole('Developer') || hasRole('Admin'),
    '/admin/*': () => hasRole('Admin'),
  };

  if (findMatchingRule) {
    // Find matching rule for the current path
    const rule = findMatchingRule(accessRules, pathname);

    if (rule && !rule()) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  return next();
};
```

### 2. Configure your access rules

The `accessRules` object defines path-based access control:

```typescript
const accessRules = {
  // Block 'Viewer' group from E-Commerce domain docs
  '/docs/domains/E-Commerce/*': () => !hasGroup('Viewer'),
  
  // Require 'Developer' or 'Admin' role for payment services
  '/docs/services/payment/*': () => hasRole('Developer') || hasRole('Admin'),
  
  // Admin-only sections
  '/admin/*': () => hasRole('Admin'),
  
  // Multiple conditions
  '/docs/sensitive/*': () => hasRole('Admin') && !hasGroup('External'),
};
```

### 3. Available helper functions

The middleware provides several helper functions through `locals`:

#### `hasRole(role: string)`
Checks if the user has a specific role:
```typescript
hasRole('Admin')        // Returns true if user has Admin role
hasRole('Developer')    // Returns true if user has Developer role
```

#### `hasGroup(group: string)`
Checks if the user belongs to a specific group:
```typescript
hasGroup('Viewer')      // Returns true if user is in Viewer group
hasGroup('External')    // Returns true if user is in External group
```

#### `findMatchingRule(rules, pathname)`
Finds the first matching rule for a given pathname using glob patterns:
```typescript
// Matches paths like:
// - /docs/domains/E-Commerce/orders
// - /docs/domains/E-Commerce/products/catalog
'/docs/domains/E-Commerce/*': () => hasRole('Developer')
```

## Access Rule Patterns

### Path-based rules
Control access to specific pages or sections using exact paths or wildcard patterns.
```typescript
const accessRules = {
  // Exact path match
  '/admin/settings': () => hasRole('Admin'),
  
  // Wildcard matching
  '/docs/domains/Banking/*': () => hasGroup('Banking-Team'),
  
  // Multiple level wildcards
  '/api/*/internal/*': () => hasRole('Internal-Developer'),
};
```

### Role-based rules
Define access permissions based on user roles with single or multiple role requirements.
```typescript
const accessRules = {
  // Single role requirement
  '/admin/*': () => hasRole('Admin'),
  
  // Multiple role options (OR)
  '/docs/api/*': () => hasRole('Developer') || hasRole('Architect'),
  
  // Multiple role requirements (AND)
  '/sensitive/*': () => hasRole('Admin') && hasRole('Security-Cleared'),
};
```

### Group-based rules
Manage access using group membership with inclusion, exclusion, or complex group logic.
```typescript
const accessRules = {
  // Exclude specific groups
  '/public/*': () => !hasGroup('External'),
  
  // Include specific groups
  '/team-docs/*': () => hasGroup('Internal-Team'),
  
  // Complex group logic
  '/project-alpha/*': () => hasGroup('Alpha-Team') || hasGroup('Leadership'),
};
```

## Common use cases

### Department-based access
Organize access control around your organizational structure, ensuring teams only see documentation relevant to their department.
```typescript
const accessRules = {
  '/docs/domains/HR/*': () => hasGroup('HR-Department'),
  '/docs/domains/Finance/*': () => hasGroup('Finance-Department'),
  '/docs/domains/Engineering/*': () => hasGroup('Engineering-Department'),
};
```

### Hierarchical permissions
Create layered access levels where higher privilege users can access all lower-level content.
```typescript
const accessRules = {
  '/docs/public/*': () => true, // Everyone can access
  '/docs/internal/*': () => !hasGroup('External'),
  '/docs/confidential/*': () => hasRole('Manager') || hasRole('Admin'),
  '/docs/top-secret/*': () => hasRole('Admin'),
};
```

### Feature-based access
Control access to specific EventCatalog features based on user roles and responsibilities.
```typescript
const accessRules = {
  '/visualiser/*': () => hasRole('Architect') || hasRole('Developer'),
  '/api-explorer/*': () => hasRole('Developer'),
  '/admin/*': () => hasRole('Admin'),
};
```

## Troubleshooting

### Users getting 403 errors unexpectedly

1. **Check role/group assignment** in your identity provider
2. **Debug user permissions** by logging the locals to see what roles and groups are available:
   ```typescript
   export const rbacMiddleware: MiddlewareHandler = async (context, next) => {
     const { locals, url } = context;
     
     // Log the user's roles and groups for debugging
     console.log('User locals:', {
       pathname: url.pathname,
       locals: locals
     });
     
     // Your existing middleware code...
   };
   ```
3. **Verify rule logic** - ensure your conditions are correct:
   ```typescript
   // Wrong: This blocks everyone except Viewers
   '/docs/*': () => hasGroup('Viewer')
   
   // Correct: This blocks only Viewers
   '/docs/*': () => !hasGroup('Viewer')
   ```

### Rules not matching expected paths

1. **Test your glob patterns** - ensure wildcards match your URL structure
2. **Check path casing** - paths are case-sensitive
3. **Verify rule order** - more specific rules should come before general ones

### Session issues

1. **Ensure user is authenticated** before middleware runs
2. **Check session expiration** - users may need to re-authenticate
3. **Verify locals are populated** - `hasRole` and `hasGroup` functions must be available

## Security best practices

- ✅ **Principle of least privilege** - Grant minimum required access
- ✅ **Regular access reviews** - Audit user roles and permissions
- ✅ **Test thoroughly** - Verify access rules with different user types
- ✅ **Monitor access attempts** - Log and review 403 responses
- ✅ **Use groups over individual users** - Easier to manage and scale

## Next steps

With RBAC middleware configured, you can:

- Set up more complex access patterns based on your organization structure
- Integrate with external authorization systems
- Add custom logging for access attempts

Need help? Join our [Discord community](https://eventcatalog.dev/discord) for support and best practices from other EventCatalog users.