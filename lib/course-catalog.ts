import type { Course } from "./course-types";

// The original hand-maintained catalogue. The database (see
// supabase/migrations/*_seed_courses.sql, generated from this file by
// scripts/generate-course-seed.mjs) is now the source of truth; this copy is
// the fallback lib/courses.ts serves when Supabase is unreachable or not yet
// migrated, so the marketing site never renders an empty catalogue.
export const STATIC_COURSES: Course[] = [
  {
    id: "junior-web-creator",
    title: "Junior Web Creator",
    age: "Age 8-12",
    description:
      "Master HTML, CSS, and basic JavaScript by building interactive websites and mini-games.",
    icon: "globe",
    color: "text-accent-500",
    bg: "bg-accent-500/10",
    fullDescription:
      "Our Junior Web Creator course is designed specifically for young minds to explore the world of web development. We move beyond theory, focusing on visual learning and immediate results. Students will learn how to structure content with HTML, style it with CSS, and add interactive elements with JavaScript.",
    curriculum: [
      {
        module: "Module 1: Web Foundation",
        lessons: [
          "How the Internet works",
          "Introduction to HTML tags",
          "Building your first page",
        ],
      },
      {
        module: "Module 2: Creative Styling",
        lessons: [
          "Colors and Layouts with CSS",
          "Working with Images",
          "Responsive Design Basics",
        ],
      },
      {
        module: "Module 3: Interaction",
        lessons: [
          "Intro to JavaScript",
          "Button clicks and Alerts",
          "Small Games",
        ],
      },
    ],
    duration: "24 Weeks",
    level: "Beginner",
    price: {
      group: { usd: 50, ngn: 75000 },
      oneOnOne: { usd: 85, ngn: 120000 },
    },
  },
  {
    id: "game-dev-pro",
    title: "Game Dev Pro",
    age: "Age 13-17",
    description:
      "Dive into logic and physics using Python and JavaScript to create your own playable games.",
    icon: "gamepad",
    color: "text-secondary-500",
    bg: "bg-secondary-500/10",
    fullDescription:
      "Game Dev Pro takes teenagers on a journey through the mechanics of game creation. From character movement to complex physics systems, students will use professional tools and languages to bring their ideas to life.",
    curriculum: [
      {
        module: "Module 1: Game Logic",
        lessons: [
          "Variables and Loops in Game Dev",
          "Collision Detection",
          "Score Systems",
        ],
      },
      {
        module: "Module 2: Graphics & Assets",
        lessons: ["Sprites and Animations", "Sound Effects", "Level Design"],
      },
      {
        module: "Module 3: Project Phase",
        lessons: [
          "Building a Platformer",
          "Multiplayer Basics",
          "Publishing Your Game",
        ],
      },
    ],
    duration: "16 Weeks",
    level: "Intermediate",
    price: {
      group: { usd: 60, ngn: 90000 },
      oneOnOne: { usd: 100, ngn: 150000 },
    },
  },
  {
    id: "frontend-beginner",
    title: "Frontend Developer",
    age: "Teens & Adults",
    description:
      "Learn React, Next.js, and how to build professional-grade applications.",
    icon: "layout",
    color: "text-primary-500",
    bg: "bg-primary-500/10",
    fullDescription:
      "Perfect for older students and adults looking to start a career or build their own products. This course covers everything from the user interface to the database, ensuring a complete understanding of modern application development.",
    curriculum: [
      {
        module: "Module 1: Frontend Mastery",
        lessons: ["React Basics", "State Management", "Component Architecture"],
      },
      {
        module: "Module 2: Next.js",
        lessons: ["Next.js Basics", "API Design", "Authentication"],
      },
      {
        module: "Module 3: Deployment",
        lessons: ["PostgreSQL/MongoDB", "Cloud Hosting", "CI/CD Pipelines"],
      },
    ],
    duration: "24 Weeks",
    level: "Intermediate",
    price: {
      group: { usd: 75, ngn: 100000 },
      oneOnOne: { usd: 120, ngn: 180000 },
    },
  },
  {
    id: "frontend-advanced",
    title: "Frontend Architect",
    age: "Teens & Adults",
    description:
      "Master React, Next.js, and advanced architecture patterns.",
    icon: "layout",
    color: "text-primary-500",
    bg: "bg-primary-500/10",
    fullDescription:
      "Perfect for older students and adults looking to start a career or build their own products. This course covers everything from the user interface to the database, ensuring a complete understanding of modern application development.",
    curriculum: [
      {
        module: "Module 1: Frontend Architecture",
        lessons: ["Advanced React Patterns", "State Management", "Component Architecture"],
      },
      {
        module: "Module 2: Next.js & Scalability",
        lessons: ["Advanced Next.js Features", "API Design", "Authentication"],
      },
      {
        module: "Module 3: Advanced Deployment",
        lessons: ["Advanced PostgreSQL/MongoDB", "Advanced Cloud Hosting", "Advanced CI/CD Pipelines"],
      },
    ],
    duration: "24 Weeks",
    level: "Advanced",
    price: {
      group: { usd: 100, ngn: 150000 },
      oneOnOne: { usd: 150, ngn: 220000 },
    },
  },
  {
    id: "data-science-intro",
    title: "Data Science Intro",
    age: "Teens & Adults",
    description:
      "Understand data visualization and automation with Python. Perfect for curious minds.",
    icon: "database",
    color: "text-accent-600",
    bg: "bg-accent-600/10",
    fullDescription:
      "Learn how to turn raw data into insights. This course introduces Python libraries like Pandas, NumPy, and Matplotlib to help students automate boring tasks and visualize complex information.",
    curriculum: [
      {
        module: "Module 1: Python for Data",
        lessons: [
          "Data Types and Structures",
          "Working with Arrays",
          "Scripting Basics",
        ],
      },
      {
        module: "Module 2: Visualization",
        lessons: [
          "Charts and Graphs",
          "Dashboarding",
          "Storytelling with Data",
        ],
      },
      {
        module: "Module 3: Machine Learning Intro",
        lessons: ["Regression Models", "Classification", "AI Tools for Data"],
      },
    ],
    duration: "12 Weeks",
    level: "Beginner",
    price: {
      group: { usd: 65, ngn: 90000 },
      oneOnOne: { usd: 90, ngn: 160000 },
    },
  },
  {
    id: "generative-ai-mastery",
    title: "Generative AI Mastery",
    age: "Age 8-20",
    description:
      "Explore the world of AI — from talking to chatbots to building your own AI-powered projects. No coding experience needed!",
    icon: "sparkles",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    fullDescription:
      "Generative AI Mastery for Beginners is a fun, hands-on course that demystifies artificial intelligence for young learners aged 8 to 20. Students will discover how AI models think, learn to craft powerful prompts, and use tools like ChatGPT, image generators, and AI coding assistants to build real creative projects — all without needing prior programming experience.",
    curriculum: [
      {
        module: "Module 1: Understanding AI",
        lessons: [
          "What is Artificial Intelligence?",
          "How Generative AI works",
          "AI in everyday life",
        ],
      },
      {
        module: "Module 2: Prompt Engineering",
        lessons: [
          "Talking to AI: Basics of Prompting",
          "Advanced Prompt Techniques",
          "Using AI for Writing & Storytelling",
        ],
      },
      {
        module: "Module 3: AI-Powered Projects",
        lessons: [
          "Creating Art with AI Image Generators",
          "Building a Chatbot with AI Tools",
          "Your Personal AI Project Showcase",
        ],
      },
    ],
    duration: "10 Weeks",
    level: "Beginner",
    price: {
      group: { usd: 55, ngn: 80000 },
      oneOnOne: { usd: 90, ngn: 130000 },
    },
  },
];
