"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser, type LocalUser, nsKey } from "@/lib/auth";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User, Mail, Lock, Save, Upload, MapPin, CreditCard, Bell } from "lucide-react";

type Tab = "general" | "security" | "location" | "notifications" | "billing";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'background' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [about, setAbout] = useState("");
  const [postcode, setPostcode] = useState("");
  const [county, setCounty] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // File input refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab && ["general", "security", "location", "notifications", "billing"].includes(tab)) {
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
        .select('avatar, background_image, about, postcode, county, country')
        .eq('id', currentUser.id)
        .single();
      
      if (profile) {
        setAvatar(profile.avatar || "");
        setBackgroundImage(profile.background_image || "");
        setAbout(profile.about || "");
        setPostcode(profile.postcode || "");
        setCounty(profile.county || "");
        setCountry(profile.country || "United Kingdom");
      }
      
      setLoading(false);
    };
    loadUser();
  }, [router, supabase]);

  const handleImageUpload = async (file: File, type: 'avatar' | 'background') => {
    setUploading(type);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/profile/upload-image', {
        method: 'POST',
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
      // Update profiles table with ALL fields including name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          name: name.trim(),
          email: email.trim(),
          avatar: avatar.trim() || null,
          background_image: backgroundImage.trim() || null,
          about: about.trim() || null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update localStorage
      try {
        const nameKey = nsKey("name");
        const avatarKey = nsKey("avatar_v1");
        const aboutKey = nsKey("about_v1");
        
        if (name.trim()) localStorage.setItem(nameKey, name.trim());
        if (avatar.trim()) localStorage.setItem(avatarKey, avatar.trim());
        else localStorage.removeItem(avatarKey);
        if (about.trim()) localStorage.setItem(aboutKey, about.trim());
        else localStorage.removeItem(aboutKey);
        
        window.dispatchEvent(new Event("ms:profile"));
      } catch (e) {
        console.error('Failed to update localStorage:', e);
      }

      // Update auth email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim()
        });
        if (emailError) throw emailError;
        setMessage({ 
          type: 'success', 
          text: 'Profile updated! Check your new email for verification.' 
        });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }

      // Refresh user data
      const updatedUser = await getCurrentUser();
      setUser(updatedUser);
      setName(updatedUser?.name || "");
      setEmail(updatedUser?.email || "");
      window.dispatchEvent(new Event("ms:auth"));
    } catch (err) {
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

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
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is how your name appears on your profile
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
                    disabled={saving || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Lock size={16} />
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
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
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Email notifications</h3>
                      <p className="text-xs text-gray-500 mt-1">Receive updates via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">New messages</h3>
                      <p className="text-xs text-gray-500 mt-1">Alert when you receive messages</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Marketing updates</h3>
                      <p className="text-xs text-gray-500 mt-1">Receive news and offers</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                    </label>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-6 p-3 bg-gray-50 rounded-lg">
                  Note: Notification preferences will be saved automatically in a future update.
                </p>
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
