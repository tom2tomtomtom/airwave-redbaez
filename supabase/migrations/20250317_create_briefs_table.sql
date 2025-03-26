-- Create briefs table with proper RLS policies
create table public.briefs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    title text not null,
    content text not null,
    campaign_objectives text not null,
    target_audience text not null,
    key_messages text not null,
    visual_preferences text,
    tags text[] default '{}',
    organisation_id uuid not null references auth.users(id),
    status text not null default 'draft' check (status in ('draft', 'analysing', 'ready', 'archived')),
    analysis_results jsonb,
    created_by uuid not null references auth.users(id),
    updated_by uuid not null references auth.users(id)
);

-- Enable Row Level Security
alter table public.briefs enable row level security;

-- Create policies
create policy "Users can view briefs in their organisation"
    on public.briefs for select
    using (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = briefs.organisation_id
    ));

create policy "Users can create briefs in their organisation"
    on public.briefs for insert
    with check (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = briefs.organisation_id
    ));

create policy "Users can update briefs in their organisation"
    on public.briefs for update
    using (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = briefs.organisation_id
    ));

create policy "Users can delete briefs in their organisation"
    on public.briefs for delete
    using (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = briefs.organisation_id
    ));

-- Create function to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Create trigger for updated_at
create trigger handle_briefs_updated_at
    before update on public.briefs
    for each row
    execute function public.handle_updated_at();
