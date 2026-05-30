import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownToLine, ChevronLeft, Chrome, Compass, Download, Info, Monitor, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function AppDomain() {
  const [, setLocation] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "unknown">("android");
  const [isIosChrome, setIsIosChrome] = useState(false);

  useEffect(() => {
    // 1. Detect platform
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
      setIsIosChrome(/crios/.test(ua));
    } else if (/android/.test(ua)) {
      setPlatform("android");
    } else if (/macintosh|windows|linux/.test(ua) && !("ontouchstart" in window)) {
      setPlatform("desktop");
    } else {
      setPlatform("unknown");
    }

    // 2. Detect if already installed (standalone mode)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    // 3. Listen for native browser install prompt (Chrome/Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const [showIosGuide, setShowIosGuide] = useState(false);

  const openInSafari = () => {
    const url = window.location.href;
    window.location.href = url.replace(/^https:\/\//, "x-safari-https://").replace(/^http:\/\//, "x-safari-http://");
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native browser install prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else if (platform === "ios") {
      // For iOS, open our premium custom bottom drawer guide that simulates the native experience
      setShowIosGuide(true);
    } else {
      // If prompt isn't available, scroll down to manual instructions
      const el = document.getElementById("manual-instructions");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070707] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#c4b396]/30 selection:text-[#c4b396]">
      {/* Decorative Luxury Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#c4b396]/10 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-4 flex items-center justify-between border-b border-[#c4b396]/10 bg-[#070707]/80 backdrop-blur-md">
        <button 
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-xs text-[#8E9CAE] hover:text-[#c4b396] transition-all cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" /> Home
        </button>
        <div className="flex items-center gap-1.5">
          <img 
            src="https://brokenscience.org/wp-content/uploads/2026/02/bronze-logo-2x.png" 
            alt="MetFix Logo" 
            className="h-5 w-5 object-contain"
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396] font-serif-luxury">Miami 2026</span>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 flex-1 px-4 py-8 max-w-md mx-auto w-full flex flex-col justify-center space-y-8">
        
        {/* Branding & App Logo */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="absolute -inset-1 rounded-full bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-[#c4b396]/40 via-transparent to-transparent blur-md opacity-70 animate-pulse" />
            <div className="h-20 w-20 bg-gradient-to-b from-[#121214] to-[#070707] rounded-3xl border border-[#c4b396]/20 p-4 flex items-center justify-center mx-auto shadow-2xl relative">
              <img 
                src="https://brokenscience.org/wp-content/uploads/2026/02/bronze-logo-2x.png" 
                alt="Unbreakable Summit Logo" 
                className="h-full w-full object-contain"
              />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase tracking-wider text-white font-serif-luxury">
              Unbreakable App
            </h1>
            <p className="text-xs text-[#8E9CAE] max-w-[280px] mx-auto leading-relaxed">
              Install the official **Unbreakable Health Summit PWA** on your phone for offline schedules, live badge scanning, and instant updates.
            </p>
          </div>
        </div>

        {/* Primary Action Card */}
        <Card className="border-[#c4b396]/20 bg-[#121214] shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 h-12 w-12 bg-[#c4b396]/5 rounded-bl-full pointer-events-none" />
          
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#c4b396] flex items-center justify-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#c4b396]" /> Install Now
            </CardTitle>
            <CardDescription className="text-[10px] text-[#8E9CAE]">
              Add to your home screen to launch full-screen, just like a native app.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isInstalled ? (
              <div className="text-center p-4 bg-[#c4b396]/5 rounded-xl border border-[#c4b396]/20 space-y-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#c4b396]/20 text-[#c4b396]">
                  ✓
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">App Installed Successfully</h3>
                <p className="text-[10px] text-[#8E9CAE]">
                  You can now launch the app directly from your home screen anytime, even offline!
                </p>
                <Button 
                  onClick={() => setLocation("/")}
                  className="w-full bg-[#c4b396] hover:bg-[#b0a184] text-[#070707] text-xs font-bold uppercase tracking-wider mt-2"
                >
                  Open Web Version
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {isIosChrome ? (
                  <div className="space-y-3">
                    <div className="text-center p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 space-y-1">
                      <p className="text-[10px] text-[#8E9CAE]">
                        iOS apps can only be installed from <span className="text-white font-semibold">Safari</span>. Chrome cannot add PWAs to your Home Screen.
                      </p>
                    </div>
                    <Button
                      onClick={openInSafari}
                      className="w-full bg-[#c4b396] hover:bg-[#b0a184] text-[#070707] h-12 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#c4b396]/10 cursor-pointer animate-fade-in"
                    >
                      <Compass className="h-4 w-4" /> Open in Safari
                    </Button>
                    <Button
                      onClick={handleInstallClick}
                      variant="outline"
                      className="w-full border-neutral-800 bg-neutral-900 hover:border-[#c4b396]/30 text-white h-10 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                    >
                      View Safari Install Steps
                    </Button>
                  </div>
                ) : (isInstallable || platform === "ios") ? (
                  <Button 
                    onClick={handleInstallClick}
                    className="w-full bg-[#c4b396] hover:bg-[#b0a184] text-[#070707] h-12 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#c4b396]/10 cursor-pointer animate-fade-in"
                  >
                    <Download className="h-4 w-4 animate-bounce" /> Install App
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      const el = document.getElementById("manual-instructions");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 hover:border-[#c4b396]/30 text-white h-12 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowDownToLine className="h-4 w-4" /> View Install Guide
                  </Button>
                )}

                <div className="flex items-center justify-center gap-1 text-[9px] text-[#8E9CAE]/80">
                  <Info className="h-3 w-3 text-[#c4b396]/80" />
                  <span>No App Store or Play Store account required.</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform-Specific Instructions Section */}
        <div id="manual-instructions" className="space-y-4 pt-4">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#c4b396]">How to Install Manually</h2>
            <p className="text-[10px] text-[#8E9CAE]">Follow these quick instructions for your specific browser.</p>
          </div>

          {/* iOS Safari Instructions */}
          {(platform === "ios" || platform === "unknown") && (
            <Card className="border-neutral-800/80 bg-[#121214]/60">
              <CardHeader className="pb-2 flex flex-row items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-xs font-bold text-white uppercase tracking-wider">iOS (Safari Browser)</CardTitle>
                  <CardDescription className="text-[9px] text-[#8E9CAE]">Required browser for iOS installations</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-[#8E9CAE] space-y-3 pt-2">
                <ol className="list-decimal list-inside space-y-2.5 pl-1">
                  <li>
                    Open <span className="text-white font-semibold">Safari</span> and navigate to this summit app.
                  </li>
                  <li>
                    Tap the <span className="text-white font-semibold">three dots (•••)</span> button in the Safari bottom toolbar.
                  </li>
                  <li>
                    Tap the <span className="text-[#c4b396] font-semibold inline-flex items-center gap-0.5">Share icon <span className="text-lg leading-none">⎋</span></span> in the menu that appears.
                  </li>
                  <li>
                    Scroll down and select <span className="text-white font-semibold">"Add to Home Screen"</span>.
                  </li>
                  <li>
                    Tap <span className="text-[#c4b396] font-semibold">"Add"</span> in the top-right corner to complete!
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Android Chrome Instructions */}
          {(platform === "android" || platform === "unknown") && (
            <Card className="border-neutral-800/80 bg-[#121214]/60">
              <CardHeader className="pb-2 flex flex-row items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-400 rounded-lg">
                  <Chrome className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-xs font-bold text-white uppercase tracking-wider">Android (Chrome Browser)</CardTitle>
                  <CardDescription className="text-[9px] text-[#8E9CAE]">Recommended browser for Android</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-[#8E9CAE] space-y-3 pt-2">
                <ol className="list-decimal list-inside space-y-2.5 pl-1">
                  <li>
                    Open <span className="text-white font-semibold">Chrome</span> and navigate to this summit app.
                  </li>
                  <li>
                    Tap the <span className="text-white font-semibold">Menu icon (three vertical dots)</span> in the top-right corner.
                  </li>
                  <li>
                    Select <span className="text-white font-semibold">"Add to Home screen"</span> or <span className="text-white font-semibold">"Install app"</span>.
                  </li>
                  <li>
                    Confirm by clicking <span className="text-[#c4b396] font-semibold">"Install"</span> in the browser prompt.
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Desktop Chrome / Safari Instructions */}
          {(platform === "desktop") && (
            <Card className="border-neutral-800/80 bg-[#121214]/60">
              <CardHeader className="pb-2 flex flex-row items-center gap-3">
                <div className="p-2 bg-neutral-800 text-[#c4b396] rounded-lg">
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-xs font-bold text-white uppercase tracking-wider">Desktop (Chrome / Edge / Safari)</CardTitle>
                  <CardDescription className="text-[9px] text-[#8E9CAE]">Install as a lightweight desktop app</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-[#8E9CAE] space-y-3 pt-2">
                <ol className="list-decimal list-inside space-y-2.5 pl-1">
                  <li>
                    Look at the right side of the URL search bar at the top of your browser.
                  </li>
                  <li>
                    Click the <span className="text-white font-semibold">Install icon (a computer with a down arrow)</span>.
                  </li>
                  <li>
                    Confirm by clicking <span className="text-[#c4b396] font-semibold">"Install"</span> in the pop-up prompt.
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center pt-4">
          <p className="text-[9px] text-[#8E9CAE]/60 uppercase tracking-widest">
            Unbreakable Health Summit © 2026
          </p>
        </div>

      </main>

      {/* Premium iOS Install Guide Drawer/Overlay */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={() => setShowIosGuide(false)}>
          <div 
            className="bg-[#121214] border-t border-[#c4b396]/20 rounded-t-3xl w-full max-w-md p-6 pb-8 space-y-6 animate-slide-up relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle Bar */}
            <div className="w-12 h-1 bg-neutral-800 rounded-full mx-auto" />

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#c4b396]">Install on iOS</h3>
              <p className="text-[10px] text-[#8E9CAE]">
                {isIosChrome
                  ? "Switch to Safari first — iOS only allows Home Screen installs from Safari."
                  : "Add the Unbreakable App to your Home Screen in 4 quick taps."}
              </p>
            </div>

            {isIosChrome && (
              <Button
                onClick={openInSafari}
                className="w-full bg-[#c4b396] hover:bg-[#b0a184] text-[#070707] text-xs font-bold uppercase tracking-wider h-11 rounded-xl flex items-center justify-center gap-2"
              >
                <Compass className="h-4 w-4" /> Open in Safari
              </Button>
            )}

            {/* Visual Steps */}
            <div className="space-y-4 text-xs text-[#8E9CAE]">
              <div className="flex items-center gap-4 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/60">
                <div className="h-8 w-8 rounded-full bg-[#c4b396]/10 border border-[#c4b396]/20 flex items-center justify-center font-bold text-[#c4b396]">1</div>
                <div className="flex-1">
                  Tap the <span className="text-white font-semibold">three dots (•••)</span> button in the Safari bottom toolbar.
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                    <span className="text-sm text-[#c4b396] font-bold tracking-widest">•••</span> (More menu)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/60">
                <div className="h-8 w-8 rounded-full bg-[#c4b396]/10 border border-[#c4b396]/20 flex items-center justify-center font-bold text-[#c4b396]">2</div>
                <div className="flex-1">
                  Tap the <span className="text-white font-semibold">Share button</span> in the menu that appears.
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                    <span className="text-lg text-[#c4b396]">⎋</span> (Box with an up arrow)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/60">
                <div className="h-8 w-8 rounded-full bg-[#c4b396]/10 border border-[#c4b396]/20 flex items-center justify-center font-bold text-[#c4b396]">3</div>
                <div className="flex-1">
                  Scroll down the share menu and select <span className="text-white font-semibold">"Add to Home Screen"</span>.
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                    <span className="text-sm text-[#c4b396] font-bold">＋</span> (Plus icon)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/60">
                <div className="h-8 w-8 rounded-full bg-[#c4b396]/10 border border-[#c4b396]/20 flex items-center justify-center font-bold text-[#c4b396]">4</div>
                <div className="flex-1">
                  Tap <span className="text-white font-semibold">"Add"</span> in the top-right corner to complete.
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setShowIosGuide(false)}
              className="w-full bg-neutral-900 border border-neutral-800 hover:border-[#c4b396]/30 text-white text-xs font-bold uppercase tracking-wider h-11 rounded-xl"
            >
              Got It
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
