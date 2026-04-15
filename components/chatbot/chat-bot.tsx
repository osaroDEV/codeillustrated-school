"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  type: "bot" | "user";
  text: string;
  timestamp: Date;
  options?: { label: string; action: string }[];
};

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      text: "Hi there! 👋 Welcome to CodeIllustrated. How can I help you today?",
      timestamp: new Date(),
      options: [
        { label: "Browse Courses", action: "browse_courses" },
        { label: "How to register?", action: "how_to_register" },
        { label: "Pricing Information", action: "pricing" },
        { label: "Contact Support", action: "support" },
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleOptionClick = (option: { label: string; action: string }) => {
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      type: "user",
      text: option.label,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Bot response logic
    setTimeout(() => {
      let botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: "",
        timestamp: new Date(),
      };

      switch (option.action) {
        case "browse_courses":
          botResponse.text =
            "We have amazing courses! You can check out our Junior Web Creator, Game Dev Pro, Frontend Beginner, and more. Would you like to see the full list?";
          botResponse.options = [
            { label: "View All Courses", action: "go_to_courses" },
            { label: "Back to main", action: "main_menu" },
          ];
          break;
        case "how_to_register":
          botResponse.text =
            "Registration is simple! Just find the course you like, click 'Enroll Now', and fill the contact form. Need any help with the process?";
          botResponse.options = [
            { label: "Contact Support", action: "support" },
            { label: "Back to main", action: "main_menu" },
          ];
          break;
        case "pricing":
          botResponse.text =
            "Our pricing varies by course. We offer flexible payment options to make learning accessible. Check the individual course pages for details.";
          botResponse.options = [
            { label: "Contact Support", action: "support" },
            { label: "Back to main", action: "main_menu" },
          ];
          break;
        case "support":
          botResponse.text =
            "I'll be happy to connect you with our support team! You can reach us via WhatsApp (message), or send us an email for detailed inquiries.";
          botResponse.options = [
            { label: "Chat on WhatsApp", action: "whatsapp" },
            // { label: "Call Us Now", action: "call" },
            { label: "Send an Email", action: "email" },
            { label: "Back to main", action: "main_menu" },
          ];
          break;
        case "go_to_courses":
          window.location.href = "/academy/courses";
          return;
        case "whatsapp":
          window.open("https://wa.me/447405786279", "_blank");
          botResponse.text =
            "Opening WhatsApp... Anything else I can help with?";
          botResponse.options = [
            { label: "Back to main", action: "main_menu" },
          ];
          // break;
          // case "call":
          //   window.open("tel:+447405786279", "_self");
          //   botResponse.text = "Starting the call... Need anything else?";
          //   botResponse.options = [
          //     { label: "Back to main", action: "main_menu" },
          //   ];
          break;
        case "email":
          window.open("mailto:admin@codeillustrated.com", "_blank");
          botResponse.text = "Opening your email client... Anything else?";
          botResponse.options = [
            { label: "Back to main", action: "main_menu" },
          ];
          break;
        case "main_menu":
          botResponse.text = "What else can I help you with?";
          botResponse.options = [
            { label: "Browse Courses", action: "browse_courses" },
            { label: "How to register?", action: "how_to_register" },
            { label: "Pricing Information", action: "pricing" },
            { label: "Contact Support", action: "support" },
          ];
          break;
        default:
          botResponse.text =
            "I'm not sure how to handle that request. Please try another option or contact our support.";
      }

      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Default bot response for typed messages
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: "Thanks for your message! To give you the best help, please use one of the options below or contact our support team directly.",
        timestamp: new Date(),
        options: [
          { label: "Chat on WhatsApp", action: "whatsapp" },
          { label: "Send an Email", action: "email" },
          { label: "Main Menu", action: "main_menu" },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 sm:bottom-8 sm:right-8">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.95,
              transformOrigin: "bottom right",
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-red-600 to-orange-500 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    CodeIllustrated Assistant
                  </h3>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] opacity-80">
                      Always Online
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{
                    opacity: 0,
                    y: 10,
                    x: msg.type === "user" ? 10 : -10,
                  }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  className={cn(
                    "flex flex-col",
                    msg.type === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm",
                      msg.type === "user"
                        ? "bg-red-600 text-white rounded-tr-none"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none",
                    )}
                  >
                    {msg.text}
                  </div>
                  {msg.options && (
                    <div className="mt-3 flex flex-wrap gap-2 w-full">
                      {msg.options.map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => handleOptionClick(opt)}
                          className="text-xs px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all duration-200 text-red-600 dark:text-red-400"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] text-zinc-400 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50"
            >
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all dark:text-white"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:opacity-90 transition-opacity"
                  disabled={!inputValue.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
          isOpen
            ? "bg-zinc-900 text-white rotate-90"
            : "bg-gradient-to-r from-red-600 to-orange-500 text-white",
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
        )}
      </motion.button>
    </div>
  );
}
