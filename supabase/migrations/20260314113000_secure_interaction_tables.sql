-- Protect romantic interaction tables with user-scoped RLS, while still
-- allowing admin cleanup actions without exposing broad browser-side reads.

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dislikes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes;
CREATE POLICY "Users can insert their own likes"
ON public.likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select likes involving them" ON public.likes;
CREATE POLICY "Users can select likes involving them"
ON public.likes
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = liked_user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
CREATE POLICY "Users can delete their own likes"
ON public.likes
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any likes" ON public.likes;
CREATE POLICY "Admins can delete any likes"
ON public.likes
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can insert their own dislikes" ON public.dislikes;
CREATE POLICY "Users can insert their own dislikes"
ON public.dislikes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select dislikes involving them" ON public.dislikes;
CREATE POLICY "Users can select dislikes involving them"
ON public.dislikes
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = disliked_user_id);

DROP POLICY IF EXISTS "Users can delete their own dislikes" ON public.dislikes;
CREATE POLICY "Users can delete their own dislikes"
ON public.dislikes
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any dislikes" ON public.dislikes;
CREATE POLICY "Admins can delete any dislikes"
ON public.dislikes
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete any friendship likes" ON public.friendship_likes;
CREATE POLICY "Admins can delete any friendship likes"
ON public.friendship_likes
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete any friendship dislikes" ON public.friendship_dislikes;
CREATE POLICY "Admins can delete any friendship dislikes"
ON public.friendship_dislikes
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dislikes TO authenticated;
GRANT ALL ON TABLE public.likes TO service_role;
GRANT ALL ON TABLE public.dislikes TO service_role;

NOTIFY pgrst, 'reload schema';
