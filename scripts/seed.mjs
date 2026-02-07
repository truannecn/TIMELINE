import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_RESET = process.env.SEED_RESET === 'true';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function resetData() {
  const tables = [
    'post_tags',
    'tags',
    'comments',
    'likes',
    'follows',
    'timeline_entry_media',
    'timeline_entries',
    'timelines',
    'post_media',
    'posts',
    'profiles',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error(`Failed to clear ${table}:`, error.message);
      process.exit(1);
    }
  }
}

async function getProfileByHandle(handle) {
  const { data, error } = await supabase.from('profiles').select('id').eq('handle', handle).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function ensureUser({ email, password, handle, displayName, bio }) {
  const existingProfileId = await getProfileByHandle(handle);
  if (existingProfileId) return existingProfileId;

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw userError;

  const userId = userData.user?.id;
  if (!userId) throw new Error('User creation returned no id');

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    handle,
    display_name: displayName,
    bio,
  });
  if (profileError) throw profileError;

  return userId;
}

async function main() {
  if (SEED_RESET) {
    await resetData();
  }

  const aliceId = await ensureUser({
    email: 'alice@example.com',
    password: 'Password123!',
    handle: 'alice',
    displayName: 'Alice Rivera',
    bio: 'Illustrator exploring myth and modern life.',
  });

  const benId = await ensureUser({
    email: 'ben@example.com',
    password: 'Password123!',
    handle: 'ben',
    displayName: 'Ben Ito',
    bio: 'Concept artist and storyteller.',
  });

  const chloeId = await ensureUser({
    email: 'chloe@example.com',
    password: 'Password123!',
    handle: 'chloe',
    displayName: 'Chloe Park',
    bio: 'Photographer capturing city light and motion.',
  });

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .insert([
      {
        author_id: aliceId,
        title: 'Midnight Garden',
        body: 'A series of studies blending botanical forms with neon light.',
        type: 'art',
        visibility: 'public',
      },
      {
        author_id: benId,
        title: 'Ruin City Sketches',
        body: 'Exploring the texture of abandoned spaces and the stories they hold.',
        type: 'text',
        visibility: 'public',
      },
      {
        author_id: chloeId,
        title: 'Rain Threads',
        body: 'A short photo essay on reflections after the storm.',
        type: 'image',
        visibility: 'unlisted',
      },
    ])
    .select();
  if (postsError) throw postsError;

  const [alicePost, benPost, chloePost] = posts;

  const { error: postMediaError } = await supabase
    .from('post_media')
    .insert([
      {
        post_id: alicePost.id,
        media_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
        media_type: 'image',
        alt_text: 'Neon-lit botanical illustration',
        position: 0,
      },
      {
        post_id: chloePost.id,
        media_url: 'https://images.unsplash.com/photo-1482192505345-5655af888cc4',
        media_type: 'image',
        alt_text: 'City street in rain',
        position: 0,
      },
    ]);
  if (postMediaError) throw postMediaError;

  const { data: timelines, error: timelinesError } = await supabase
    .from('timelines')
    .insert([
      {
        owner_id: aliceId,
        title: 'Midnight Garden Process',
        description: 'Work-in-progress snapshots from the early sketches to final renders.',
        visibility: 'public',
      },
      {
        owner_id: benId,
        title: 'Ruin City Worldbuilding',
        description: 'Drafts and scene notes for the Ruin City project.',
        visibility: 'unlisted',
      },
    ])
    .select();
  if (timelinesError) throw timelinesError;

  const [aliceTimeline, benTimeline] = timelines;

  const { data: entries, error: entriesError } = await supabase
    .from('timeline_entries')
    .insert([
      {
        timeline_id: aliceTimeline.id,
        author_id: aliceId,
        title: 'Thumbnail sketches',
        body: 'Initial silhouettes and composition studies. Trying to keep the forms simple.',
        is_published: false,
      },
      {
        timeline_id: aliceTimeline.id,
        author_id: aliceId,
        title: 'Color exploration',
        body: 'Testing neon greens against deep blues. Might add warmer accents later.',
        is_published: true,
        published_post_id: alicePost.id,
      },
      {
        timeline_id: benTimeline.id,
        author_id: benId,
        title: 'Environment notes',
        body: 'Rough notes on lighting and material decay. Collecting references.',
        is_published: false,
      },
    ])
    .select();
  if (entriesError) throw entriesError;

  const aliceEntry = entries[0];

  const { error: entryMediaError } = await supabase
    .from('timeline_entry_media')
    .insert([
      {
        timeline_entry_id: aliceEntry.id,
        media_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
        media_type: 'image',
        alt_text: 'Sketchbook close-up',
        position: 0,
      },
    ]);
  if (entryMediaError) throw entryMediaError;

  const { error: followsError } = await supabase
    .from('follows')
    .insert([
      { follower_id: benId, following_id: aliceId },
      { follower_id: chloeId, following_id: aliceId },
      { follower_id: aliceId, following_id: chloeId },
    ]);
  if (followsError) throw followsError;

  const { error: likesError } = await supabase
    .from('likes')
    .insert([
      { user_id: benId, post_id: alicePost.id },
      { user_id: chloeId, post_id: alicePost.id },
      { user_id: aliceId, post_id: chloePost.id },
    ]);
  if (likesError) throw likesError;

  const { error: commentsError } = await supabase
    .from('comments')
    .insert([
      {
        post_id: alicePost.id,
        author_id: benId,
        body: 'These colors are so good. The glow feels alive.',
      },
      {
        post_id: chloePost.id,
        author_id: aliceId,
        body: 'Love the motion in these reflections.',
      },
    ]);
  if (commentsError) throw commentsError;

  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .insert([
      { name: 'illustration' },
      { name: 'photography' },
      { name: 'worldbuilding' },
    ])
    .select();
  if (tagsError) throw tagsError;

  const tagByName = new Map(tags.map((t) => [t.name, t.id]));

  const { error: postTagsError } = await supabase
    .from('post_tags')
    .insert([
      { post_id: alicePost.id, tag_id: tagByName.get('illustration') },
      { post_id: chloePost.id, tag_id: tagByName.get('photography') },
      { post_id: benPost.id, tag_id: tagByName.get('worldbuilding') },
    ]);
  if (postTagsError) throw postTagsError;

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
