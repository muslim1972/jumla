-- Create banners table
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    bg_gradient TEXT DEFAULT 'from-brand-blue to-blue-600',
    image_url TEXT,
    link_url TEXT DEFAULT '/',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow public read, authenticated admin write)
DROP POLICY IF EXISTS "Allow public read access to banners" ON public.banners;
CREATE POLICY "Allow public read access to banners" ON public.banners
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write access to banners" ON public.banners;
CREATE POLICY "Allow admin write access to banners" ON public.banners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
