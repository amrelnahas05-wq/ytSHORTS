import { Link } from "wouter";
import { motion } from "framer-motion";

export default function LandingPage() {
  const titleWords = "Turn Your Videos into Viral Shorts".split(" ");

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-white pb-20">
      <section className="relative h-[90vh] md:h-[95vh] w-full p-4 md:p-6 flex flex-col justify-center items-center overflow-hidden">
        <div className="absolute inset-4 md:inset-6 rounded-3xl overflow-hidden ring-1 ring-white/10">
          <video
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/80" />
          <svg className="absolute inset-0 w-full h-full opacity-70 mix-blend-overlay pointer-events-none">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        </div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 mt-20">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] mb-8 flex flex-wrap justify-center gap-x-3 gap-y-2">
            {titleWords.map((word, i) => (
              <motion.span
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.2, 0.65, 0.3, 0.9] }}
              >
                {word === "Viral" ? (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary italic font-serif pr-2">{word}</span>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 font-light"
          >
            Upload your long-form content and let our AI automatically find the best hooks, reframe to 9:16, and add engaging captions in seconds.
          </motion.p>
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <Link href="/upload" className="inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(108,99,255,0.3)]">
              Start Converting
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Upload", desc: "Drop your horizontal MP4/MOV up to 2GB." },
            { step: "02", title: "Process", desc: "AI analyzes for the highest viral potential hooks." },
            { step: "03", title: "Download", desc: "Get perfect 9:16 clips ready for Shorts & Reels." },
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 -mt-8 -mr-8 text-9xl font-black text-white/5 group-hover:text-white/10 transition-colors font-serif">{item.step}</div>
              <h3 className="text-2xl font-bold mb-3 relative z-10">{item.title}</h3>
              <p className="text-gray-400 relative z-10">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
