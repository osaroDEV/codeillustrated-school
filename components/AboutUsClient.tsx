"use client";

import ayinke from "@/public/team/ayinke.jpeg";
import nosa from "@/public/team/skywalker.png";
import osarodev from "@/public/team/osarodev.png";
import sylvia from "@/public/team/sylvia..jpeg";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Code,
  Heart,
  ImageIcon,
  Linkedin,
  MapPin,
  Sparkles,
  Target,
  Twitter,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

/* ─── Animation helpers ─────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: "easeOut" },
  }),
};

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const stats = [
  { number: "300+", label: "Students Taught", icon: "👩‍💻" },
  { number: "250+", label: "Course Hours", icon: "⏱️" },
  { number: "10+", label: "Expert Instructors", icon: "🎓" },
  { number: "4.6/5", label: "Student Rating", icon: "⭐" },
];

const courses = [
  { name: "ReactJS", icon: "⚛️" },
  { name: "Figma", icon: "🎨" },
  { name: "UI/UX Design", icon: "✨" },
  { name: "JavaScript", icon: "💛" },
  { name: "TypeScript", icon: "🔷" },
  { name: "Node.js", icon: "🟢" },
  { name: "Python", icon: "🐍" },
  { name: "Web Design", icon: "🌐" },
];

const values = [
  {
    icon: <Target className="w-7 h-7" />,
    title: "Mission-Driven",
    description:
      "Empowering the next generation of developers with cutting-edge skills and real-world experience.",
    gradient: "from-primary-600 to-primary-800",
    glow: "shadow-primary-500/20",
  },
  {
    icon: <Heart className="w-7 h-7" />,
    title: "Student-Centered",
    description:
      "Every decision we make prioritizes our students' success and the quality of their learning experience.",
    gradient: "from-secondary-500 to-secondary-700",
    glow: "shadow-secondary-500/20",
  },
  {
    icon: <Zap className="w-7 h-7" />,
    title: "Innovation First",
    description:
      "We stay ahead of industry trends to ensure our curriculum remains relevant and impactful.",
    gradient: "from-accent-500 to-accent-700",
    glow: "shadow-accent-500/20",
  },
];

const team = [
  {
    name: "Osaro Onaiwu",
    role: "Founder & CEO",
    experience: "5+ years Software Engineer",
    imageSrc: osarodev,
    social: { twitter: "#", linkedin: "#" },
  },
  {
    name: "Sylvia Agbor",
    role: "Head of Communications",
    experience: "6+ years Writer & SM Manager",
    imageSrc: sylvia,
    social: { twitter: "#", linkedin: "#" },
  },
  {
    name: "Nosa Skywalker",
    role: "UI/UX Director",
    experience: "4+ years Mobile App Developer",
    imageSrc: nosa,
    social: { twitter: "#", linkedin: "#" },
  },
  {
    name: "Itunu Adeoye",
    role: "Community Manager",
    experience: "4+ years Community Manager",
    imageSrc: ayinke,
    social: { twitter: "#", linkedin: "#" },
  },
];

/* ─── Team Member Card ───────────────────────────────────────────────────── */
function TeamCard({
  member,
  index,
}: {
  member: (typeof team)[0];
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index * 0.15}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/5 hover:border-primary-500/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-500/10 isolation-isolate transform-gpu">
        {/* Image / placeholder */}
        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden transform-gpu">
          {member.imageSrc ? (
            <Image
              src={member.imageSrc}
              alt={`Photo of ${member.name}`}
              fill
              className="object-cover object-top transition-transform duration-500 group-hover:scale-105 will-change-transform transform-gpu"
            />
          ) : (
            /* ── IMAGE PLACEHOLDER — replace imageSrc in the team array above ── */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-600">
              <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-zinc-600" />
              </div>
            </div>
          )}
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/10 to-transparent pointer-events-none" />
        </div>

        {/* Info */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-1">{member.name}</h3>
          <p className="text-primary-400 font-semibold text-sm mb-1">
            {member.role}
          </p>
          <p className="text-zinc-500 text-xs mb-4">{member.experience}</p>

          {/* Social links */}
          <div className="flex gap-3">
            <a
              href={member.social.twitter}
              aria-label={`${member.name} on Twitter`}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-primary-600 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            >
              <Twitter className="w-3.5 h-3.5" />
            </a>
            <a
              href={member.social.linkedin}
              aria-label={`${member.name} on LinkedIn`}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-accent-600 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function AboutUsClient() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-accent-950 to-slate-900 pt-28 pb-24">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 mb-8"
          >
            <Sparkles className="w-4 h-4 text-secondary-400" />
            <span className="text-sm font-semibold text-white/80 uppercase tracking-widest">
              Transforming Careers Since 2023
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.08] mb-6"
          >
            We Build{" "}
            <span className="bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
              Engineers,
            </span>
            <br />
            Not Just Coders.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            We&apos;re on a mission to democratize tech education — bridging the
            gap between learning and landing your dream job in the digital
            world, one student at a time.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-600 hover:to-secondary-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-primary-500/20 hover:shadow-primary-500/40 active:scale-95"
            >
              Explore Courses <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://wa.me/447405786279"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all backdrop-blur-sm"
            >
              Talk to an Advisor
            </a>

          </motion.div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section aria-label="School statistics" className="py-16 bg-zinc-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                custom={i}
                className="bg-zinc-900 border border-white/5 hover:border-primary-500/30 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10"
              >
                <div className="text-3xl mb-3">{stat.icon}</div>
                <div className="text-3xl sm:text-4xl font-black text-white mb-1">
                  {stat.number}
                </div>
                <div className="text-zinc-400 text-sm font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── OUR STORY ─────────────────────────────────────────────────────── */}
      <section aria-label="Our story" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <p className="text-primary-400 font-bold tracking-widest uppercase text-sm mb-4">
                  Our Story
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-8">
                  Born from a{" "}
                  <span className="bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
                    Simple Belief
                  </span>
                </h2>
                <div className="space-y-5 text-zinc-300 text-base sm:text-lg leading-relaxed">
                  <p>
                    Founded in 2023 by industry veterans who witnessed firsthand
                    the growing disconnect between traditional education and the
                    rapidly evolving tech industry.
                  </p>
                  <p>
                    We started with a simple belief: everyone deserves access to
                    world-class tech education, regardless of their background
                    or location. What began as a small cohort of 20 students has
                    grown into a thriving community of over 300 graduates
                    worldwide.
                  </p>
                  <p>
                    Today, our alumni work at top companies and countless
                    innovative startups, proving that with the right guidance
                    and dedication, anyone can build a successful career in
                    tech.
                  </p>
                </div>

                {/* Location pill */}
                <div className="mt-8 inline-flex items-center gap-2 text-zinc-400 text-sm">
                  <MapPin className="w-4 h-4 text-primary-400" />
                  <span>Based in the United Kingdom · Serving Worldwide</span>
                </div>
              </motion.div>
            </AnimatedSection>

            {/* Visual card */}
            <AnimatedSection>
              <motion.div variants={fadeUp} custom={1}>
                <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/5 rounded-3xl p-8 overflow-hidden">
                  {/* Glow behind card */}
                  <div className="absolute -top-10 -right-10 w-60 h-60 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-5">
                      What We Teach
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {courses.map((course) => (
                        <div
                          key={course.name}
                          className="flex items-center gap-3 bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 transition-colors"
                        >
                          <span className="text-xl">{course.icon}</span>
                          <span className="text-white font-medium text-sm">
                            {course.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 text-center text-zinc-500 text-sm">
                      + more added every quarter
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── VALUES ────────────────────────────────────────────────────────── */}
      <section
        aria-label="Our core values"
        className="py-24 bg-zinc-900/40 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-950/30 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={fadeUp}>
              <p className="text-primary-400 font-bold tracking-widest uppercase text-sm mb-4">
                What We Stand For
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">
                Our Core{" "}
                <span className="bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
                  Values
                </span>
              </h2>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection className="grid md:grid-cols-3 gap-8">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                variants={fadeUp}
                custom={i}
                className="group relative"
              >
                <div className="h-full bg-zinc-900 border border-white/5 hover:border-white/10 rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/40 overflow-hidden">
                  {/* Hover glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${value.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}
                  />

                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${value.gradient} flex items-center justify-center text-white mb-6 shadow-xl ${value.glow}`}
                  >
                    {value.icon}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">
                    {value.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed text-sm sm:text-base">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── TEAM ──────────────────────────────────────────────────────────── */}
      <section aria-label="Our leadership team" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={fadeUp}>
              <p className="text-primary-400 font-bold tracking-widest uppercase text-sm mb-4">
                The People Behind It
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
                Meet Our{" "}
                <span className="bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
                  Leadership
                </span>
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto text-base sm:text-lg">
                Industry veterans with decades of combined experience in tech
                and education.
              </p>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <TeamCard key={member.name} member={member} index={i} />
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── WHY CHOOSE US ─────────────────────────────────────────────────── */}
      <section
        aria-label="Why choose us"
        className="py-24 bg-zinc-900/40 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] bg-accent-950/40 rounded-full blur-[140px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp}>
              <p className="text-primary-400 font-bold tracking-widest uppercase text-sm mb-4">
                The Difference
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-8">
                Why Students Choose{" "}
                <span className="bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
                  Code Illustrated
                </span>
              </h2>

              <ul className="space-y-5">
                {[
                  {
                    icon: <Users className="w-5 h-5" />,
                    title: "1-on-1 Live Mentorship",
                    desc: "Real-time sessions with your personal instructor — no pre-recorded content.",
                  },
                  {
                    icon: <BookOpen className="w-5 h-5" />,
                    title: "Project-Based Learning",
                    desc: "Build a portfolio of real-world projects that employers actually care about.",
                  },
                  {
                    icon: <Code className="w-5 h-5" />,
                    title: "Industry-Current Curriculum",
                    desc: "Updated every quarter to reflect what top companies are hiring for right now.",
                  },
                  {
                    icon: <Zap className="w-5 h-5" />,
                    title: "Career Support Included",
                    desc: "Resume reviews, mock interviews, and job-placement guidance — all included.",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-600/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm mb-0.5">
                        {item.title}
                      </p>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={fadeUp} custom={1}>
              <div className="relative bg-gradient-to-br from-primary-600 via-primary-800 to-accent-900 rounded-3xl p-px shadow-2xl shadow-primary-500/20">
                <div className="bg-zinc-950 rounded-[calc(1.5rem-1px)] p-8 sm:p-10">
                  {/* Dot grid decoration */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
                  </div>

                  <div className="relative text-center">
                    <div className="text-5xl mb-4">🚀</div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
                      Ready to Start?
                    </h3>
                    <p className="text-zinc-400 mb-8 leading-relaxed text-sm sm:text-base">
                      Join hundreds of students who went from zero to job-ready
                      in months, not years.
                    </p>
                    <Link
                      href="/contact-us"
                      className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-600 hover:to-secondary-500 text-white font-bold px-6 py-4 rounded-2xl transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95"
                    >
                      Book a Free Session <ArrowRight className="w-4 h-4" />
                    </Link>
                    <p className="mt-4 text-zinc-600 text-xs">
                      No credit card required · Limited spots available
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
