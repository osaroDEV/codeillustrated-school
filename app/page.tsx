import { HeroSection } from '@/components/hero-section';
// import { CoursesSection } from '@/components/courses-section';
// import { FeaturesSection } from '@/components/features-section';
import { ContactForm } from '@/components/contact-form';
// import About from '@/components/About';
import Benefits from '@/components/Benefits';
import Courses from '@/components/Courses';
import HowItWorks from '@/components/HowItWorks';
import Testimonials from '@/components/Testimonials';
import CTA from '@/components/CTA';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      {/* <CoursesSection />
      <FeaturesSection /> */}
      {/* <About /> */}
      <Courses />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      {/* <ContactForm /> */}
      <CTA />
    </main>
  );
}