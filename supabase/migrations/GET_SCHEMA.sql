-- Exécute ça dans l'éditeur SQL de Supabase (Dashboard > SQL Editor)
-- pour voir la structure actuelle de ta base

SELECT
    t.table_name,
    json_agg(
        json_build_object(
            'column', c.column_name,
            'type', c.data_type,
            'nullable', c.is_nullable,
            'default', c.column_default
        ) ORDER BY c.ordinal_position
    ) AS columns
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;
