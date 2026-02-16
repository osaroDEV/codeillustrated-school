import { Database, Gamepad2, Globe, Layout, LucideIcon } from "lucide-react";

export interface Course {
  id: string;
  title: string;
  age: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  fullDescription: string;
  curriculum: {
    module: string;
    lessons: string[];
  }[];
  duration: string;
  level: string;
  price: string;
}

export const courses: Course[] = [
  {
    id: "junior-web-creator",
    title: "Junior Web Creator",
    age: "Age 8-12",
    description:
      "Master HTML, CSS, and basic JavaScript by building interactive websites and mini-games.",
    icon: Globe,
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
    price: "$499",
  },
  {
    id: "game-dev-pro",
    title: "Game Dev Pro",
    age: "Age 13-17",
    description:
      "Dive into logic and physics using Python and JavaScript to create your own playable games.",
    icon: Gamepad2,
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
    price: "$399",
  },
  {
    id: "frontend-beginner",
    title: "Frontend Beginner",
    age: "Teens & Adults",
    description:
      "Learn React, Next.js, and how to build professional-grade applications.",
    icon: Layout,
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
    price: "$599",
  },
  {
    id: "data-science-intro",
    title: "Data Science Intro",
    age: "Teens & Adults",
    description:
      "Understand data visualization and automation with Python. Perfect for curious minds.",
    icon: Database,
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
    price: "$379",
  },
];
