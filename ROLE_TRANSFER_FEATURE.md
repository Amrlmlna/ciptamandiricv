# Superadmin Role Transfer Functionality

## Overview
The update-role API has been modified to implement automatic role transfer when the superadmin limit (2) is reached. This eliminates the need for manual role transfers while maintaining the maximum limit of 2 superadmins.

## Changes Made

### 1. API Route Update (`app/api/update-role/route.ts`)
- **Before**: When the superadmin limit was reached, the API would return an error requiring manual transfer
- **After**: When the superadmin limit is reached and a superadmin attempts to promote an admin to superadmin, the API automatically:
  - Demotes the current superadmin to admin
  - Promotes the target admin to superadmin
  - Logs the role transfer in the audit log

### 2. UI Update (`app/dashboard/admin/users/page.tsx`)
- **Before**: The button always showed "Promosikan" (Promote) for admin users
- **After**: The button dynamically changes to:
  - "Promosikan" when there are fewer than 2 superadmins
  - "Transfer" when there are 2 superadmins (limit reached)

## How It Works

1. **Automatic Transfer**: When the superadmin limit (2) is reached and a superadmin tries to promote an admin to superadmin:
   - The current superadmin is automatically demoted to admin
   - The target admin is promoted to superadmin
   - No manual intervention required

2. **UI Indication**: The button text changes to "Transfer" to indicate that clicking it will perform a role transfer rather than just a promotion

3. **Audit Trail**: All transfers are logged in the audit log with action type "role_transfer" to maintain transparency

## Code Changes

### API Route Changes:
- Added automatic role transfer logic when superadmin limit is reached
- Added proper error handling with rollbacks
- Added audit logging for role transfers

### UI Changes:
- Added state to track superadmin count
- Added dynamic button text based on superadmin count
- Updated role update function to use local state instead of making additional calls

## Testing
The functionality can be tested by:
1. Ensuring there are already 2 superadmins in the system
2. Attempting to promote an admin user to superadmin
3. Verifying that the current superadmin becomes an admin and the target user becomes a superadmin
4. Confirming that the UI button changes from "Promosikan" to "Transfer" when the limit is reached