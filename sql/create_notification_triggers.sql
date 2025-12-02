-- Triggers to create notifications for offer events

-- Trigger function for when an offer is created
CREATE OR REPLACE FUNCTION notify_offer_created() RETURNS TRIGGER AS $$
DECLARE
  v_listing_title text;
  v_thread_id text;
  v_amount text;
BEGIN
  -- Get listing title
  SELECT title INTO v_listing_title
  FROM listings
  WHERE id = NEW.listing_id;

  -- Get thread ID from offers table (assuming it's stored there)
  -- If not, we'll need to find it via messages
  SELECT thread_id INTO v_thread_id
  FROM messages
  WHERE id = (
    SELECT message_id FROM offers WHERE id = NEW.id LIMIT 1
  );

  -- Format amount
  v_amount := '£' || ROUND(NEW.amount::numeric, 2);

  -- Create notification for recipient
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.recipient::uuid,
    'offer_received',
    'New Offer Received',
    'You received an offer of ' || v_amount || ' on ' || COALESCE(v_listing_title, 'your listing'),
    '/messages/' || COALESCE(v_thread_id, '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for when an offer status changes
CREATE OR REPLACE FUNCTION notify_offer_status_changed() RETURNS TRIGGER AS $$
DECLARE
  v_listing_title text;
  v_thread_id text;
  v_amount text;
  v_notify_user_id uuid;
  v_notification_type text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  -- Only notify on status changes, not initial creation
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get listing title
  SELECT title INTO v_listing_title
  FROM listings
  WHERE id = NEW.listing_id;

  -- Get thread ID
  SELECT thread_id INTO v_thread_id
  FROM messages
  WHERE id = (
    SELECT message_id FROM offers WHERE id = NEW.id LIMIT 1
  );

  -- Format amount
  v_amount := '£' || ROUND(NEW.amount::numeric, 2);

  -- Determine who to notify and what to say based on status change
  CASE NEW.status
    WHEN 'accepted' THEN
      -- Notify the person who made the offer (starter)
      v_notify_user_id := NEW.starter::uuid;
      v_notification_type := 'offer_accepted';
      v_notification_title := 'Offer Accepted!';
      v_notification_message := 'Your offer of ' || v_amount || ' was accepted for ' || COALESCE(v_listing_title, 'the listing');
    
    WHEN 'declined' THEN
      -- Notify the person who made the offer (starter)
      v_notify_user_id := NEW.starter::uuid;
      v_notification_type := 'offer_declined';
      v_notification_title := 'Offer Declined';
      v_notification_message := 'Your offer of ' || v_amount || ' was declined for ' || COALESCE(v_listing_title, 'the listing');
    
    WHEN 'countered' THEN
      -- Notify the person who made the offer (starter)
      v_notify_user_id := NEW.starter::uuid;
      v_notification_type := 'offer_countered';
      v_notification_title := 'Counter Offer Received';
      v_notification_message := 'Your offer of ' || v_amount || ' was countered for ' || COALESCE(v_listing_title, 'the listing');
    
    ELSE
      -- No notification for other status changes
      RETURN NEW;
  END CASE;

  -- Create the notification
  IF v_notify_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_notify_user_id,
      v_notification_type,
      v_notification_title,
      v_notification_message,
      '/messages/' || COALESCE(v_thread_id, '')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_offer_created ON offers;
CREATE TRIGGER trigger_notify_offer_created
  AFTER INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_offer_created();

DROP TRIGGER IF EXISTS trigger_notify_offer_status_changed ON offers;
CREATE TRIGGER trigger_notify_offer_status_changed
  AFTER UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_offer_status_changed();
