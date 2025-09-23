# Superadmin Setup Task

## Completed Steps
- ✅ Analyzed the codebase to understand user and company management
- ✅ Created `scripts/setup-superadmin.ts` script to set up superadmin user and company
- ✅ Script includes user creation, company creation, and linking with owner role
- ✅ Added company settings configuration

## Next Steps
- [ ] Test the script by running it
- [ ] Verify that the superadmin user can log in successfully
- [ ] Optionally create documentation on how to use the script
- [ ] Consider adding the script to package.json for easy execution

## Notes
- The script uses environment variables for configuration (SUPERADMIN_EMAIL, SUPERADMIN_USERNAME, etc.)
- Default values are provided if environment variables are not set
- The script checks for existing users/companies to avoid duplicates
- Password is hashed using bcrypt before storage

---

# Company Creation Authentication Fix

## Problem
- Frontend was failing to create companies due to missing JWT authentication headers
- Error: "Failed to execute 'fetch' on 'Window': '/api/admin/companies' is not a valid HTTP method"
- Backend was receiving GET requests instead of POST and returning 401 Unauthorized

## Root Cause
- The `apiRequest` function in `client/src/lib/queryClient.ts` was not including JWT token in headers
- The `getQueryFn` function was also missing authentication headers
- The `logout` function in `auth-context.tsx` was using direct fetch instead of authenticated `apiRequest`

## Completed Fixes
- ✅ Fixed `apiRequest` function to include `Authorization: Bearer ${token}` header
- ✅ Fixed `getQueryFn` function to include authentication headers for React Query
- ✅ Updated `logout` function in auth-context to use authenticated `apiRequest`
- ✅ All API calls now properly send JWT tokens for authentication

## Files Modified
- `client/src/lib/queryClient.ts` - Added JWT authentication to API requests
- `client/src/contexts/auth-context.tsx` - Updated logout to use authenticated requests

## Testing Required
- [ ] Test company creation in admin panel
- [ ] Verify all other admin functions work correctly
- [ ] Test user login/logout flow
- [ ] Verify React Query operations work with authentication
