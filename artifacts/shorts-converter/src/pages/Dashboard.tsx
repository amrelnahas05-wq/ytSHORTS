import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { 
  BarChart3, Video, Clock, Scissors, Plus, Trash2, 
  ChevronRight, PlayCircle, Loader2, AlertCircle
} from "lucide-react";
import { useGetStats, useListJobs, useDeleteJob, getGetStatsQueryKey, getListJobsQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: stats } = useGetStats({ query: { queryKey: getGetStatsQueryKey() } });
  const { data: jobs, isLoading } = useListJobs({ query: { queryKey: getListJobsQueryKey() } });
  const deleteJob = useDeleteJob();

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this job and all its clips?")) {
      deleteJob.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          }
        }
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'cancelled': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-primary bg-primary/10 border-primary/20 animate-pulse';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-6 pb-20">
      <Navbar />
      
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
          <Link href="/upload" className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors">
            <Plus size={16} />
            New Project
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Total Projects", value: stats?.totalJobs || 0, icon: Video, color: "text-blue-400" },
            { label: "Clips Generated", value: stats?.totalClipsGenerated || 0, icon: Scissors, color: "text-secondary" },
            { label: "Processing", value: stats?.processingJobs || 0, icon: Loader2, color: "text-primary" },
            { label: "Minutes Analyzed", value: Math.round(stats?.totalVideoMinutesProcessed || 0), icon: Clock, color: "text-green-400" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 bg-white/5 rounded-lg ${stat.color}`}>
                  <stat.icon size={18} className={stat.label === "Processing" && stat.value > 0 ? "animate-spin" : ""} />
                </div>
                <span className="text-sm font-medium text-gray-400">{stat.label}</span>
              </div>
              <span className="text-3xl font-black">{stat.value}</span>
            </motion.div>
          ))}
        </div>

        {/* History */}
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          Recent Activity
        </h2>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : jobs?.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
            <PlayCircle size={64} className="text-gray-600 mb-6" />
            <h3 className="text-2xl font-bold mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-8 max-w-md">Your uploaded videos and generated clips will appear here. Start your first project now.</p>
            <Link href="/upload" className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Create First Project
            </Link>
          </div>
        ) : (
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white/5 text-gray-400 font-medium">
                  <tr>
                    <th className="px-6 py-4">Project Title</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Platform</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {jobs?.map((job) => (
                    <tr 
                      key={job.id} 
                      onClick={() => setLocation(job.status === 'ready' ? `/results/${job.id}` : `/processing/${job.id}`)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-bold">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                            <Video size={18} />
                          </div>
                          <span className="truncate max-w-[200px]">{job.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusColor(job.status)}`}>
                          {job.status === 'pending' || job.status === 'uploading' || job.status === 'analyzing' || job.status === 'clipping' || job.status === 'rendering' 
                            ? `${job.status} ${job.progress}%` 
                            : job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 bg-white/5 px-2 py-1 rounded-md text-xs uppercase font-medium">
                          {job.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {format(new Date(job.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleDelete(job.id, e)}
                            className="p-2 text-gray-500 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-black transition-colors">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
