import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { UploadCloud, FileVideo, Settings2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import type { JobInputPlatform, JobInputClipDuration } from "@workspace/api-client-react";

const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
const MAX_SIZE_MB = 2048;

export default function UploadPage() {
  const [, setLocation] = useLocation();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState<JobInputPlatform>("both");
  const [duration, setDuration] = useState<JobInputClipDuration>(30);
  const [autoCaptions, setAutoCaptions] = useState(true);

  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED.includes(f.type)) return `Unsupported format. Use MP4, MOV, AVI, MKV, or WebM.`;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `File too large. Maximum size is ${MAX_SIZE_MB} MB.`;
    return null;
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) { setError(err); return; }
    setError(null);
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const startUpload = () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
    formData.append("platform", platform);
    formData.append("clipDuration", String(duration));
    formData.append("autoCaptions", String(autoCaptions));

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 201) {
        const job = JSON.parse(xhr.responseText);
        setLocation(`/processing/${job.id}`);
      } else {
        let msg = "Upload failed. Please try again.";
        try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch {}
        setError(msg);
        setIsUploading(false);
      }
    });

    xhr.addEventListener("error", () => {
      setError("Network error. Check your connection and try again.");
      setIsUploading(false);
    });

    xhr.addEventListener("abort", () => {
      setIsUploading(false);
      setUploadProgress(0);
    });

    const apiBase = import.meta.env.VITE_API_URL ?? "";
    xhr.open("POST", `${apiBase}/api/upload`);
    xhr.send(formData);
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    setFile(null);
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-6 pb-20">
      <Navbar />
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-black tracking-tight mb-2">Upload Your Video</h1>
          <p className="text-gray-500">Drop in your long-form video and we'll cut it into vertical shorts automatically.</p>
        </motion.div>

        <div className="grid md:grid-cols-[2fr_1fr] gap-6">

          {/* Upload Zone */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-4"
          >
            {!isUploading ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                data-testid="upload-dropzone"
                className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all min-h-[320px]
                  ${isDragging ? "border-[#6C63FF] bg-[#6C63FF]/5" : "border-white/20 bg-white/5"}
                  ${file ? "border-[#FF6584]/50 bg-[#FF6584]/5" : ""}
                  ${error ? "border-red-500/50 bg-red-500/5" : ""}`}
              >
                {file ? (
                  <>
                    <FileVideo size={48} className="text-[#FF6584] mb-4" />
                    <p className="font-bold text-xl mb-1">{file.name}</p>
                    <p className="text-gray-400 text-sm mb-2">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    <p className="text-gray-500 text-xs mb-6">{file.type}</p>
                    <button
                      onClick={() => setFile(null)}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      data-testid="button-remove-file"
                    >
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <UploadCloud size={48} className="text-gray-500 mb-4" />
                    <p className="font-bold text-xl mb-2">Drag and drop your video</p>
                    <p className="text-gray-500 text-sm mb-2">MP4, MOV, WebM, AVI, MKV</p>
                    <p className="text-gray-600 text-xs mb-6">Maximum file size: 2 GB</p>
                    <label
                      className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full cursor-pointer transition-colors font-medium text-sm"
                      data-testid="label-browse-files"
                    >
                      Browse Files
                      <input
                        type="file"
                        className="hidden"
                        accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
                        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                        data-testid="input-file"
                      />
                    </label>
                  </>
                )}
              </div>
            ) : (
              <div className="border border-white/10 bg-white/5 rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[320px]">
                <UploadCloud size={40} className="text-[#6C63FF] mb-6 animate-bounce" />
                <p className="text-lg font-semibold mb-2">Uploading {file?.name}...</p>
                <p className="text-gray-500 text-sm mb-6">Hold tight — your video is on its way</p>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-[#6C63FF] font-mono text-sm font-bold mb-6">{uploadProgress}%</p>
                <button
                  onClick={cancelUpload}
                  className="text-sm text-gray-500 hover:text-red-400 transition-colors"
                  data-testid="button-cancel-upload"
                >
                  Cancel upload
                </button>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3"
              >
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Settings Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-6 text-gray-300">
              <Settings2 size={20} />
              <h2 className="text-lg font-bold">Conversion Settings</h2>
            </div>

            <div className="space-y-6 flex-grow">
              <div>
                <label className="block text-sm text-gray-400 mb-3">Target Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["shorts", "reels", "both"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      disabled={isUploading}
                      data-testid={`button-platform-${p}`}
                      className={`py-2 px-3 rounded-xl text-sm font-medium capitalize transition-colors disabled:opacity-40
                        ${platform === p ? "bg-[#6C63FF] text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-3">Clip Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {([15, 30, 60] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      disabled={isUploading}
                      data-testid={`button-duration-${d}`}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-40
                        ${duration === d ? "bg-[#FF6584] text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <p className="font-medium text-sm">AI Captions</p>
                  <p className="text-xs text-gray-500 mt-0.5">Auto-generate subtitles</p>
                </div>
                <button
                  onClick={() => setAutoCaptions(!autoCaptions)}
                  disabled={isUploading}
                  data-testid="toggle-auto-captions"
                  className={`w-12 h-6 rounded-full p-1 transition-colors disabled:opacity-40
                    ${autoCaptions ? "bg-[#6C63FF]" : "bg-white/20"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${autoCaptions ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="bg-white/5 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-400 mb-2">What happens next</p>
                <p>1. Video uploads to the server</p>
                <p>2. FFmpeg detects scene cuts</p>
                <p>3. Clips are cropped to 9:16 portrait</p>
                <p>4. MP4 files are ready to download</p>
              </div>
            </div>

            <button
              disabled={!file || isUploading}
              onClick={startUpload}
              data-testid="button-start-conversion"
              className="w-full mt-6 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white py-4 rounded-xl font-bold text-base hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? "Uploading..." : "Start Converting"}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
