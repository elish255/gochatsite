CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 full_name text NOT NULL DEFAULT '',
 username text,
 phone text NOT NULL DEFAULT '',
 country text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles(lower(username)) WHERE username IS NOT NULL;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE FUNCTION public.create_signup_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id, full_name, username, phone, country) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NULLIF(lower(trim(NEW.raw_user_meta_data->>'username')),''), COALESCE(NEW.raw_user_meta_data->>'phone',''), COALESCE(NEW.raw_user_meta_data->>'country',''));
 RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_signup_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER create_signup_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_signup_profile();