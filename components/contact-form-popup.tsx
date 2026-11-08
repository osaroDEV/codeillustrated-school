"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { contactSchema, submitContact, type ContactInput } from "@/lib/contact";
import type { CourseLink } from "@/lib/course-types";


export function ContactFormPopup({ courses }: { courses: CourseLink[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      course: "",
      message: "",
      website: "",
    },
  });

  useEffect(() => {
    // Timer to open popup after 30 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  const onSubmit = async (data: ContactInput) => {
    setIsSubmitting(true);
    const error = await submitContact(data);
    setIsSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Thank you! We'll get back to you within 24 hours.");
    form.reset();
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 sm:p-6 lg:p-8"
            onClick={handleClose}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>

              {/* Header */}
              <div className="bg-gradient-to-r from-primary-500 to-secondary-400 px-6 sm:px-8 py-6 sm:py-8 text-white rounded-t-2xl">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  Start Your Coding Journey! 🚀
                </h2>
                <p className="text-sm sm:text-base text-white/90">
                  Fill out the form below and we'll get back to you within 24
                  hours.
                </p>
              </div>

              {/* Form Content */}
              <div className="px-6 sm:px-8 py-6 sm:py-8">
                <Form {...form}>
                  <form
                    action="https://formsubmit.co/admin@codeillustrated.com"
                    method="POST"
                    className="space-y-4 sm:space-y-5"
                  >
                    <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" {...form.register("website")} />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="your@email.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+44 7405 786 279"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="course"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Interest</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="" disabled>Select a course</option>
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.title}
                                </option>
                              ))}
                              <option value="other">Other / General Inquiry</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about your goals and any questions you have..."
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      {/* <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="w-full sm:w-auto order-2 sm:order-1"
                      >
                        Maybe Later
                      </Button> */}
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:flex-1 bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500 order-1 sm:order-2"
                      >
                        {isSubmitting ? "Sending..." : "Send Message"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
