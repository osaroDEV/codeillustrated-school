"use client";

import { ResourceCard } from "@/components/resource-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCKUP_RESOURCES, useResourcesStore } from "@/store/resources-store";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Gamepad2,
  Globe,
  GraduationCap,
  HelpCircle,
  Laptop,
  Lightbulb,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Monitor,
  Palette,
  Phone,
  Rocket,
  ScrollText,
  Shield,
  Star,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ────────────────────────────────────────────────
   Section IDs & Navigation
   ──────────────────────────────────────────────── */
const SECTIONS = [
  { id: "start-here", label: "Start Here", icon: Rocket },
  // { id: "learning-materials", label: "Learning Materials", icon: BookOpen },
  { id: "tools-software", label: "Tools & Software", icon: Wrench },
  { id: "external-resources", label: "External Resources", icon: LinkIcon },
  { id: "downloads", label: "Downloads", icon: Download },
  // { id: "project-showcase", label: "Project Showcase", icon: Trophy },
  { id: "guidelines", label: "Guidelines", icon: Shield },
  { id: "faqs", label: "FAQs", icon: HelpCircle },
  { id: "parent-resources", label: "For Parents", icon: Users },
  { id: "support", label: "Support", icon: MessageCircle },
] as const;

/* ────────────────────────────────────────────────
   Reusable Section Wrapper
   ──────────────────────────────────────────────── */
