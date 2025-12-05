#!/bin/bash
# Quick command to copy the SQL fix to clipboard

echo "📋 Copying SQL trigger to clipboard..."
cat sql/fix_unread_status_trigger.sql | pbcopy

echo ""
echo "✅ SQL copied to clipboard!"
echo ""
echo "Next steps:"
echo "1. Open Supabase SQL Editor: https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Navigate to SQL Editor"
echo "4. Paste (Cmd+V) and execute the SQL"
echo "5. Check the output - you should see the trigger was created"
echo ""
echo "After applying, test by:"
echo "- Sending a message in one browser"
echo "- Checking if the notification badge updates in another browser"
echo ""
