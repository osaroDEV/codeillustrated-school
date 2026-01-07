import { create } from "zustand"

export interface Resource {
  id: string
  courseId: string
  courseName: string
  title: string
  description: string
  fileUrl: string
  fileType: 'pdf' | 'document' | 'video' | 'code' | 'image'
  downloadCount?: number
}

interface ResourcesStore {
  resources: Resource[]
  getResourcesByCourse: (courseId: string) => Resource[]
  getAllResources: () => Resource[]
}

const RESOURCES: Resource[] = [
  {
    id: '1',
    courseId: 'react',
    courseName: 'React Crash Course',
    title: 'React Fundamentals Guide',
    description: 'Complete guide to React components, state, and props',
    fileUrl: 'https://example.com/react-fundamentals.pdf',
    fileType: 'pdf',
    downloadCount: 245,
  },
  {
    id: '2',
    courseId: 'react',
    courseName: 'React Crash Course',
    title: 'React Hooks Cheatsheet',
    description: 'Quick reference for useState, useEffect, and other hooks',
    fileUrl: 'https://example.com/react-hooks-cheatsheet.pdf',
    fileType: 'pdf',
    downloadCount: 189,
  },
  {
    id: '3',
    courseId: 'js',
    courseName: 'JavaScript for Beginners',
    title: 'ES6+ Features Guide',
    description: 'Arrow functions, destructuring, async/await explained',
    fileUrl: 'https://example.com/js-es6-guide.pdf',
    fileType: 'pdf',
    downloadCount: 412,
  },
  {
    id: '4',
    courseId: 'js',
    courseName: 'JavaScript for Beginners',
    title: 'DOM Manipulation Handbook',
    description: 'How to select, modify, and interact with DOM elements',
    fileUrl: 'https://example.com/dom-handbook.pdf',
    fileType: 'pdf',
    downloadCount: 356,
  },
  {
    id: '5',
    courseId: 'js-jq',
    courseName: 'Javascript & jQuery Masterclass',
    title: 'jQuery Complete Reference',
    description: 'Selectors, events, and animations in jQuery',
    fileUrl: 'https://example.com/jquery-reference.pdf',
    fileType: 'pdf',
    downloadCount: 167,
  },
  {
    id: '6',
    courseId: 'html-intro',
    courseName: 'Introduction to HTML',
    title: 'HTML5 Elements Reference',
    description: 'Complete list of HTML5 semantic elements',
    fileUrl: 'https://example.com/html5-reference.pdf',
    fileType: 'pdf',
    downloadCount: 523,
  },
]

export const MOCKUP_RESOURCES: Resource[] = [
  {
    id: 'm1',
    courseId: 'html-intro',
    courseName: 'HTML Mockups',
    title: 'Website Mockup 1',
    description: 'High-fidelity design mockup for the main website interface (Part 1)',
    fileUrl: 'https://drive.google.com/file/d/1GiHVXum8Lrp1ljV_Vbml4JCLdfu2atkM/view?usp=drive_link',
    fileType: 'image',
    downloadCount: 0,
  },
  {
    id: 'm2',
    courseId: 'html-intro',
    courseName: 'HTML Mockups',
    title: 'Website Mockup 2',
    description: 'High-fidelity design mockup for the main website interface (Part 2)',
    fileUrl: 'https://drive.google.com/file/d/19Sfm9NqUo7txs6-Xo1QlgW1-Cr8V_OFc/view?usp=drive_link',
    fileType: 'image',
    downloadCount: 0,
  },
]

export const useResourcesStore = create<ResourcesStore>((set, get) => ({
  resources: RESOURCES,

  getResourcesByCourse: (courseId) => {
    const { resources } = get()
    return resources.filter((resource) => resource.courseId === courseId)
  },

  getAllResources: () => {
    const { resources } = get()
    return resources
  },
}))
