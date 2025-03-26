-- Create organisations table
create table public.organisations (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    name text not null,
    settings jsonb default '{}'::jsonb
);

-- Create users table with organisation relationship
create table public.users (
    id uuid references auth.users(id) primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    email text not null unique,
    organisation_id uuid references public.organisations(id) not null,
    role text not null check (role in ('admin', 'user')),
    settings jsonb default '{}'::jsonb
);

-- Create organisation_members table for many-to-many relationship
create table public.organisation_members (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    organisation_id uuid references public.organisations(id) not null,
    user_id uuid references public.users(id) not null,
    role text not null check (role in ('admin', 'user')),
    unique(organisation_id, user_id)
);

-- Enable Row Level Security
alter table public.organisations enable row level security;
alter table public.users enable row level security;
alter table public.organisation_members enable row level security;

-- Organisation policies
create policy "Users can view their organisation"
    on public.organisations for select
    using (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = organisations.id
    ));

create policy "Admins can update their organisation"
    on public.organisations for update
    using (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = organisations.id
        and role = 'admin'
    ));

-- User policies
create policy "Users can view members in their organisation"
    on public.users for select
    using (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = users.organisation_id
    ));

create policy "Users can update their own profile"
    on public.users for update
    using (auth.uid() = id);

-- Organisation members policies
create policy "Users can view members in their organisation"
    on public.organisation_members for select
    using (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = organisation_members.organisation_id
    ));

create policy "Admins can manage organisation members"
    on public.organisation_members for all
    using (auth.uid() in (
        select user_id from organisation_members
        where organisation_id = organisation_members.organisation_id
        and role = 'admin'
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

-- Create triggers for updated_at
create trigger handle_organisations_updated_at
    before update on public.organisations
    for each row
    execute function public.handle_updated_at();

create trigger handle_users_updated_at
    before update on public.users
    for each row
    execute function public.handle_updated_at();

create trigger handle_organisation_members_updated_at
    before update on public.organisation_members
    for each row
    execute function public.handle_updated_at();
