-- Triggers to create notifications for offer events

-- Create notification when an offer message is inserted (has thread_id available)
CREATE OR REPLACE FUNCTION notify_offer_message_inserted() RETURNS TRIGGER AS $$
DECLARE
  v_listing_title text;
  v_amount_text text;
  v_recipient uuid;
BEGIN
  -- Only act on offer messages
  IF NEW.message_type <> 'offer' THEN
    RETURN NEW;
  END IF;

  -- Look up the offer to get recipient and amount/listing
  IF NEW.offer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT o.recipient, l.title
    INTO v_recipient, v_listing_title
  FROM offers o
  LEFT JOIN listings l ON l.id = o.listing_id
  WHERE o.id = NEW.offer_id;

  IF v_recipient IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prefer amount from message if present; else from offers table in a follow-up
  IF NEW.offer_amount_cents IS NOT NULL THEN
    v_amount_text := '£' || ROUND((NEW.offer_amount_cents::numeric / 100), 2);
  ELSE
    -- fallback: pull decimal amount from offers
    PERFORM 1 FROM offers WHERE id = NEW.offer_id; -- ensure row exists
    v_amount_text := (
      SELECT '£' || ROUND(o.amount::numeric, 2)
      FROM offers o WHERE o.id = NEW.offer_id
    );
  END IF;

  -- Create notification for recipient
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    v_recipient,
    'offer_received',
    'New Offer Received',
    'You received an offer of ' || v_amount_text || ' on ' || COALESCE(v_listing_title, 'your listing'),
    '/messages/' || NEW.thread_id::text
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

  -- Get thread ID via any message linked to this offer
  SELECT m.thread_id::text INTO v_thread_id
  FROM messages m
  WHERE m.offer_id = NEW.id
  ORDER BY m.created_at DESC NULLS LAST
  LIMIT 1;

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
-- Offer created: fire when the offer message is inserted (has thread_id ready)
DROP TRIGGER IF EXISTS trigger_notify_offer_message_inserted ON messages;
CREATE TRIGGER trigger_notify_offer_message_inserted
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_offer_message_inserted();

-- Clean up legacy trigger/function if previously created
DROP TRIGGER IF EXISTS trigger_notify_offer_created ON offers;
DROP FUNCTION IF EXISTS notify_offer_created();

DROP TRIGGER IF EXISTS trigger_notify_offer_status_changed ON offers;
CREATE TRIGGER trigger_notify_offer_status_changed
  AFTER UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_offer_status_changed();
