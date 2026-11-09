"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Mail, Lock, Save, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [courseEmails, setCourseEmails] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, created_at, email_notifications")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setEnrolledAt(profile.created_at);
        setCourseEmails(profile.email_notifications !== false);
      }
    }
    load();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError("");
    setProfileSuccess(false);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, email_notifications: courseEmails })
      .eq("id", userId);

    setSaving(false);
    if (profileError) {
      setError("Failed to update profile. Please try again.");
    } else {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setChangingPassword(true);
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (pwError) {
      setPasswordError(pwError.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
  }

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Profile</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-5 mb-8 p-6 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c31d24] to-[#9b161c] flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg shadow-[#c31d24]/25">
          {initials}
        </div>
        <div>
          <p className="text-white font-semibold text-lg">{fullName || email.split("@")[0]}</p>
          <p className="text-white/40 text-sm">{email}</p>
          {enrolledAt && (
            <p className="text-white/25 text-xs mt-1">
              Member since {new Date(enrolledAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Profile form */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-white/40" /> Personal Information
        </h2>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm font-medium mb-2">Full name</label>
            <input
              id="profile-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm font-medium mb-2">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 pl-11 text-white/40 text-sm cursor-not-allowed"
              />
            </div>
            <p className="text-white/25 text-xs mt-1.5">Email cannot be changed</p>
          </div>
          <label className="flex items-start gap-2.5 text-sm text-white/70">
            <input type="checkbox" checked={courseEmails} onChange={(e) => setCourseEmails(e.target.checked)} className="mt-0.5 accent-[#c31d24]" />
            <span>
              Email me class reminders, announcements and feedback
              <span className="block text-white/35 text-xs">Payment receipts and account emails are always sent.</span>
            </span>
          </label>
          <button
            id="save-profile-btn"
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-[#c31d24] to-[#e53535] hover:from-[#b01a20] hover:to-[#c31d24] text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-[#c31d24]/20 disabled:opacity-60"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : profileSuccess ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : (
              <><Save className="w-4 h-4" /> Save changes</>
            )}
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-white/40" /> Change Password
        </h2>

        {passwordError && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{passwordError}</div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm font-medium mb-2">New password</label>
            <div className="relative">
              <input
                id="profile-new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-white/60 text-sm font-medium mb-2">Confirm new password</label>
            <input
              id="profile-confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#c31d24]/50 transition-all"
            />
          </div>
          <button
            id="change-password-btn"
            type="submit"
            disabled={changingPassword || !newPassword}
            className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-60 border border-white/10"
          >
            {changingPassword ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
            ) : passwordSuccess ? (
              <><CheckCircle2 className="w-4 h-4 text-green-400" /> Password updated!</>
            ) : (
              <><Lock className="w-4 h-4" /> Update password</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
