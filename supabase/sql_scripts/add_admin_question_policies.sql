-- Add admin write policies for friendship_questions table
-- (questionnaire_questions has no RLS so it works already)

-- Allow admins to insert friendship questions
CREATE POLICY "Admins can insert friendship questions"
ON public.friendship_questions
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update friendship questions
CREATE POLICY "Admins can update friendship questions"
ON public.friendship_questions
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Also add admin write policies for questionnaire_questions if RLS is ever enabled
-- (currently RLS is disabled on this table, so these are no-ops but future-proof)

-- Enable RLS on questionnaire_questions (if not already)
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read
CREATE POLICY "Enable read access for all users"
ON public.questionnaire_questions
FOR SELECT USING (true);

-- Allow admins to insert
CREATE POLICY "Admins can insert questionnaire questions"
ON public.questionnaire_questions
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update
CREATE POLICY "Admins can update questionnaire questions"
ON public.questionnaire_questions
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);
