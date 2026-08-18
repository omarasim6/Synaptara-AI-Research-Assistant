"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { authApi } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";
import { useAvatar } from "@/providers/AvatarProvider";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — generous cap on the *original* file before compression
const OUTPUT_SIZE = 256; // px, square — plenty for every avatar spot in the app
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Resizes/crops an image file to a square OUTPUT_SIZE JPEG and returns it as
 * a compressed base64 data URL, so we never send or store a huge unoptimized
 * image — just a small thumbnail-sized one.
 */
function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = document.createElement("img");
      img.onerror = () => reject(new Error("That file doesn't look like a valid image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Couldn't process that image."));

        // Center-crop to a square before scaling down, so the avatar isn't stretched.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AvatarUploader({
  token,
  currentImage,
  fallbackLetter,
}: {
  token: string;
  currentImage: string | null | undefined;
  fallbackLetter: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const toast = useToast();
  const { refreshAvatar } = useAvatar();

  const displayImage = previewUrl ?? currentImage ?? null;

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPEG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("That image is too large. Please choose one under 8MB.");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await compressToDataUrl(file);
      setPreviewUrl(dataUrl); // show immediately while saving
      // Saved straight to the backend (users.avatar_url) — never through the
      // NextAuth session cookie, which is far too small for image bytes.
      await authApi.updateProfile(token, { avatar_url: dataUrl });
      // Tell every other avatar in the app (navbar, dropdown, etc.) to
      // refetch from the backend now that it's been saved.
      await refreshAvatar();
      toast.success("Profile picture updated ✓");
    } catch (err) {
      setPreviewUrl(null); // revert the optimistic preview — the upload failed
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg.includes("too large") ? msg : "Couldn't update your profile picture");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 flex-shrink-0">
        {displayImage ? (
          <Image
            src={displayImage}
            alt="Your profile picture"
            width={64}
            height={64}
            unoptimized
            className="w-16 h-16 rounded-full object-cover border border-[#e4e0d4] dark:border-dark-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#1a3a35] dark:bg-dark-surface-2 flex items-center justify-center text-[#EDEADE] dark:text-dark-text text-2xl font-semibold">
            {fallbackLetter}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text bg-[#f5f3ee] dark:bg-dark-surface-2 border border-[#e4e0d4] dark:border-dark-border px-3.5 py-2 rounded-xl hover:bg-[#ece9e2] dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit"
        >
          {uploading ? "Uploading…" : displayImage ? "Change photo" : "Upload photo"}
        </button>
        <p className="text-xs text-[#a09c8e] dark:text-[#7d9691]">PNG, JPEG, WEBP, or GIF — under 8MB.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChosen}
        className="hidden"
        aria-label="Upload profile picture"
      />
    </div>
  );
}
