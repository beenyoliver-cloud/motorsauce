"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type LocalUser, nsKey } from "@/lib/auth";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User, Mail, Lock, Save, Upload, Image as ImageIcon } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // File input refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

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
      
      // Load profile data (avatar, background, and about)
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar, background_image, about')
        .eq('id', currentUser.id)
        .single();
      
      if (profile) {
        setAvatar(profile.avatar || "");
        setBackgroundImage(profile.background_image || "");
        setAbout(profile.about || "");
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

      // Update local state
      if (type === 'avatar') {
        setAvatar(data.url);
        // Update localStorage for EditableAvatar component
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
      
      // Refresh user data
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
      // Update name, email, avatar, background, and about in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          name: name.trim(), 
          email: email.trim(),
          avatar: avatar.trim() || null,
          background_image: backgroundImage.trim() || null,
          about: about.trim() || null
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update localStorage for profile components  
      try {
        const avatarKey = nsKey("avatar_v1");
        const aboutKey = nsKey("about_v1");
        if (avatar.trim()) {
          localStorage.setItem(avatarKey, avatar.trim());
        } else {
          localStorage.removeItem(avatarKey);
        }
        if (about.trim()) {
          localStorage.setItem(aboutKey, about.trim());
        } else {
          localStorage.removeItem(aboutKey);
        }
        window.dispatchEvent(new Event("ms:profile"));
      } catch (e) {
        console.error('Failed to update localStorage:', e);
      }

      // Update auth email if changed (may require verification)
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center px-4 py-10">
      <h1 className="text-3xl font-bold text-black mb-2">Account Settings</h1>
      <p className="text-gray-600 mb-8">Manage your account information and security</p>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Settings */}
  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
          <User size={20} className="text-yellow-600" />
          Profile Information
        </h2>
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail size={16} />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Changing your email will require verification
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
                  alt="Avatar preview" 
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700 mb-2"
                />
                <div className="flex gap-2">
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
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Upload an image or paste a URL. Max 5MB (JPEG, PNG, WebP)
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Background / Banner
            </label>
            <div className="space-y-2">
              {backgroundImage && (
                <img 
                  src={backgroundImage} 
                  alt="Background preview" 
                  className="w-full h-32 rounded-lg object-cover border-2 border-gray-200" 
                  onError={(e) => e.currentTarget.style.display = 'none'} 
                />
              )}
              <input
                type="url"
                value={backgroundImage}
                onChange={(e) => setBackgroundImage(e.target.value)}
                placeholder="https://example.com/background.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => backgroundInputRef.current?.click()}
                  disabled={uploading === 'background'}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ImageIcon size={16} />
                  {uploading === 'background' ? 'Uploading...' : 'Upload Banner'}
                </button>
                <input
                  ref={backgroundInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleBackgroundFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500">
                Upload an image or paste a URL. Recommended: 1200x300px. Max 5MB
              </p>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {about.length}/500 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password Settings */}
  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-black mb-4 flex items-center gap-2">
          <Lock size={20} className="text-yellow-600" />
          Change Password
        </h2>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700 placeholder:text-gray-400"
              placeholder="Enter new password"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700 placeholder:text-gray-400"
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Lock size={16} />
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
