import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Download, Share2, Play, Flame, RefreshCcw, Trash2, ArrowLeft } from "lucide-react";
import { useGetJob, useGetJobClips, useDeleteClip, getGetJobQueryKey, getGetJobClipsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { format } from "date-fns";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const jobId = parseInt(id || "0", 10);
  const { data: job } = useGetJob(jobId, { query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId) } });
  const { data: clips, isLoading } = useGetJobClips(jobId, { query: { enabled: !!jobId, queryKey: getGetJobClipsQueryKey(jobId) } });
  
  const deleteClip = useDeleteClip();

  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteClip = (clipId: number) => {
    if (confirm("Delete this clip?")) {
      deleteClip.mutate(
        { clipId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetJobClipsQueryKey(jobId) });
          }
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-6 pb-20">
      <Navbar />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button 
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Generated Shorts</h1>
            <p className="text-gray-400 text-lg">
              {job?.title} • {clips?.length || 0} clips ready
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap gap-3"
          >
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-medium transition-colors"
            >
              <Share2 size={18} />
              {copied ? "Copied!" : "Share"}
            </button>
            <button 
              onClick={() => setLocation("/upload")}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-medium transition-colors"
            >
              <RefreshCcw size={18} />
              New Job
            </button>
            <button className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
              <Download size={18} />
              Download All (ZIP)
            </button>
          </motion.div>
        </div>

        {clips?.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
            <p className="text-xl text-gray-400">No clips generated.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clips?.map((clip, i) => (
              <motion.div
                key={clip.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden group hover:border-primary/50 transition-colors flex flex-col"
              >
                <div className="relative aspect-[9/16] bg-black border-b border-white/10 flex items-center justify-center overflow-hidden">
                  {clip.thumbnailUrl ? (
                    <img src={clip.thumbnailUrl} alt={clip.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="text-white/20 group-hover:text-white/40 transition-colors">
                      <Play size={48} />
                    </div>
                  )}
                  
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <span className="bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20">
                      {clip.durationSeconds}s
                    </span>
                    <span className="bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 uppercase">
                      {clip.platform}
                    </span>
                  </div>

                  {clip.viralScore != null && (
                    <div className="absolute bottom-4 left-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                      <Flame size={14} />
                      Score {clip.viralScore}
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="font-bold text-lg mb-1 truncate">{clip.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
                    {clip.sceneLabel || "No description generated"}
                  </p>
                  
                  <div className="mt-auto flex gap-2">
                    <button className="flex-1 bg-white text-black py-2.5 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                      <Download size={16} />
                      Save
                    </button>
                    <button 
                      onClick={() => handleDeleteClip(clip.id)}
                      className="w-10 bg-white/5 hover:bg-destructive/20 hover:text-destructive text-gray-400 rounded-lg flex items-center justify-center transition-colors border border-white/5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
