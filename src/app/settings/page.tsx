"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser, type LocalUser, nsKey } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";
import { User, Mail, Lock, Save, Upload, MapPin, CreditCard, Bell, ShieldCheck, Edit2, X } from "lucide-react";

type Tab = "general" | "security" | "location" | "notifications" | "billing" | "compliance";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = supabaseBrowser();
  
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'background' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingName, setEditingName] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [about, setAbout] = useState("");
  const [postcode, setPostcode] = useState("");
  const [county, setCounty] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [accountType, setAccountType] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);

  // File input refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab && ["general", "security", "location", "notifications", "billing", "compliance"].includes(tab)) {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/auth/login?next=/settings");
        return;
      }
      setUser(currentUser);
      setName(currentUser.name || "");
      setEmail(currentUser.email || "");
      
      // Load profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar, background_image, about, postcode, county, country, account_type, email_notifications, message_notifications, marketing_notifications')
        .eq('id', currentUser.id)
        .single();
      
      if (profile) {
        const normalizedAccountType = typeof (profile as any).account_type === 'string'
          ? (profile as any).account_type.toLowerCase().trim()
          : null;

        setAvatar(profile.avatar || "");
        setBackgroundImage(profile.background_image || "");
        setAbout(profile.about || "");
        setPostcode(profile.postcode || "");
        setCounty(profile.county || "");
        setCountry(profile.country || "United Kingdom");
        setAccountType(normalizedAccountType);
        
        // Load notification preferences
        setEmailNotifications(profile.email_notifications !== false);
        setMessageNotifications(profile.message_notifications !== false);
        setMarketingNotifications(profile.marketing_notifications === true);
      }
      
      setLoading(false);
    };
    loadUser();
  }, [router, supabase]);

  const handleImageUpload = async (file: File, type: 'avatar' | 'background') => {
    setUploading(type);
    setMessage(null);

    try {
      // Get auth token from session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/profile/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (type === 'avatar') {
        setAvatar(data.url);
        try {
          const avatarKey = nsKey("avatar_v1");
          localStorage.setItem(avatarKey, data.url);
          window.dispatchEvent(new Event("ms:profile"));
        } catch (e) {
          console.error('Failed to update localStorage:', e);
        }
      } else {
        setBackgroundImage(data.url);
      }

      setMessage({ type: 'success', text: `${type === 'avatar' ? 'Avatar' : 'Background'} updated successfully!` });
      window.dispatchEvent(new Event("ms:auth"));
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setUploading(null);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatar(previewUrl);
      handleImageUpload(file, 'avatar');
    }
  };

  const handleBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file, 'background');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    if (!user) {
      setSaving(false);
      return;
    }

    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedAvatar = avatar.trim();
      const trimmedBackground = backgroundImage.trim();
      const trimmedAbout = about.trim();

      const lastNameChangeKey = nsKey("last_name_change_at");
      const lastChangeRaw = typeof window !== 'undefined' ? localStorage.getItem(lastNameChangeKey) : null;
      const lastChange = lastChangeRaw ? new Date(lastChangeRaw).getTime() : 0;
      const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
      const now = Date.now();
      const nameChanged = trimmedName !== (user.name || "");
      const emailChanged = trimmedEmail !== (user.email || "");
      const avatarChanged = trimmedAvatar !== (user.avatar || "");
      const backgroundChanged = trimmedBackground !== (user.background_image || "");
      const aboutChanged = trimmedAbout !== (user.about || "");

      if (!nameChanged && !emailChanged && !avatarChanged && !backgroundChanged && !aboutChanged) {
        setMessage({ type: 'success', text: 'No changes to save.' });
        setSaving(false);
        return;
      }

      // Check 6-month cooldown for name changes
      if (nameChanged && lastChange && now - lastChange < sixMonthsMs) {
        const nextDate = new Date(lastChange + sixMonthsMs).toLocaleDateString();
        setMessage({ type: 'error', text: `Display name can only be changed once every 6 months. Try again after ${nextDate}.` });
        setSaving(false);
        return;
      }

      // Check if new display name is available (if name changed)
      if (nameChanged) {
        const checkResponse = await fetch('/api/profile/check-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: trimmedName,
            currentUserId: user.id,
          }),
        });

        const checkData = await checkResponse.json();
        if (!checkResponse.ok || !checkData.available) {
          setMessage({ type: 'error', text: checkData.message || 'Display name is not available' });
          setSaving(false);
          return;
        }
      }

      // Keep auth metadata in sync with profile changes
      const authUpdate: { email?: string; data?: { name?: string; avatar?: string | null } } = {};
      if (emailChanged) authUpdate.email = trimmedEmail;
      if (nameChanged || avatarChanged) {
        authUpdate.data = {
          ...(nameChanged ? { name: trimmedName } : {}),
          ...(avatarChanged ? { avatar: trimmedAvatar || null } : {}),
        };
      }
      if (Object.keys(authUpdate).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdate);
        if (authError) throw authError;
      }

      // Update profiles table with all profile fields
      const updatePayload = {
        name: trimmedName,
        avatar: trimmedAvatar || null,
        background_image: trimmedBackground || null,
        about: trimmedAbout || null,
        ...(emailChanged ? { email: trimmedEmail } : {}),
      };
      console.log("[Settings] Updating profile with:", { userId: user.id, payload: updatePayload });
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (profileError) {
        console.error("[Settings] Profile update error:", profileError);
        throw profileError;
      }
      console.log("[Settings] Profile updated successfully");

      if (nameChanged && typeof window !== 'undefined') {
        localStorage.setItem(lastNameChangeKey, new Date().toISOString());
      }

      // Update localStorage
      try {
        const nameKey = nsKey("name");
        const avatarKey = nsKey("avatar_v1");
        const aboutKey = nsKey("about_v1");
        
        if (trimmedName) localStorage.setItem(nameKey, trimmedName);
        if (trimmedAvatar) localStorage.setItem(avatarKey, trimmedAvatar);
        else localStorage.removeItem(avatarKey);
        if (trimmedAbout) localStorage.setItem(aboutKey, trimmedAbout);
        else localStorage.removeItem(aboutKey);
        
        window.dispatchEvent(new Event("ms:profile"));
      } catch (e) {
        console.error('Failed to update localStorage:', e);
      }

      // Notify user about email verification if applicable
      if (emailChanged) {
        setMessage({ 
          type: 'success', 
          text: 'Profile updated! Check your new email for verification.' 
        });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }

      // Reset edit mode after successful save
      setEditingName(false);

      // Refresh user data from database
      const updatedUser = await getCurrentUser();
      setUser(updatedUser);
      // Only reset fields if update was successful - use updated user data
      if (updatedUser) {
        setName(updatedUser.name || "");
        setEmail(updatedUser.email || "");
      }
      window.dispatchEvent(new Event("ms:auth"));
    } catch (err) {
      // Keep the edited values on error - don't revert
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    if (!user) {
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          postcode: postcode.trim() || null,
          county: county.trim() || null,
          country: country.trim() || null
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Location updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update location' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    if (!user) {
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email_notifications: emailNotifications,
          message_notifications: messageNotifications,
          marketing_notifications: marketingNotifications,
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelNameEdit = () => {
    // Reset name to original user value
    setName(user?.name || "");
    setEditingName(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Enter your current password to change it' });
      setSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setSaving(false);
      return;
    }

    try {
      if (!user?.email) throw new Error('No email on file');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error('Current password is incorrect');

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "general" as Tab, label: "General", icon: User },
    { id: "security" as Tab, label: "Security", icon: Lock },
    { id: "compliance" as Tab, label: "Compliance", icon: ShieldCheck },
    { id: "location" as Tab, label: "Location", icon: MapPin },
    { id: "notifications" as Tab, label: "Notifications", icon: Bell },
    { id: "billing" as Tab, label: "Billing", icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your account preferences and security</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0">
            <nav className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMessage(null);
                      router.push(`/settings?tab=${tab.id}`);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-gray-100 last:border-b-0 ${
                      activeTab === tab.id
                        ? 'bg-gray-50 text-gray-900 border-l-4 border-l-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-l-transparent'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* General Tab */}
            {activeTab === "general" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">General Information</h2>
                
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Display Name
                      </label>
                      {!editingName && (
                        <button
                          type="button"
                          onClick={() => setEditingName(true)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Edit2 size={14} />
                          Change
                        </button>
                      )}
                    </div>
                    {editingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleCancelNameEdit}
                          className="px-3 py-2.5 text-gray-600 hover:text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                        {name}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      This is how your name appears on your profile. Changes allowed once every 6 months.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Changing your email requires verification
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Picture
                    </label>
                    <div className="flex items-start gap-4">
                      {avatar && (
                        <img 
                          src={avatar} 
                          alt="Avatar" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" 
                          onError={(e) => e.currentTarget.style.display = 'none'} 
                        />
                      )}
                      <div className="flex-1">
                        <input
                          type="url"
                          value={avatar}
                          onChange={(e) => setAvatar(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 mb-2"
                        />
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={uploading === 'avatar'}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <Upload size={16} />
                          {uploading === 'avatar' ? 'Uploading...' : 'Upload Image'}
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Max 5MB (JPEG, PNG, WebP)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      About / Bio
                    </label>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="Tell others about yourself..."
                      rows={4}
                      maxLength={500}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {about.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Background
                    </label>
                    {backgroundImage && (
                      <div className="mb-4 w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={backgroundImage} 
                          alt="Background" 
                          className="w-full h-full object-cover"
                          onError={(e) => e.currentTarget.style.display = 'none'} 
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="url"
                        value={backgroundImage}
                        onChange={(e) => setBackgroundImage(e.target.value)}
                        placeholder="https://example.com/background.jpg"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 mb-2"
                      />
                      <button
                        type="button"
                        onClick={() => backgroundInputRef.current?.click()}
                        disabled={uploading === 'background'}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <Upload size={16} />
                        {uploading === 'background' ? 'Uploading...' : 'Upload Image'}
                      </button>
                      <input
                        ref={backgroundInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBackgroundFileChange}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Max 5MB (JPEG, PNG, WebP). Recommended: 1920x400px
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                      placeholder="Enter current password"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Required to verify you before changing your password
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                      placeholder="Enter new password"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be at least 6 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                      placeholder="Confirm new password"
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Lock size={16} />
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {/* Compliance Tab */}
            {activeTab === "compliance" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Compliance & Verification</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Stay aligned with our verification requirements to keep your account in good standing.
                </p>

                {accountType === 'business' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Access the compliance center to submit KYB documentation, manage verifications, and review status updates.
                    </p>
                    <Link
                      href="/settings/business"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
                    >
                      <ShieldCheck size={16} />
                      Open seller verification
                    </Link>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">What you may need</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                        <li>Business identity documents (registration and director information)</li>
                        <li>Proof of address and banking details for payouts</li>
                        <li>Authorized representative contact details</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Identity verification</h3>
                      <p className="text-sm text-gray-700">
                        For individuals, we may request ID verification to protect buyers and sellers. Keep your profile details accurate to avoid disruptions.
                      </p>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                      <li>Ensure your legal name matches your ID</li>
                      <li>Keep contact and address information current</li>
                      <li>Respond promptly if we request verification</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Location Tab */}
            {activeTab === "location" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Location Information</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Your location helps buyers see distance to items. Only county and country are displayed publicly.
                </p>
                
                <form onSubmit={handleUpdateLocation} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                      placeholder="e.g., SW1A 1AA"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for calculating distances (not shown publicly)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        County
                      </label>
                      <input
                        type="text"
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        placeholder="e.g., Greater London"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g., United Kingdom"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Location'}
                  </button>
                </form>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Notification Preferences</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Manage how you receive notifications about activity on Motorsauce
                </p>
                
                <form onSubmit={handleUpdateNotifications} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Email notifications</h3>
                        <p className="text-xs text-gray-500 mt-1">Receive updates via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">New messages</h3>
                        <p className="text-xs text-gray-500 mt-1">Alert when you receive messages</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={messageNotifications}
                          onChange={(e) => setMessageNotifications(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Marketing updates</h3>
                        <p className="text-xs text-gray-500 mt-1">Receive news and offers</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={marketingNotifications}
                          onChange={(e) => setMarketingNotifications(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </form>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Billing & Payments</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Manage your payment methods and billing information
                </p>
                
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Methods</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    No payment methods saved yet
                  </p>
                  <button
                    disabled
                    className="px-6 py-2.5 bg-gray-100 text-gray-400 font-semibold rounded-lg cursor-not-allowed"
                  >
                    Add Payment Method (Coming Soon)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
