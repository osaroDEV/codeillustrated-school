import { getCourseIcon } from "@/lib/course-icons";

export function CourseIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = getCourseIcon(icon);
  return <Icon className={className} />;
}
