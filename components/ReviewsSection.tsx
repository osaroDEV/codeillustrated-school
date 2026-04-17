"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote } from "lucide-react";

type CourseType =
  | "Junior Web Creator"
  | "Game Dev Pro"
  | "Frontend Beginner"
  | "Data Science Intro";

interface Review {
  id: number;
  quote: string;
  name: string;
  role: string;
  course: CourseType;
}

const reviews: Review[] = [
  {
    id: 1,
    quote:
      "Before Code Illustrated, my daughter thought websites were pure magic. After six weeks of Junior Web Creator, she had built her own multi-page HTML site with CSS animations and a JavaScript quiz.",
    name: "Rachel Okonkwo",
    role: "Parent of Amara",
    course: "Junior Web Creator",
  },
  {
    id: 2,
    quote:
      "We covered React hooks, Next.js routing, Tailwind, and TypeScript. These are the exact tools I now use at work every day.",
    name: "Priya Nair",
    role: "Age 22",
    course: "Frontend Beginner",
  },
  {
    id: 3,
    quote:
      "The course gave me the Python skills to automate my weekly reports and build dashboards that impressed my director. Every concept was illustrated with examples relevant to my actual job.",
    name: "Yemi Adeyemi",
    role: "Age 31",
    course: "Data Science Intro",
  },
  {
    id: 4,
    quote:
      "I did not know what a div was when I started, and now I have a proper personal website with a navigation bar and everything. The instructor drew everything out so clearly — I never felt lost.",
    name: "Marcus T.",
    role: "Age 12",
    course: "Junior Web Creator",
  },
  {
    id: 5,
    quote:
      "Within four sessions I had a working platformer game. The way the instructor visualises loops and conditionals with actual game mechanics makes everything click instantly.",
    name: "Jordan M.",
    role: "Age 16",
    course: "Game Dev Pro",
  },
  {
    id: 6,
    quote:
      "My son's confidence in logic and problem-solving has transferred directly to his maths results at school.",
    name: "Daniel Asare",
    role: "Parent of Kwame, Age 14",
    course: "Game Dev Pro",
  },
  {
    id: 7,
    quote:
      "I landed a junior frontend role two weeks after finishing the course. I used my React portfolio site, live weather app, and Next.js prototype in every interview.",
    name: "Sofia Nwachukwu",
    role: "Age 27",
    course: "Frontend Beginner",
  },
  {
    id: 8,
    quote:
      "Components, props, state — it all made sense within weeks, not years. My mentor would open my actual code, explain what was wrong, and walk me through fixing it live.",
    name: "David Chen",
    role: "Age 34",
    course: "Frontend Beginner",
  },
  {
    id: 9,
    quote:
      "By the end I had three visualisation projects I could include in my postgraduate application portfolio. The mentor was genuinely invested in my success.",
    name: "Chiamaka Eze",
    role: "Age 24",
    course: "Data Science Intro",
  },
  {
    id: 10,
    quote:
      "I had dabbled with HTML and CSS tutorials before but always got stuck building something real. The 1-on-1 sessions changed everything — within weeks I understood everything.",
    name: "Alex Rivera",
    role: "Age 15",
    course: "Frontend Beginner",
  },
];

const courses: (CourseType | "All")[] = [
  "All",
  "Junior Web Creator",
  "Game Dev Pro",
  "Frontend Beginner",
  "Data Science Intro",
];

const courseColors: Record<CourseType, string> = {
  "Junior Web Creator": "bg-purple-100 text-purple-700 border-purple-200",
  "Game Dev Pro": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Frontend Beginner": "bg-blue-100 text-blue-700 border-blue-200",
  "Data Science Intro": "bg-amber-100 text-amber-700 border-amber-200",
};

export default function ReviewsSection() {
  const [activeFilter, setActiveFilter] = useState<CourseType | "All">("All");
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredReviews = useMemo(() => {
    return activeFilter === "All"
      ? reviews
      : reviews.filter((r) => r.course === activeFilter);
  }, [activeFilter]);

  const visibleReviews = isExpanded
    ? filteredReviews
    : filteredReviews.slice(0, 3);

  const hasMore = filteredReviews.length > 3;

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const handleFilterChange = (filter: CourseType | "All") => {
    setActiveFilter(filter);
    setIsExpanded(false); // Reset expansion when filtering
  };

  return (
    <section className="py-24 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black mb-0"
          >
            What Our Students Are Saying
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Real outcomes from real students across every course.
          </motion.p>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {courses.map((course) => (
            <button
              key={course}
              onClick={() => handleFilterChange(course)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                activeFilter === course
                  ? "bg-[#2980B9] text-white border-[#2980B9] shadow-lg shadow-blue-200"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#2980B9] hover:text-[#2980B9]"
              }`}
            >
              {course}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 items-stretch">
          <AnimatePresence mode="popLayout">
            {visibleReviews.map((review, idx) => (
              <motion.div
                key={review.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.4,
                  delay: idx * 0.05,
                  ease: "easeOut",
                }}
                className="bg-white p-8 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-shadow duration-500"
              >
                {/* Quotation Mark */}
                <div className="mb-4">
                  <Quote
                    className="w-12 h-12 text-[#2980B9] opacity-30 -ml-2"
                    fill="currentColor"
                  />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>

                {/* Quote Text */}
                <p className="text-slate-700 text-lg leading-relaxed mb-8 flex-1">
                  &ldquo;{review.quote}&rdquo;
                </p>

                {/* Reviewer Info */}
                <div className="mt-auto pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-[#1A3C5E] text-xl mb-2">
                    {review.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-500 font-semibold px-0">
                      {review.role}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border ${
                        courseColors[review.course]
                      } shadow-sm`}
                    >
                      {review.course}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Show More Button */}
        {hasMore && (
          <div className="text-center">
            <button
              onClick={toggleExpand}
              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-300 bg-[#1A3C5E] rounded-full hover:bg-[#2980B9] active:scale-95 shadow-xl shadow-slate-200"
            >
              {isExpanded ? "Show Less" : "Show More Reviews"}
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                className="ml-2"
              >
                <svg
                  width="12"
                  height="8"
                  viewBox="0 0 12 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1L6 6L11 1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
