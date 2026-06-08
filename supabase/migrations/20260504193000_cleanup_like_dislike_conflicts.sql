-- Cleanup: ensure a directed pair isn't both liked and disliked.
-- We keep the most recent reaction per (user_id, other_user_id) based on created_at.

-- Relationship tables: likes + dislikes
WITH combined AS (
  SELECT
    user_id,
    liked_user_id AS other_user_id,
    'like'::text AS reaction,
    COALESCE(created_at, now()) AS created_at
  FROM public.likes
  UNION ALL
  SELECT
    user_id,
    disliked_user_id AS other_user_id,
    'dislike'::text AS reaction,
    COALESCE(created_at, now()) AS created_at
  FROM public.dislikes
),
ranked AS (
  SELECT
    user_id,
    other_user_id,
    reaction,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, other_user_id
      ORDER BY created_at DESC, reaction ASC
    ) AS rn
  FROM combined
),
winners AS (
  SELECT user_id, other_user_id, reaction
  FROM ranked
  WHERE rn = 1
)
DELETE FROM public.likes l
WHERE EXISTS (
  SELECT 1
  FROM winners w
  WHERE w.user_id = l.user_id
    AND w.other_user_id = l.liked_user_id
    AND w.reaction <> 'like'
);

WITH combined AS (
  SELECT
    user_id,
    liked_user_id AS other_user_id,
    'like'::text AS reaction,
    COALESCE(created_at, now()) AS created_at
  FROM public.likes
  UNION ALL
  SELECT
    user_id,
    disliked_user_id AS other_user_id,
    'dislike'::text AS reaction,
    COALESCE(created_at, now()) AS created_at
  FROM public.dislikes
),
ranked AS (
  SELECT
    user_id,
    other_user_id,
    reaction,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, other_user_id
      ORDER BY created_at DESC, reaction ASC
    ) AS rn
  FROM combined
),
winners AS (
  SELECT user_id, other_user_id, reaction
  FROM ranked
  WHERE rn = 1
)
DELETE FROM public.dislikes d
WHERE EXISTS (
  SELECT 1
  FROM winners w
  WHERE w.user_id = d.user_id
    AND w.other_user_id = d.disliked_user_id
    AND w.reaction <> 'dislike'
);

-- Friendship tables: friendship_likes + friendship_dislikes
WITH combined AS (
  SELECT
    user_id,
    liked_user_id AS other_user_id,
    'like'::text AS reaction,
    COALESCE(created_at, now()) AS created_at
  FROM public.friendship_likes
  UNION ALL
  SELECT
    user_id,
    disliked_user_id AS other_user_id,
    'dislike'::text AS reaction,
    COALESCE(created_at, now()) AS created_at
  FROM public.friendship_dislikes
),
ranked AS (
  SELECT
    user_id,
    other_user_id,
    reaction,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, other_user_id
      ORDER BY created_at DESC, reaction ASC
    ) AS rn
  FROM combined
),
winners AS (
  SELECT user_id, other_user_id, reaction
  FROM ranked
  WHERE rn = 1
)
DELETE FROM public.friendship_likes l
WHERE EXISTS (
  SELECT 1
  FROM winners w
  WHERE w.user_id = l.user_id
    AND w.other_user_id = l.liked_user_id
    AND w.reaction <> 'like'
);

WITH combined AS (
  SELECT
    user_id,
    liked_user_id AS other_user_id,
    'like'::text AS reaction,
    COALESCE(created_at, now()) AS created_at
  FROM public.friendship_likes
  UNION ALL
  SELECT
    user_id,
    disliked_user_id AS other_user_id,
    'dislike'::text AS reaction,
    COALESCE(created_at, now()) AS created_at
  FROM public.friendship_dislikes
),
ranked AS (
  SELECT
    user_id,
    other_user_id,
    reaction,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, other_user_id
      ORDER BY created_at DESC, reaction ASC
    ) AS rn
  FROM combined
),
winners AS (
  SELECT user_id, other_user_id, reaction
  FROM ranked
  WHERE rn = 1
)
DELETE FROM public.friendship_dislikes d
WHERE EXISTS (
  SELECT 1
  FROM winners w
  WHERE w.user_id = d.user_id
    AND w.other_user_id = d.disliked_user_id
    AND w.reaction <> 'dislike'
);

