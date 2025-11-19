# GDPR Compliance for Business Storefronts

## Overview
This document outlines the GDPR compliance measures implemented for the business storefront feature, ensuring proper data protection and privacy controls.

## Private Data Protection

### Business Address Storage
- **Storage**: Business addresses are stored in the `business_address` JSONB column
- **Access Control**: Private by default, never exposed in public APIs or views
- **RLS Policy**: Only the business owner can access their own address via `get_own_business_address()` function
- **View Exclusion**: `business_profiles_public` view explicitly excludes `business_address`

### Secure Data Access
```sql
-- Owner-only access function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_own_business_address(profile_uuid UUID)
RETURNS JSONB AS $$
BEGIN
  IF auth.uid() = profile_uuid THEN
    RETURN (SELECT business_address FROM business_info WHERE profile_id = profile_uuid);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Row Level Security (RLS)

### Business Info Table
- **Read**: Public (private fields filtered via view)
- **Insert**: Profile owners only
- **Update**: Profile owners only
- **Delete**: Profile owners only

### Promoted Items Table
- **Read**: Public (all users can see active promotions)
- **Insert/Update/Delete**: Business owners only

### Business Reviews Table
- **Read**: Public (approved and non-flagged reviews only)
- **Insert**: Authenticated users (reviewers)
- **Update**: 
  - Reviewers can edit their own reviews (before business responds)
  - Business owners can add responses

## Data Minimization

### Public View (`business_profiles_public`)
Exposes only necessary information:
- ✅ Business name, type, logo, banner
- ✅ Contact info (phone, email, website)
- ✅ Opening hours, specialties
- ✅ Aggregated review statistics
- ❌ Business address (private)
- ❌ Internal IDs or sensitive metadata

## User Consent & Control

### Registration Flow
- Clear account type selection (Individual vs Business)
- Business users opt-in by selecting "Business" type
- Business-specific fields only shown after selection
- Terms acceptance required before registration

### Settings Page
- Business owners have full control over their information
- Can update or remove branding, contact details, hours
- Address marked as private with lock icon (🔒)
- Clear indication that address is not publicly displayed

## Data Subject Rights

### Right to Access
- Business owners can view all their data via settings page
- Private business address accessible only to owner

### Right to Rectification
- Full edit capabilities in `/settings/business`
- Real-time updates to business information

### Right to Erasure
- Account deletion removes all associated data via CASCADE
- Business info, promotions, and reviews deleted automatically

### Right to Data Portability
- API endpoints return structured JSON data
- Business owners can export their information

## Security Measures

### Authentication
- All sensitive operations require authentication (`auth.uid()`)
- Supabase auth handles session management
- JWT-based authorization

### Authorization
- RLS policies enforce owner-only access
- Database-level security (not just application-level)
- `SECURITY DEFINER` functions for safe private data access

### Data Validation
- CHECK constraints on rating values (1-5)
- Business type enumeration prevents invalid values
- Unique constraints prevent duplicate reviews per order

## Storage Security

### Image Upload
- Authenticated uploads only
- File type validation (JPEG, PNG, WebP)
- Size limits (5MB max)
- User-scoped storage paths (`user-id/filename`)

### Storage Buckets
- Public read access for logos and banners
- Owner-only write/delete permissions
- RLS policies on storage.objects table

## Transparency

### Privacy Notices
- Clear labeling of private fields in UI
- Blue notice box on business address section:
  > "🔒 This information is private and will never be displayed publicly. It's stored securely for verification purposes only."

### Data Usage
- Business address used for verification only
- Not shared with third parties
- Not used for marketing without consent

## Compliance Verification

### Checklist
- [x] Business address never exposed in public views
- [x] RLS policies enforce owner-only access
- [x] Private data access requires authentication
- [x] Secure functions use SECURITY DEFINER
- [x] Cascade deletion for data erasure
- [x] Clear privacy notices in UI
- [x] User consent during registration
- [x] Data minimization in public APIs
- [x] Proper access control on storage
- [x] Audit trail via timestamps

### Testing
1. Verify `business_profiles_public` view excludes address
2. Test `get_own_business_address()` with different users
3. Confirm RLS policies block unauthorized access
4. Validate storage policies prevent cross-user access
5. Check cascade deletion removes all related data

## Maintenance

### Regular Audits
- Review RLS policies quarterly
- Audit storage access logs
- Check for new privacy requirements
- Update documentation as needed

### Incident Response
- Monitor failed authorization attempts
- Alert on suspicious data access patterns
- Document any privacy incidents
- Notify affected users if breach occurs

## Contact
For privacy inquiries or data requests:
- Email: privacy@motorsauce.com (or appropriate contact)
- Response time: Within 30 days per GDPR requirements
