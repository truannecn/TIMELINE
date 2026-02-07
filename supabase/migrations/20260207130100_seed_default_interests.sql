-- Seed default interest threads (created_by is null = system/default)
insert into public.threads (name, description, created_by) values
  ('Illustration', 'Traditional and digital illustration, character art, and visual storytelling', null),
  ('Photography', 'Analog and digital photography, photo essays, and visual documentation', null),
  ('Digital Art', '3D, concept art, matte painting, and digital media', null),
  ('Traditional Art', 'Painting, drawing, printmaking, and physical media', null),
  ('Animation', '2D, 3D, stop-motion, and motion graphics', null),
  ('Comic & Sequential', 'Comics, manga, graphic novels, and sequential art', null),
  ('Sculpture & 3D', 'Physical sculpture, installation, and dimensional work', null),
  ('Writing', 'Creative writing, essays, poetry, and storytelling', null),
  ('Worldbuilding', 'Fiction worlds, concept development, and lore', null),
  ('Design', 'Graphic design, typography, branding, and visual communication', null),
  ('Crafts', 'Fiber arts, ceramics, woodworking, and handmade objects', null),
  ('Mixed Media', 'Experimental and interdisciplinary work', null)
on conflict (name) do nothing;
