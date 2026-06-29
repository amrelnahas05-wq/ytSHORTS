import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, AlertCircle, UploadCloud, Search, Scissors, Video, Trash2 } from "lucide-react";
import { useGetJob, useDeleteJob, getGetJobQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";

const STEPS = [
  { id: "uploading", label: "Uploading", icon: UploadCloud },
  { id: "analyzing", label: "Analyzing Video", icon: Search },
  { id: "clipping", label: "Extracting Clips", icon: Scissors },
  { id: "rendering", label: "Rendering & Captions", icon: Video },
  { id: "ready", label: "Ready", icon: CheckCircle2 },
];

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isDeleting, setIsDeleting] = useState(false);

  const jobId = parseInt(id || "0", 10);

  const { data: job, isLoading, error } = useGetJob(jobId, {
    query: {
      enabled: !!jobId,
      queryKey: getGetJobQueryKey(jobId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (!status || status === "ready" || status === "failed" || status === "cancelled") {
          return false;
        }
        return 2000;
      }
    }
  });

  const deleteJob = useDeleteJob();

  useEffect(() => {
    if (job?.status === "ready") {
      const timeout = setTimeout(() => {
        setLocation(`/results/${jobId}`);
      }, 1500);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [job?.status, jobId, setLocation]);

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this job?")) {
      setIsDeleting(true);
      deleteJob.mutate(
        { id: jobId },
        {
          onSuccess: () => {
            setLocation("/dashboard");
          },
          onError: () => {
            setIsDeleting(false);
          }
        }
      );
    }
  };

  if (isLoading || !job) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
        <p className="text-gray-400">Loading job details...</p>
      </div>
    );
  }

  if (error || job.status === "failed") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Navbar />
        <AlertCircle className="text-destructive w-16 h-16 mb-6" />
        <h1 className="text-3xl font-bold mb-4">Processing Failed</h1>
        <p className="text-gray-400 max-w-md mb-8">{job.errorMessage || "An unknown error occurred during processing."}</p>
        <button 
          onClick={() => setLocation("/upload")}
          className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === job.status);
  const activeIndex = currentStepIndex === -1 ? (job.status === 'pending' ? 0 : 4) : currentStepIndex;

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-6 pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto mt-12">
        <div className="text-center mb-16">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-4 bg-primary/10 rounded-full mb-6"
          >
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </motion.div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Creating Magic</h1>
          <p className="text-gray-400 font-mono">
            {job.estimatedSecondsRemaining 
              ? `Estimated time remaining: ${Math.floor(job.estimatedSecondsRemaining / 60)}m ${job.estimatedSecondsRemaining % 60}s`
              : "Calculating time remaining..."}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 mb-8 relative overflow-hidden">
          {/* Progress Bar Background */}
          <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${job.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="relative z-10 flex flex-col gap-8">
            {STEPS.map((step, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500
                    ${isActive ? 'border-primary bg-primary/20 text-primary' : 
                      isPast ? 'border-secondary bg-secondary/20 text-secondary' : 
                      'border-white/10 bg-white/5 text-gray-500'}`}
                  >
                    {isPast ? <CheckCircle2 className="w-6 h-6" /> : <StepIcon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />}
                  </div>
                  
                  <div className="flex-grow">
                    <h3 className={`text-xl font-bold transition-colors ${isActive || isPast ? 'text-white' : 'text-gray-500'}`}>
                      {step.label}
                    </h3>
                    {isActive && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-primary text-sm font-mono mt-1"
                      >
                        {job.progress}% Complete
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handleCancel}
            disabled={isDeleting || job.status === "ready"}
            className="flex items-center gap-2 text-gray-500 hover:text-destructive transition-colors disabled:opacity-50 font-medium"
          >
            <XCircle size={18} />
            Cancel Job
          </button>
        </div>
      </div>
    </div>
  );
}
