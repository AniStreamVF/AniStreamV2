-- ============================================================
-- INSTALL COMPLETE : Tables app sans perdre tes données
-- ============================================================
-- Étape 1 : Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Étape 2 : Créer le type énuméré app_role (si pas déjà fait)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Étape 3 : Sauvegarder tes tables existantes qui ont conflit
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles RENAME TO profiles_backup;
    BEGIN
      ALTER TABLE public.profiles_backup RENAME CONSTRAINT profiles_pkey TO profiles_backup_pkey;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
      ALTER TABLE public.profiles_backup RENAME CONSTRAINT profiles_user_id_fkey TO profiles_backup_user_id_fkey;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'playlists') THEN
    ALTER TABLE public.playlists RENAME TO playlists_backup;
    BEGIN
      ALTER TABLE public.playlists_backup RENAME CONSTRAINT playlists_pkey TO playlists_backup_pkey;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
      ALTER TABLE public.playlists_backup RENAME CONSTRAINT playlists_user_id_fkey TO playlists_backup_user_id_fkey;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_config') THEN
    ALTER TABLE public.app_config RENAME TO app_config_backup;
    BEGIN
      ALTER TABLE public.app_config_backup RENAME CONSTRAINT app_config_pkey TO app_config_backup_pkey;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- Étape 4 : Créer TOUTES les tables de l'app (main.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL CHECK (message_type = ANY (ARRAY['broadcast'::text, 'individual'::text])),
  recipient_id uuid,
  sender_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  priority text DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT admin_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.admin_popups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  popup_type text NOT NULL DEFAULT 'banner'::text,
  background_color text DEFAULT '#1B1919'::text,
  text_color text DEFAULT '#FFFFFF'::text,
  accent_color text DEFAULT '#FF1493'::text,
  image_url text,
  action_text text,
  action_url text,
  dismiss_text text DEFAULT 'Dismiss'::text,
  target_pages text[] DEFAULT '{}',
  target_user_type text DEFAULT 'all'::text,
  show_on_mobile boolean DEFAULT true,
  show_on_desktop boolean DEFAULT true,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  frequency text DEFAULT 'once'::text,
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT admin_popups_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  page_path text,
  metadata jsonb,
  ip_hash text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.anime_trending_scores (
  anime_id text NOT NULL,
  trending_score numeric,
  last_computed timestamp with time zone DEFAULT now(),
  views_window integer,
  favorites_count integer,
  avg_watch_duration numeric,
  completion_rate numeric,
  sparkline jsonb,
  CONSTRAINT anime_trending_scores_pkey PRIMARY KEY (anime_id)
);

CREATE TABLE IF NOT EXISTS public.anime_view_counts (
  anime_id text NOT NULL,
  total_views integer DEFAULT 0,
  views_today integer DEFAULT 0,
  views_week integer DEFAULT 0,
  views_month integer DEFAULT 0,
  unique_viewers integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT anime_view_counts_pkey PRIMARY KEY (anime_id)
);

