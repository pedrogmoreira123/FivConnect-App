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
