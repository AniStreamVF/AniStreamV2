-- Migrer ton profil de profiles_backup → profiles
-- (à exécuter dans Supabase SQL Editor)

INSERT INTO public.profiles (user_id, display_name, avatar_url, bio, created_at, is_admin, role)
SELECT
  au.id,
  COALESCE(pb.name, 'User'),
  COALESCE(pb.avatar, ''),
  COALESCE(pb.bio, ''),
  COALESCE(pb.created_at, now()),
  COALESCE(pb.is_admin, false),
  CASE WHEN pb.is_admin THEN 'admin' ELSE 'user' END
FROM public.profiles_backup pb
JOIN auth.users au ON au.email = pb.email
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio;
