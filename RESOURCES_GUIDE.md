# Learning Resources Page

## Overview
A dedicated resources page where learners can download study materials, PDFs, guides, and reference documents for each course.

## Features
- Browse all resources or filter by course
- Download PDFs and documents
- View download counts for popular materials
- Organized by course
- Clean, card-based interface

## Files Created

1. **store/resources-store.ts** - Resource data management with Zustand
2. **components/resource-card.tsx** - Individual resource display card
3. **app/resources/page.tsx** - Resources page

## How to Use

### View Resources
Navigate to `/resources` or click "Resources" in the header navigation.

### Filter by Course
Select a course from the filter buttons to view only materials for that course.

### Download Files
Click the "Download" button on any resource card. The file will download to your default downloads folder.

## Adding New Resources

Edit `store/resources-store.ts` and add to the `RESOURCES` array:

```typescript
{
  id: 'unique-id',
  courseId: 'course-id',
  courseName: 'Course Name',
  title: 'Resource Title',
  description: 'Brief description',
  fileUrl: 'https://example.com/file.pdf',
  fileType: 'pdf',
  downloadCount: 0,
}
```

## File Types Supported
- pdf
- document
- video
- code

## Customization

### Change Download Behavior
In `components/resource-card.tsx`, modify `handleDownload()` to use a custom download service or track analytics.

### Add Database Integration
Replace `store/resources-store.ts` with Supabase queries when database is available.

### Add Upload Functionality
Create an admin panel to upload new resources directly.

## Integration Points
- Header navigation automatically includes Resources link
- Can link to resources from course detail pages
- Resource cards use existing design system (Button, Card, Badge)

## Sample Data
The store includes 6 sample resources across multiple courses (React, JavaScript, jQuery, HTML).
