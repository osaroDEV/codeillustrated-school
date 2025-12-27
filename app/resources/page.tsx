"use client"

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ResourceCard } from '@/components/resource-card'
import { useResourcesStore } from '@/store/resources-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ResourcesPage() {
  const { resources, getResourcesByCourse } = useResourcesStore()
  const [selectedCourse, setSelectedCourse] = useState<string>('all')

  const filteredResources = selectedCourse === 'all'
    ? resources
    : getResourcesByCourse(selectedCourse)

  const courseIds = Array.from(new Set(resources.map(r => r.courseId)))
  const courses = courseIds.map(id => {
    const resource = resources.find(r => r.courseId === id)
    return { id, name: resource?.courseName || id }
  })

  return (
    <main className="min-h-screen">
      <section className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl text-white sm:text-5xl font-bold mb-4">
              Learning <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">Resources</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Download study materials, guides, and reference documents for all our courses
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-3 justify-center mb-12"
          >
            <Button
              onClick={() => setSelectedCourse('all')}
              variant={selectedCourse === 'all' ? 'default' : 'outline'}
              className={selectedCourse === 'all'
                ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600'
                : 'border-red-200 hover:bg-red-50'
              }
            >
              All Resources
            </Button>
            {courses.map((course) => (
              <Button
                key={course.id}
                onClick={() => setSelectedCourse(course.id)}
                variant={selectedCourse === course.id ? 'default' : 'outline'}
                size="sm"
                className={selectedCourse === course.id
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600'
                  : 'border-red-200 hover:bg-red-50'
                }
              >
                {course.name}
              </Button>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Badge variant="secondary" className="text-sm">
              {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''} available
            </Badge>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ResourceCard resource={resource} />
              </motion.div>
            ))}
          </div>

          {filteredResources.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground text-lg">
                No resources available for this course yet.
              </p>
            </motion.div>
          )}
        </div>
      </section>
      <div className='flex'>
      <a href='https://drive.google.com/file/d/19Sfm9NqUo7txs6-Xo1QlgW1-Cr8V_OFc/view?usp=drive_link' target='_blank' rel='noopener noreferrer'>
        <Button className="fixed bottom-8 right-8 bg-green-500 hover:bg-green-600 text-white shadow-lg">
          Download Mockup 1
        </Button>
      </a>
      <a href='https://drive.google.com/file/d/1GiHVXum8Lrp1ljV_Vbml4JCLdfu2atkM/view?usp=drive_link' target='_blank' rel='noopener noreferrer'>
        <Button className="fixed bottom-8 right-8 bg-green-500 hover:bg-green-600 text-white shadow-lg">
          Download Mockup 2
        </Button>
      </a>
      </div>
    </main>
  )
}
