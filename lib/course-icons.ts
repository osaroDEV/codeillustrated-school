import {
  BookOpen,
  Database,
  Gamepad2,
  Globe,
  Layout,
  LucideIcon,
  Sparkles,
} from "lucide-react";

// Courses store an icon key (courses.icon in the database) because React
// components can't be serialized into Postgres or across the server/client
// boundary. Add new keys here before using them in the admin course editor.
export const COURSE_ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  database: Database,
  gamepad: Gamepad2,
  globe: Globe,
  layout: Layout,
  sparkles: Sparkles,
};

export function getCourseIcon(key: string | null | undefined): LucideIcon {
  return (key && COURSE_ICONS[key]) || BookOpen;
}
