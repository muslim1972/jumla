-- Create top_banners table for paid advertisements
CREATE TABLE IF NOT EXISTS public.top_banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    text TEXT NOT NULL,
    link_url TEXT DEFAULT '/',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for top_banners
ALTER TABLE public.top_banners ENABLE ROW LEVEL SECURITY;

-- Create policies for top_banners (Allow public read, authenticated admin write)
DROP POLICY IF EXISTS "Allow public read access to top_banners" ON public.top_banners;
CREATE POLICY "Allow public read access to top_banners" ON public.top_banners
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write access to top_banners" ON public.top_banners;
CREATE POLICY "Allow admin write access to top_banners" ON public.top_banners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Create ad_requests table for storing ad requests from the modal
CREATE TABLE IF NOT EXISTS public.ad_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    duration TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for ad_requests
ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for ad_requests (Allow public insert, authenticated admin read/write)
DROP POLICY IF EXISTS "Allow public insert to ad_requests" ON public.ad_requests;
CREATE POLICY "Allow public insert to ad_requests" ON public.ad_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin read/write access to ad_requests" ON public.ad_requests;
CREATE POLICY "Allow admin read/write access to ad_requests" ON public.ad_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
