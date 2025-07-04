-- # EventShare Enhanced Database Schema - Role System
-- # Supabase Dashboard > SQL Editor'de çalıştırılacak

-- # 1. Profiles tablosu - Mevcut tabloya eklemeler
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  user_type TEXT DEFAULT 'participant' CHECK (user_type IN ('organizer', 'participant', 'both'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  is_verified BOOLEAN DEFAULT false;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  preferred_role TEXT DEFAULT 'participant' CHECK (preferred_role IN ('organizer', 'participant'));

-- # 2. Events tablosu güncellemesi - Mevcut tabloya eklemeler
ALTER TABLE events ADD COLUMN IF NOT EXISTS 
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS 
  auto_approve_media BOOLEAN DEFAULT true;

ALTER TABLE events ADD COLUMN IF NOT EXISTS 
  allow_anonymous_upload BOOLEAN DEFAULT true;

ALTER TABLE events ADD COLUMN IF NOT EXISTS 
  max_media_per_user INTEGER DEFAULT 50;

-- # 3. Event Participants tablosu güncellemesi - Yeni role enum
ALTER TABLE event_participants DROP CONSTRAINT IF EXISTS event_participants_role_check;
ALTER TABLE event_participants ADD CONSTRAINT event_participants_role_check 
  CHECK (role IN ('creator', 'organizer', 'moderator', 'participant', 'viewer'));

-- # Yeni yetkiler ekleme
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS 
  can_moderate BOOLEAN DEFAULT false;

ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS 
  can_delete_media BOOLEAN DEFAULT false;

ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS 
  can_manage_participants BOOLEAN DEFAULT false;

ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS 
  can_edit_event BOOLEAN DEFAULT false;

-- # 4. Media tablosu güncellemesi
ALTER TABLE media ADD COLUMN IF NOT EXISTS 
  approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE media ADD COLUMN IF NOT EXISTS 
  approved_by UUID REFERENCES profiles(id);

ALTER TABLE media ADD COLUMN IF NOT EXISTS 
  approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE media ADD COLUMN IF NOT EXISTS 
  rejection_reason TEXT;

-- # 5. Yeni tablo: Event Invitations - Davet sistemi
CREATE TABLE IF NOT EXISTS event_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_email TEXT,
  invitee_phone TEXT,
  invitation_code TEXT UNIQUE,
  role TEXT DEFAULT 'participant' CHECK (role IN ('organizer', 'moderator', 'participant', 'viewer')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT invitation_contact_check CHECK (
    invitee_email IS NOT NULL OR invitee_phone IS NOT NULL
  )
);

-- # 6. Yeni tablo: Event Activity Log - Aktivite takibi
CREATE TABLE IF NOT EXISTS event_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'media_upload', 'media_delete', 'user_join', 'user_leave', 'settings_change'
  target_type TEXT, -- 'media', 'user', 'event'
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- # 7. Yeni tablo: Anonymous Users - Anonim kullanıcılar
CREATE TABLE IF NOT EXISTS anonymous_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  temp_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  upload_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- # 8. Role Permission Functions

-- # Organizatör yetkilerini kontrol eden function
CREATE OR REPLACE FUNCTION is_event_organizer(user_id UUID, event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_participants.user_id = is_event_organizer.user_id 
    AND event_participants.event_id = is_event_organizer.event_id 
    AND role IN ('creator', 'organizer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- # Moderatör yetkilerini kontrol eden function
CREATE OR REPLACE FUNCTION can_moderate_event(user_id UUID, event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_participants.user_id = can_moderate_event.user_id 
    AND event_participants.event_id = can_moderate_event.event_id 
    AND (role IN ('creator', 'organizer', 'moderator') OR can_moderate = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- # 9. Row Level Security (RLS) Policies

-- # Events table RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- # Herkes public etkinlikleri görebilir
CREATE POLICY "Public events are viewable by everyone" ON events
  FOR SELECT USING (visibility = 'public');

-- # Katılımcılar kendi etkinliklerini görebilir
CREATE POLICY "Participants can view their events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants 
      WHERE event_participants.event_id = events.id 
      AND event_participants.user_id = auth.uid()
    )
  );

-- # Sadece organizatörler etkinlik oluşturabilir
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- # Sadece organizatörler kendi etkinliklerini güncelleyebilir
CREATE POLICY "Organizers can update their events" ON events
  FOR UPDATE USING (
    is_event_organizer(auth.uid(), id)
  );

-- # Event Participants RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view event members" ON event_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants ep2 
      WHERE ep2.event_id = event_participants.event_id 
      AND ep2.user_id = auth.uid()
    )
  );

-- # Media RLS
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event participants can view approved media" ON media
  FOR SELECT USING (
    is_approved = true AND EXISTS (
      SELECT 1 FROM event_participants 
      WHERE event_participants.event_id = media.event_id 
      AND event_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload media to events they joined" ON media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_participants 
      WHERE event_participants.event_id = media.event_id 
      AND event_participants.user_id = auth.uid()
      AND can_upload = true
    )
  );

-- # 10. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_participants_user_event ON event_participants(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_role ON event_participants(role);
CREATE INDEX IF NOT EXISTS idx_media_event_status ON media(event_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
CREATE INDEX IF NOT EXISTS idx_anonymous_users_token ON anonymous_users(temp_token);
CREATE INDEX IF NOT EXISTS idx_event_activity_log_event ON event_activity_log(event_id, created_at);

-- # 11. Default roles setup function
CREATE OR REPLACE FUNCTION setup_default_roles()
RETURNS VOID AS $$
BEGIN
  -- # Mevcut event creators'ları organizer yap
  UPDATE event_participants 
  SET role = 'creator',
      can_moderate = true,
      can_delete_media = true,
      can_manage_participants = true,
      can_edit_event = true
  WHERE role = 'participant' AND user_id IN (
    SELECT creator_id FROM events WHERE events.id = event_participants.event_id
  );
  
  -- # Diğer katılımcıları participant olarak ayarla
  UPDATE event_participants 
  SET can_moderate = false,
      can_delete_media = false,
      can_manage_participants = false,
      can_edit_event = false
  WHERE role = 'participant';
END;
$$ LANGUAGE plpgsql;

-- # Mevcut verileri güncelle
SELECT setup_default_roles();

-- # 12. Trigger functions for activity logging
CREATE OR REPLACE FUNCTION log_event_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO event_activity_log (event_id, user_id, action_type, target_type, target_id, details)
    VALUES (NEW.event_id, NEW.uploader_id, 'media_upload', 'media', NEW.id, 
            jsonb_build_object('file_type', NEW.file_type, 'file_size', NEW.file_size));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO event_activity_log (event_id, user_id, action_type, target_type, target_id, details)
    VALUES (OLD.event_id, auth.uid(), 'media_delete', 'media', OLD.id,
            jsonb_build_object('file_name', OLD.file_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- # Media activity trigger
CREATE TRIGGER media_activity_trigger
  AFTER INSERT OR DELETE ON media
  FOR EACH ROW EXECUTE FUNCTION log_event_activity();

-- # User join/leave logging
CREATE OR REPLACE FUNCTION log_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO event_activity_log (event_id, user_id, action_type, target_type, target_id, details)
    VALUES (NEW.event_id, NEW.user_id, 'user_join', 'user', NEW.user_id,
            jsonb_build_object('role', NEW.role, 'user_name', NEW.user_name));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO event_activity_log (event_id, user_id, action_type, target_type, target_id, details)
    VALUES (OLD.event_id, OLD.user_id, 'user_leave', 'user', OLD.user_id,
            jsonb_build_object('role', OLD.role, 'user_name', OLD.user_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER participant_activity_trigger
  AFTER INSERT OR DELETE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION log_participant_activity();

-- # Success message
DO $$
BEGIN
  RAISE NOTICE 'EventShare Role System Database Schema Successfully Updated! 🚀';
  RAISE NOTICE 'New features added:';
  RAISE NOTICE '- Role-based permissions (creator, organizer, moderator, participant, viewer)';
  RAISE NOTICE '- Media approval system';
  RAISE NOTICE '- Anonymous user support';
  RAISE NOTICE '- Event invitations';
  RAISE NOTICE '- Activity logging';
  RAISE NOTICE '- Row Level Security (RLS)';
  RAISE NOTICE '- Performance indexes';
END $$;