CREATE TABLE IF NOT EXISTS public.anime_views (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  anime_id text NOT NULL,
  episode_id text NOT NULL,
  user_id uuid,
  session_id text,
  ip_hash text,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  watch_duration integer DEFAULT 0,
  completed boolean DEFAULT false,
  CONSTRAINT anime_views_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.app_config (
  key text NOT NULL,
  value text,
  CONSTRAINT app_config_pkey PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS public.ban_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text NOT NULL,
  duration_hours integer,
  expires_at timestamp with time zone,
  unbanned_at timestamp with time zone,
  unbanned_by uuid,
  CONSTRAINT ban_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'success'::text])),
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  CONSTRAINT broadcast_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.changelog (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version text NOT NULL,
  release_date date NOT NULL DEFAULT CURRENT_DATE,
  title text,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT false,
  is_latest boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT changelog_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anime_id text NOT NULL,
  episode_id text,
  content text NOT NULL CHECK (char_length(content) <= 2000),
  parent_id uuid,
  likes_count integer DEFAULT 0,
  is_spoiler boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_pinned boolean DEFAULT false,
  CONSTRAINT comments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.custom_language_anime (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  language_id uuid,
  anime_id text NOT NULL,
  title text NOT NULL,
  poster text,
  episode_count text,
  airing_time text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT custom_language_anime_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.custom_languages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  poster text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT custom_languages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.custom_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['embed'::text, 'direct'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  anime_id text,
  episode_id text,
  CONSTRAINT custom_sources_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.custom_video_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  anime_id text NOT NULL,
  episode_number integer NOT NULL,
  server_name text NOT NULL,
  video_url text NOT NULL,
  quality text DEFAULT 'auto'::text,
  subtitles jsonb DEFAULT '[]'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  added_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  anime_title text NOT NULL DEFAULT 'Unknown'::text,
  priority integer DEFAULT 1,
  subtitle_url text,
  subtitle_lang text,
  CONSTRAINT custom_video_sources_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.daily_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_visitors integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  guest_visitors integer DEFAULT 0,
  logged_in_visitors integer DEFAULT 0,
  total_page_views integer DEFAULT 0,
  total_watch_time_seconds bigint DEFAULT 0,
  new_users integer DEFAULT 0,
  new_comments integer DEFAULT 0,
  new_ratings integer DEFAULT 0,
  top_countries jsonb DEFAULT '[]'::jsonb,
  top_genres jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_analytics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.forum_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  is_spoiler boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_pinned boolean DEFAULT false,
  CONSTRAINT forum_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  content_type text DEFAULT 'text'::text CHECK (content_type = ANY (ARRAY['text'::text, 'image'::text, 'link'::text, 'poll'::text])),
  anime_id text,
  anime_name text,
  anime_poster text,
  playlist_id uuid,
  tierlist_id uuid,
  character_id text,
  character_name text,
  flair text,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_spoiler boolean DEFAULT false,
  is_nsfw boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  is_approved boolean DEFAULT true,
  CONSTRAINT forum_posts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.forum_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid,
  comment_id uuid,
  vote_type smallint NOT NULL CHECK (vote_type = ANY (ARRAY[-1, 1])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT forum_votes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.maintenance_mode (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  enabled_at timestamp with time zone,
  enabled_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT maintenance_mode_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,
  anime_id text NOT NULL,
  anime_name text,
  episode_number integer,
  data jsonb NOT NULL,
  status text DEFAULT 'pending'::text,
  moderator_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT marketplace_items_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.mobile_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  device_id text NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['android'::text, 'ios'::text])),
  app_version text NOT NULL,
  device_model text,
  os_version text,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  screen_name text,
  session_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mobile_analytics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['comment'::text, 'playlist'::text, 'tier_list'::text, 'forum_post'::text, 'profile'::text])),
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'flagged'::text])),
  flagged_by uuid,
  flagged_reason text,
  flagged_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT moderation_queue_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.page_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  ip_address inet,
  country text,
  city text,
  user_agent text,
  page_path text NOT NULL,
  referrer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT page_visits_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.playlist_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor'::text CHECK (role = ANY (ARRAY['viewer'::text, 'editor'::text, 'admin'::text])),
  added_by uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT playlist_collaborators_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL,
  anime_id text NOT NULL,
  anime_name text NOT NULL,
  anime_poster text,
  position integer NOT NULL DEFAULT 0,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT playlist_items_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  cover_image text,
  is_public boolean DEFAULT false,
  items_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  share_slug text,
  share_description text,
  embed_allowed boolean DEFAULT false,
  is_flagged boolean DEFAULT false,
  flagged_by uuid,
  flagged_reason text,
  flagged_at timestamp with time zone,
  flag_count integer DEFAULT 0,
  admin_reviewed boolean DEFAULT false,
  CONSTRAINT playlists_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.popup_dismissals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  popup_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  dismissed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT popup_dismissals_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.popups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  popup_type text NOT NULL CHECK (popup_type = ANY (ARRAY['banner'::text, 'modal'::text, 'toast'::text, 'fullscreen'::text])),
  background_color text DEFAULT '#1B1919'::text,
  text_color text DEFAULT '#FFFFFF'::text,
  accent_color text DEFAULT '#FF1493'::text,
  image_url text,
  action_text text,
  action_url text,
  dismiss_text text DEFAULT 'Dismiss'::text,
  target_pages text[] DEFAULT '{}',
  target_user_type text DEFAULT 'all'::text CHECK (target_user_type = ANY (ARRAY['all'::text, 'guests'::text, 'logged_in'::text, 'premium'::text])),
  show_on_mobile boolean DEFAULT true,
  show_on_desktop boolean DEFAULT true,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  frequency text DEFAULT 'once'::text CHECK (frequency = ANY (ARRAY['once'::text, 'always'::text, 'daily'::text, 'weekly'::text])),
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  use_theme_colors boolean DEFAULT false,
  CONSTRAINT popups_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_admin boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  banned_at timestamp with time zone,
  banned_by uuid,
  ban_reason text,
  is_public boolean DEFAULT true,
  banner_url text,
  total_watch_time_seconds bigint DEFAULT 0,
  showcase_anime_ids text[] DEFAULT '{}',
  mal_user_id text,
  mal_access_token text,
  mal_refresh_token text,
  mal_token_expires_at timestamp with time zone,
  anilist_user_id text,
  anilist_access_token text,
  anilist_token_expires_at timestamp with time zone,
  social_links jsonb DEFAULT '{}'::jsonb,
  show_watchlist boolean DEFAULT true,
  show_history boolean DEFAULT true,
  role text DEFAULT 'user'::text,
  last_seen timestamp with time zone DEFAULT now(),
  mal_auto_delete boolean DEFAULT false,
  anilist_refresh_token text,
  is_moderator boolean DEFAULT false,
  can_broadcast boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.push_notifications_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['all'::text, 'user'::text])),
  target_user_id uuid,
  sent_count integer DEFAULT 0,
  sent_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_notifications_log_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address inet,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anime_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 10),
  review text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ratings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['comment'::text, 'forum_post'::text, 'tier_list'::text])),
  entity_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type = ANY (ARRAY['like'::text, 'love'::text, 'laugh'::text, 'wow'::text, 'sad'::text, 'angry'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reactions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.recommendations_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  recommendations jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, (now() + '12:00:00'::interval)),
  CONSTRAINT recommendations_cache_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.redirects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  target_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT redirects_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending'::text,
  moderator_id uuid,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT security_audit_log_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.status_incident_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  message text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['investigating'::text, 'identified'::text, 'monitoring'::text, 'resolved'::text])),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT status_incident_updates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.status_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['investigating'::text, 'identified'::text, 'monitoring'::text, 'resolved'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['minor'::text, 'major'::text, 'critical'::text])),
  affected_services text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT status_incidents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending'::text,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_url text,
  priority text DEFAULT 'normal'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  CONSTRAINT suggestions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tier_list_comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tier_list_comment_likes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tier_list_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tier_list_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid,
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tier_list_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tier_list_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier_list_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tier_list_likes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tier_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_code text UNIQUE,
  likes_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tier_lists_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_follows_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_notification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text,
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_notification_tokens_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_reviews_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['feature'::text, 'bug'::text, 'improvement'::text, 'content'::text, 'other'::text])),
  priority text DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'approved'::text, 'rejected'::text, 'implemented'::text])),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  CONSTRAINT user_suggestions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.watch_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anime_id text NOT NULL,
  anime_name text NOT NULL,
  anime_poster text,
  episode_id text NOT NULL,
  episode_number integer NOT NULL,
  progress_seconds integer DEFAULT 0,
  duration_seconds integer,
  completed boolean DEFAULT false,
  watched_at timestamp with time zone NOT NULL DEFAULT now(),
  mal_id integer,
  anilist_id integer,
  CONSTRAINT watch_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.watch_room_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  invited_user_id uuid,
  invite_code text UNIQUE,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval),
  CONSTRAINT watch_room_invites_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.watch_room_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  user_id uuid,
  display_name text NOT NULL,
  avatar_url text,
  message text NOT NULL,
  message_type text DEFAULT 'chat'::text CHECK (message_type = ANY (ARRAY['chat'::text, 'system'::text, 'reaction'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT watch_room_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.watch_room_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  is_host boolean DEFAULT false,
  joined_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  is_ready boolean DEFAULT false,
  CONSTRAINT watch_room_participants_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.watch_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  host_id uuid NOT NULL,
  anime_id text,
  anime_title text,
  anime_poster text,
  episode_id text,
  episode_number integer,
  access_type text DEFAULT 'public'::text CHECK (access_type = ANY (ARRAY['public'::text, 'invite'::text, 'password'::text])),
  password_hash text,
  current_time_seconds double precision DEFAULT 0,
  is_playing boolean DEFAULT false,
  is_active boolean DEFAULT true,
  max_participants integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  scheduled_start_at timestamp with time zone,
  episode_title text,
  category text DEFAULT 'sub'::text CHECK (category = ANY (ARRAY['sub'::text, 'dub'::text])),
  manual_subtitle_url text,
  manual_stream_url text,
  manual_stream_type text DEFAULT 'direct'::text,
  selected_server text,
  CONSTRAINT watch_rooms_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.watch_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  anime_id text NOT NULL,
  episode_id text NOT NULL,
  anime_name text,
  anime_poster text,
  genres text[],
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  end_time timestamp with time zone,
  watch_duration_seconds integer DEFAULT 0,
  ip_address inet,
  country text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT watch_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anime_id text NOT NULL,
  anime_name text NOT NULL,
  anime_poster text,
  status text DEFAULT 'plan_to_watch'::text CHECK (status = ANY (ARRAY['watching'::text, 'completed'::text, 'plan_to_watch'::text, 'dropped'::text, 'on_hold'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  mal_id integer,
  anilist_id integer,
  CONSTRAINT watchlist_pkey PRIMARY KEY (id)
);

-- ============================================================
-- Étape 5 : Ajouter les indexes pour les performances
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_anime_id ON public.watch_history(anime_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_anime_id ON public.comments(anime_id);
CREATE INDEX IF NOT EXISTS idx_ratings_anime_id ON public.ratings(anime_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON public.forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_lists_user_id ON public.tier_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_anime_views_anime_id ON public.anime_views(anime_id);
CREATE INDEX IF NOT EXISTS idx_ban_history_user_id ON public.ban_history(user_id);

-- ============================================================
-- Étape 6 : Créer la fonction auto-create profile au signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger sur auth.users (à exécuter dans Supabase SQL Editor avec droits admin)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ✅ FINI ! Tes anciennes tables sont dans profiles_backup, playlists_backup, app_config_backup
-- Les nouvelles tables de l'app sont créées.
-- Va dans Supabase Dashboard > SQL Editor, colle et exécute tout.
-- ============================================================