function Section({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 ${className}`}
      aria-labelledby={`${id}-heading`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  id,
  icon: Icon,
  title,
  subtitle,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-10"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500/10 to-secondary-400/10 text-primary-500">
          <Icon className="w-6 h-6" />
        </div>
        <h2
          id={`${id}-heading`}
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900"
        >
          {title}
        </h2>
      </div>
      <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
        {subtitle}
      </p>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────
   Card Component (reusable across sections)
   ──────────────────────────────────────────────── */
function InfoCard({
  icon: Icon,
  title,
  description,
  badge,
  href,
  cta,
  color = "primary",
  delay = 0,
  target,
  rel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  href?: string;
  cta?: string;
  color?: "primary" | "secondary" | "accent";
  delay?: number;
  target?: string;
  rel?: string;
}) {
  const colorMap = {
    primary: {
      bg: "bg-primary-500/10",
      text: "text-primary-500",
      border: "hover:border-primary-200",
    },
    secondary: {
      bg: "bg-secondary-500/10",
      text: "text-secondary-600",
      border: "hover:border-secondary-200",
    },
    accent: {
      bg: "bg-accent-500/10",
      text: "text-accent-500",
      border: "hover:border-accent-200",
    },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      viewport={{ once: true }}
      className={`group bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 hover:shadow-xl hover:shadow-slate-200/50 ${c.border} transition-all duration-300 flex flex-col h-full`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`${c.bg} ${c.text} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {badge && (
              <Badge
                variant="secondary"
                className="text-xs font-semibold bg-secondary-100 text-secondary-700"
              >
                {badge}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed flex-1 mb-4">
        {description}
      </p>
      {href && cta && (
        <Link
          href={href}
          target={target || (href.startsWith("http") ? "_blank" : undefined)}
          rel={rel || (href.startsWith("http") ? "noopener noreferrer" : undefined)}
          className={`inline-flex items-center gap-2 text-sm font-bold ${c.text} group/link`}
        >
          {cta}
          {href.startsWith("http") ? (
            <ExternalLink className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
          ) : (
            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          )}
        </Link>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────
   FAQ Accordion Item
   ──────────────────────────────────────────────── */
function FAQItem({
  question,
  answer,
  delay = 0,
}: {
  question: string;
  answer: string;
  delay?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      viewport={{ once: true }}
      className="border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-slate-900 text-sm sm:text-base pr-4">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 pb-5 text-sm sm:text-base text-muted-foreground leading-relaxed border-t border-slate-50 pt-4">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────
   Sidebar Navigation
   ──────────────────────────────────────────────── */
function SidebarNav({ activeSection }: { activeSection: string }) {
  return (
    <nav
      className="hidden lg:block sticky top-24 self-start"
      aria-label="Resource sections"
    >
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
          Quick Navigation
        </p>
        <ul className="space-y-1">
          {SECTIONS.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-primary-500/10 to-secondary-400/10 text-primary-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <s.icon className="w-4 h-4 shrink-0" />
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/* ────────────────────────────────────────────────
   Main Page Client Component
   ──────────────────────────────────────────────── */
export default function ResourcesPageClient() {
  const { resources } = useResourcesStore();
  const [activeSection, setActiveSection] = useState("start-here");

  // Intersection Observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ── Hero ─────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-accent-950 to-slate-900 py-20 lg:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm text-white/80 font-medium mb-6 backdrop-blur-sm border border-white/10">
              <BookOpen className="w-4 h-4" />
              Everything you need to succeed
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-white font-bold mb-6 leading-tight">
              Student{" "}
              <span className="bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
                Resource Hub
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              Guides, downloads, tools, and everything you need to make the most
              of your learning journey at Code Illustrated.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {SECTIONS.slice(0, 5).map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-white/80 hover:text-white text-sm font-medium transition-all"
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Content Layout ───────────────────────── */}
      <div className="bg-slate-50 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex gap-12">
            {/* Sidebar */}
            <SidebarNav activeSection={activeSection} />

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-20 lg:space-y-24">
              {/* ─── 1. START HERE ────────────────── */}
              <Section id="start-here">
                <SectionHeader
                  id="start-here"
                  icon={Rocket}
                  title="Start Here"
                  subtitle="New to Code Illustrated? This is your launchpad. Follow these steps to get set up and ready for your first class."
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InfoCard
                    icon={Laptop}
                    title="Setup Guide"
                    description="Install VS Code, set up your browser, and get your computer ready for coding. We'll walk you through every step—takes about 15 minutes."
                    cta="View Setup Guide"
                    href="/resources#tools-software"
                    color="primary"
                    delay={0}
                  />
                  <InfoCard
                    icon={GraduationCap}
                    title="Your First Lesson"
                    description="Jump into your first mini-project: build a personal web page in HTML. No prior experience needed—just curiosity and a computer."
                    cta="Start Learning"
                    href="/courses/junior-web-creator"
                    color="secondary"
                    delay={0.1}
                  />
                  <InfoCard
                    icon={Lightbulb}
                    title="What to Expect"
                    description="Live 1-on-1 sessions, weekly projects, homework reviews, and a supportive mentor who guides you every step of the way."
                    cta="See How It Works"
                    href="/#how-it-works"
                    color="accent"
                    delay={0.2}
                  />
                </div>

                {/* Onboarding checklist */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mt-8 bg-white border border-slate-100 rounded-2xl p-6 sm:p-8"
                >
                  <h3 className="font-bold text-lg mb-4 text-slate-900">
                    🚀 New Student Checklist
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      "Download & install VS Code",
                      "Test your webcam and microphone",
                      "Open Google Chrome or Firefox",
                      "Create a folder called 'my-projects'",
                      "Bookmark the Resources page",
                      "Read the Student Guidelines",
                    ].map((item, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-primary-50/50 cursor-pointer transition-colors text-sm sm:text-base group"
                      >
                        <CheckCircle2 className="w-5 h-5 text-slate-300 group-hover:text-primary-400 transition-colors shrink-0" />
                        <span className="text-slate-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              </Section>

              {/* ─── 2. LEARNING MATERIALS ────────── */}
              {/* <Section id="learning-materials">
                <SectionHeader
                  id="learning-materials"
                  icon={BookOpen}
                  title="Learning Materials"
                  subtitle="Lesson notes, practice exercises, coding examples, and project files—organized by course."
                /> */}

                {/* Downloadable Resources from store */}
                {/* <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                  {resources.map((resource, index) => (
                    <motion.div
                      key={resource.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      viewport={{ once: true }}
                    >
                      <ResourceCard resource={resource} />
                    </motion.div>
                  ))}
                </div> */}

                {/* Practice & Challenges */}
                {/* <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-secondary-50 to-white border border-secondary-100 rounded-2xl p-6 sm:p-8"
                >
                  <h3 className="font-bold text-lg mb-2 text-slate-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-secondary-500" />
                    Practice Challenges
                  </h3>
                  <p className="text-muted-foreground text-sm mb-5">
                    Sharpen your skills between classes with these exercises.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      {
                        title: "HTML Recipe Page",
                        level: "Beginner",
                        desc: "Build a recipe layout using headings, lists, and images.",
                      },
                      {
                        title: "CSS Creature",
                        level: "Beginner",
                        desc: "Use CSS shapes and colors to draw a fun creature.",
                      },
                      {
                        title: "JS Color Picker",
                        level: "Intermediate",
                        desc: "Create a random background color changer with buttons.",
                      },
                      {
                        title: "Portfolio Page",
                        level: "Intermediate",
                        desc: "Design a personal portfolio with HTML, CSS, and JavaScript.",
                      },
                    ].map((ch, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 text-sm">
                            {ch.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-xs border-secondary-200 text-secondary-600"
                          >
                            {ch.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ch.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </Section> */}

              {/* ─── 3. TOOLS & SOFTWARE ──────────── */}
              <Section id="tools-software">
                <SectionHeader
                  id="tools-software"
                  icon={Wrench}
                  title="Tools & Software"
                  subtitle="Everything you need installed on your computer before your first class."
                />
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    {
                      icon: Code2,
                      title: "Visual Studio Code",
                      description:
                        "The code editor we use in all classes. Free, powerful, and beginner-friendly. Install the 'Live Server' extension for instant previews.",
                      badge: "Required",
                      href: "https://code.visualstudio.com",
                      cta: "Download VS Code",
                      color: "primary" as const,
                    },
                    {
                      icon: Globe,
                      title: "Google Chrome",
                      description:
                        "Our recommended browser for testing websites. The built-in DevTools are perfect for inspecting HTML, CSS, and debugging JavaScript.",
                      badge: "Required",
                      href: "https://www.google.com/chrome",
                      cta: "Download Chrome",
                      color: "accent" as const,
                    },
                    {
                      icon: Monitor,
                      title: "Figma",
                      description:
                        "A free design tool for planning your websites before you code. Great for creating mockups and understanding layouts visually.",
                      badge: "Optional",
                      href: "https://www.figma.com",
                      cta: "Open Figma",
                      color: "secondary" as const,
                    },
                    {
                      icon: FolderOpen,
                      title: "GitHub Desktop",
                      description:
                        "Save and share your code projects securely. We'll teach you version control basics so you never lose your work again.",
                      badge: "Later Courses",
                      href: "https://desktop.github.com",
                      cta: "Download GitHub Desktop",
                      color: "primary" as const,
                    },
                  ].map((tool, i) => (
                    <InfoCard key={i} {...tool} delay={i * 0.1} />
                  ))}
                </div>
              </Section>

              {/* ─── 4. EXTERNAL RESOURCES ────────── */}
              <Section id="external-resources">
                <SectionHeader
                  id="external-resources"
                  icon={LinkIcon}
                  title="External Learning Resources"
                  subtitle="Handpicked platforms and references to supplement your learning."
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      icon: Globe,
                      title: "MDN Web Docs",
                      description:
                        "The definitive reference for HTML, CSS, and JavaScript. Bookmark this — you'll use it constantly.",
                      badge: "Best Reference",
                      href: "https://developer.mozilla.org",
                      cta: "Visit MDN",
                      color: "accent" as const,
                    },
                    // {
                    //   icon: Code2,
                    //   title: "freeCodeCamp",
                    //   description:
                    //     "Free interactive coding lessons. Great for extra practice on HTML, CSS, and JavaScript fundamentals.",
                    //   badge: "Best for Beginners",
                    //   href: "https://www.freecodecamp.org",
                    //   cta: "Start Practicing",
                    //   color: "primary" as const,
                    // },
                    // {
                    //   icon: Gamepad2,
                    //   title: "CSS Battle",
                    //   description:
                    //     "Fun CSS challenges that test your styling skills. Compete and learn new CSS techniques at the same time.",
                    //   badge: "Fun & Games",
                    //   href: "https://cssbattle.dev",
                    //   cta: "Play Now",
                    //   color: "secondary" as const,
                    // },
                    {
                      icon: Palette,
                      title: "Coolors",
                      description:
                        "Generate beautiful color palettes for your web projects. Tap the spacebar to explore new combinations instantly.",
                      badge: "Design Tool",
                      href: "https://coolors.co",
                      cta: "Explore Colors",
                      color: "secondary" as const,
                    },
                    {
                      icon: Code2,
                      title: "CodePen",
                      description:
                        "An online playground for testing HTML, CSS, and JavaScript. See your code run live in the browser.",
                      badge: "Practice",
                      href: "https://codepen.io",
                      cta: "Open CodePen",
                      color: "accent" as const,
                    },
                    // {
                    //   icon: BookOpen,
                    //   title: "W3Schools",
                    //   description:
                    //     "Simple, beginner-friendly tutorials with interactive 'Try It Yourself' editors for every concept.",
                    //   badge: "Tutorials",
                    //   href: "https://www.w3schools.com",
                    //   cta: "Browse Tutorials",
                    //   color: "primary" as const,
                    // },
                  ].map((res, i) => (
                    <InfoCard key={i} {...res} delay={i * 0.05} />
                  ))}
                </div>
              </Section>

              {/* ─── 5. DOWNLOADABLE ASSETS ───────── */}
              <Section id="downloads">
                <SectionHeader
                  id="downloads"
                  icon={Download}
                  title="Downloadable Assets"
                  subtitle="Cheat sheets, curriculum PDFs, and roadmaps you can print or save."
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {[
                    {
                      icon: FileText,
                      title: "HTML Cheat Sheet",
                      description:
                        "All essential HTML tags on a single page. Perfect for quick reference while building websites.",
                      cta: "Download PDF",
                      href: "/files/html-cheat-sheet.pdf",
                      color: "primary" as const,
                    },
                    {
                      icon: Palette,
                      title: "CSS Properties Guide",
                      description:
                        "The most-used CSS properties with visual examples. Covers layout, colors, fonts, and responsive design.",
                      cta: "Download PDF",
                      href: "/files/html-cheat-sheet.pdf",
                      color: "secondary" as const,
                    },
                    {
                      icon: Code2,
                      title: "JavaScript Basics",
                      description:
                        "Variables, functions, loops, and DOM methods explained simply with code snippets you can copy and paste.",
                      cta: "Download PDF",
                      href: "/files/html-cheat-sheet.pdf",
                      color: "accent" as const,
                    },
                    {
                      icon: ScrollText,
                      title: "Full Curriculum Overview",
                      description:
                        "The complete Code Illustrated curriculum across all courses. See every module and learning outcome.",
                      cta: "Download PDF",
                      href: "/files/html-cheat-sheet.pdf",
                      color: "primary" as const,
                    },
                    {
                      icon: Rocket,
                      title: "Learning Roadmap",
                      description:
                        "A visual roadmap from beginner to job-ready developer. Know exactly where you are and what's ahead.",
                      cta: "Download PDF",
                      href: "/files/html-cheat-sheet.pdf",
                      color: "secondary" as const,
                    },
                  ].map((asset, i) => (
                    <InfoCard
                      key={i}
                      icon={asset.icon}
                      title={asset.title}
                      description={asset.description}
                      cta={asset.cta}
                      href={asset.href}
                      color={asset.color}
                      target="_blank"
                      rel="noopener noreferrer"
                      delay={i * 0.05}
                    />
                  ))}
                </div>

                {/* HTML Mockups (from existing store data) */}
                {MOCKUP_RESOURCES.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-primary-500" />
                      HTML Mockups
                    </h3>
                    <p className="text-muted-foreground text-sm mb-6">
                      Reference designs and high-fidelity mockups for class
                      projects.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {MOCKUP_RESOURCES.map((resource, index) => (
                        <motion.div
                          key={resource.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          viewport={{ once: true }}
                        >
                          <ResourceCard resource={resource} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </Section>

              {/* ─── 6. PROJECT SHOWCASE ──────────── */}
              {/* <Section id="project-showcase">
                <SectionHeader
                  id="project-showcase"
                  icon={Trophy}
                  title="Project Showcase"
                  subtitle="See what Code Illustrated students have built. Your project could be featured here next!"
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      title: "Space Explorer",
                      student: "Marcus, Age 12",
                      course: "Junior Web Creator",
                      description:
                        "An interactive solar system guide built with HTML and CSS. Features animated planet cards and a custom color theme.",
                      tags: ["HTML", "CSS"],
                      color: "accent" as const,
                    },
                    {
                      title: "Recipe Collection",
                      student: "Aisha, Age 11",
                      course: "Junior Web Creator",
                      description:
                        "A multi-page recipe website with beautiful food styling, ingredient lists, and step-by-step instructions.",
                      tags: ["HTML", "CSS", "Images"],
                      color: "secondary" as const,
                    },
                    {
                      title: "Quiz Game",
                      student: "Leo, Age 14",
                      course: "Junior Web Creator",
                      description:
                        "A trivia quiz game built with JavaScript. Includes a score tracker, timer, and multiple difficulty levels.",
                      tags: ["HTML", "CSS", "JavaScript"],
                      color: "primary" as const,
                    },
                    {
                      title: "Weather Dashboard",
                      student: "Priya, Age 16",
                      course: "Frontend Beginner",
                      description:
                        "A weather app using a real API. Shows 5-day forecasts, animated icons, and location-based results.",
                      tags: ["React", "API", "CSS"],
                      color: "primary" as const,
                    },
                    {
                      title: "Pixel Art Creator",
                      student: "Jake, Age 13",
                      course: "Game Dev Pro",
                      description:
                        "A browser-based pixel art tool with color palette, grid controls, and the ability to export your art.",
                      tags: ["JavaScript", "Canvas", "CSS"],
                      color: "accent" as const,
                    },
                    {
                      title: "Portfolio Website",
                      student: "Sofia, Age 22",
                      course: "Frontend Beginner",
                      description:
                        "A professional portfolio with smooth scroll animations, project galleries, and a contact form.",
                      tags: ["Next.js", "React", "Tailwind"],
                      color: "secondary" as const,
                    },
                  ].map((project, i) => {
                    const colorMap = {
                      primary: {
                        tagBg: "bg-primary-50 text-primary-600",
                        dot: "bg-primary-400",
                      },
                      secondary: {
                        tagBg: "bg-secondary-50 text-secondary-700",
                        dot: "bg-secondary-400",
                      },
                      accent: {
                        tagBg: "bg-accent-50 text-accent-600",
                        dot: "bg-accent-400",
                      },
                    };
                    const c = colorMap[project.color];

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        viewport={{ once: true }}
                        className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col"
                      > */}
                        {/* Project preview placeholder */}
                        {/* <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:16px_16px]" />
                          <div className="relative text-center">
                            <Code2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">
                              Student Project
                            </p>
                          </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`w-2 h-2 rounded-full ${c.dot}`}
                            />
                            <span className="text-xs text-muted-foreground font-medium">
                              {project.course}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {project.title}
                          </h3>
                          <p className="text-xs text-primary-500 font-semibold mb-3">
                            by {project.student}
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                            {project.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {project.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${c.tagBg}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Section> */}

              {/* ─── 7. STUDENT GUIDELINES ────────── */}
              <Section id="guidelines">
                <SectionHeader
                  id="guidelines"
                  icon={Shield}
                  title="Student Guidelines & Policies"
                  subtitle="Clear expectations so every student has a great learning experience."
                />
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    {
                      icon: CheckCircle2,
                      title: "Class Expectations",
                      description:
                        "Come prepared with your tools installed and ready. Have your camera on when possible. Ask questions freely — there are no silly questions. Complete assignments before the next session.",
                      color: "primary" as const,
                    },
                    {
                      icon: Clock,
                      title: "Attendance Policy",
                      description:
                        "We ask for 24 hours' notice for rescheduling. Two no-shows in a row will trigger a check-in from your mentor. Consistent attendance is key to steady progress.",
                      color: "secondary" as const,
                    },
                    {
                      icon: FileText,
                      title: "Homework Policy",
                      description:
                        "Short homework is assigned after each session. It's designed to reinforce concepts, not overwhelm you. Expect 30–45 minutes of practice between classes.",
                      color: "accent" as const,
                    },
                    {
                      icon: Shield,
                      title: "Code of Conduct",
                      description:
                        "Be respectful and kind. No plagiarism — it's okay to struggle and ask for help. Support your fellow students. We're all here to learn and grow together.",
                      color: "primary" as const,
                    },
                  ].map((policy, i) => (
                    <InfoCard key={i} {...policy} delay={i * 0.1} />
                  ))}
                </div>
              </Section>

              {/* ─── 8. FAQs ─────────────────────── */}
              <Section id="faqs">
                <SectionHeader
                  id="faqs"
                  icon={HelpCircle}
                  title="Frequently Asked Questions"
                  subtitle="Quick answers to the most common questions from students and parents."
                />
                <div className="space-y-3 max-w-3xl">
                  {[
                    {
                      q: "Do I need any previous coding experience?",
                      a: "Not at all! Our courses start from absolute zero. We'll teach you everything step-by-step, from how to set up your tools to writing your first line of code.",
                    },
                    {
                      q: "What equipment do I need?",
                      a: "A computer (Windows, Mac, or Chromebook), a stable internet connection, a webcam, and a microphone. That's it! All software we use is free to download.",
                    },
                    {
                      q: "How long is each class session?",
                      a: "Each 1-on-1 session is 60 minutes. Group sessions are 90 minutes. Sessions are scheduled at times that work for you and your mentor.",
                    },
                    {
                      q: "Can I reschedule a class?",
                      a: "Yes! We ask for at least 24 hours' notice. You can reschedule directly with your mentor via our messaging channel. Life happens — we're flexible.",
                    },
                    {
                      q: "What age group is the Junior Web Creator course for?",
                      a: "It's designed for students aged 8–12, but any young beginner can benefit. The pace and content are adapted to each student's level during 1-on-1 sessions.",
                    },
                    {
                      q: "How do parents track their child's progress?",
                      a: "Parents receive a monthly progress report from the mentor, including skills learned, projects completed, and areas to focus on. You can also request updates anytime.",
                    },
                    {
                      q: "Is there a free trial?",
                      a: "Yes! Your first class is completely free with no obligation. It's a great way to meet your mentor and see if the learning style works for you.",
                    },
                    {
                      q: "What happens after I complete a course?",
                      a: "You'll receive a certificate of completion and a portfolio of projects. Many students continue to the next course level — your mentor will recommend the best path forward.",
                    },
                  ].map((faq, i) => (
                    <FAQItem
                      key={i}
                      question={faq.q}
                      answer={faq.a}
                      delay={i * 0.03}
                    />
                  ))}
                </div>
              </Section>

              {/* ─── 9. PARENT RESOURCES ──────────── */}
              <Section id="parent-resources">
                <SectionHeader
                  id="parent-resources"
                  icon={Users}
                  title="Parent Resources"
                  subtitle="How parents can support their child's coding journey and stay informed."
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InfoCard
                    icon={Lightbulb}
                    title="How to Support Your Child"
                    description="Show interest in their projects. Ask them to teach you what they learned — it's the best way to reinforce new concepts. Keep screen time productive."
                    color="secondary"
                    delay={0}
                  />
                  <InfoCard
                    icon={FileText}
                    title="Progress Reports"
                    description="Monthly reports from the mentor cover skills mastered, project portfolio growth, attendance, and personalized recommendations for next steps."
                    color="primary"
                    delay={0.1}
                  />
                  <InfoCard
                    icon={MessageCircle}
                    title="Communication Channels"
                    description="Reach your child's mentor via WhatsApp or email. Get replies within 24 hours on business days. Schedule parent-mentor calls anytime."
                    cta="Contact Support"
                    href="/contact-us"
                    color="accent"
                    delay={0.2}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mt-8 bg-gradient-to-br from-accent-50 to-white border border-accent-100 rounded-2xl p-6 sm:p-8"
                >
                  <h3 className="font-bold text-lg mb-3 text-slate-900">
                    💡 Tips for Parents
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Celebrate small wins — every line of code is progress.",
                      "Let them struggle a bit before helping; debugging builds resilience.",
                      "Visit the project showcase together to see what's possible.",
                      "Encourage them to explain their projects to siblings or friends.",
                      "Set a consistent study schedule so coding becomes a habit.",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </Section>

              {/* ─── 10. SUPPORT / HELP ───────────── */}
              <Section id="support">
                <SectionHeader
                  id="support"
                  icon={MessageCircle}
                  title="Need Help?"
                  subtitle="We're here for you. Reach out anytime — no question is too small."
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <InfoCard
                    icon={Mail}
                    title="Email Support"
                    description="Send us a message at admin@codeillustrated.com. We typically respond within 24 hours on business days."
                    cta="Send Email"
                    href="mailto:admin@codeillustrated.com"
                    color="primary"
                    delay={0}
                  />
                  <InfoCard
                    icon={Phone}
                    title="WhatsApp"
                    description="Message us on WhatsApp for quick questions or scheduling help. Available Monday through Friday."
                    cta="Chat on WhatsApp"
                    href="https://wa.me/447405786279"
                    color="accent"
                    delay={0.1}
                  />
                  <InfoCard
                    icon={Clock}
                    title="Office Hours"
                    description="Monday – Friday, 9:00 AM – 6:00 PM (GMT). Mentors are also available during your scheduled class times."
                    color="secondary"
                    delay={0.2}
                  />
                </div>

                {/* CTA Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-primary-600 via-primary-800 to-accent-900 rounded-2xl p-8 sm:p-12 text-center text-white relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                      Have a Question?
                    </h3>
                    <p className="text-white/80 mb-8 max-w-lg mx-auto">
                      Whether you're a student stuck on a problem or a parent
                      with enrollment questions, we'd love to hear from you.
                    </p>
                    <Button
                      asChild
                      size="lg"
                      className="bg-secondary-500 text-secondary-950 hover:bg-secondary-400 font-bold px-8 shadow-xl"
                    >
                      <Link
                        href="/contact-us"
                        className="inline-flex items-center gap-2"
                      >
                        Ask a Question
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
