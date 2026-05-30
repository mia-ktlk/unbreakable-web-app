import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { 
  Home as HomeIcon, 
  QrCode, 
  Calendar, 
  Award, 
  Store, 
  Users, 
  Bookmark, 
  Sparkles,
  Info,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  Plus,
  Trash2,
  FileDown,
  Search,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Instagram,
  Facebook,
  Linkedin,
  MessageSquare,
  History as HistoryIcon,
  Mic,
  LogIn,
  User,
  LogOut,
  Pencil,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Html5Qrcode } from "html5-qrcode";
import { useRef } from "react";

// Import types
import { Member, Speaker, Session, DaySchedule, Sponsor, Exhibitor, ScanRecord } from "../types";
import { cn, publicUrl } from "@/lib/utils";
import {
  DAY_TO_DATE,
  buildEasternTestDateTime,
  formatScheduleNowDisplay,
  getLiveEventDay,
  getScheduleNow,
  isScheduleTestMode,
  parseEasternTestDateTime,
  getSessionStatus,
  isDayLive,
  parseTimeTo24h,
  setScheduleTestNow,
  SCHEDULE_TEST_NOW_DEFAULT,
} from "@/lib/scheduleTime";

const SCHEDULE_TEST_STORAGE_KEY = "metfix_schedule_test_now";

function loadInitialScheduleTest(): string | null {
  try {
    const saved = localStorage.getItem(SCHEDULE_TEST_STORAGE_KEY);
    if (saved) return saved;
  } catch {
    // ignore storage errors (SSR / private mode)
  }
  return SCHEDULE_TEST_NOW_DEFAULT;
}

const initialScheduleTestIso = loadInitialScheduleTest();
if (initialScheduleTestIso) {
  setScheduleTestNow(initialScheduleTestIso);
}
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  applyProfileOverride,
  fetchProfileOverrides,
  mergeMembersWithOverrides,
  updateProfile,
  uploadProfilePhoto,
} from "@/lib/profiles";
import { hasContactDetails, MemberSocialLinks } from "@/components/MemberSocialLinks";
import { MemberAvatar } from "@/components/MemberAvatar";
import {
  loadAndMergeUserSavedData,
  saveUserSavedData,
  UserSavedData,
  writeLocalUserSavedData,
} from "@/lib/userData";

const speakerPlaceholderUrl = (name = "Speaker") =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=121214&textColor=D4AF37`;

// Temporary cutoff for day recap buttons — update before launch
const DAY_RECAP_CUTOFF = new Date("2026-05-30");

function isAfterDayRecapCutoff(): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(DAY_RECAP_CUTOFF);
  cutoff.setHours(0, 0, 0, 0);
  return today > cutoff;
}

const SCHEDULE_TRACKS = [
  "Science & Medicine",
  "Clinical Practice",
  "Fitness",
  "Wellness",
  "Networking",
];

export default function Home() {
  const params = useParams<{ tab?: string; id?: string }>();
  const [location, setLocation] = useLocation();
  
  // Parse query params to find the 'from' tabbb
  const queryParams = new URLSearchParams(window.location.search);
  const fromTab = queryParams.get("from") || "speakers";
  
  // Detect if we are on a speaker detail path
  const isSpeakerDetailRoute = location.startsWith("/speaker/");
  const speakerIdFromUrl = isSpeakerDetailRoute ? params.id : null;
  
  const currentTab = isSpeakerDetailRoute ? fromTab : (params.tab || "home");

  // Helper to navigate to a speaker detail view while preserving the origin tab
  const navigateToSpeaker = (speakerId: string) => {
    // Pass currentTab as a query param so the back button knows exactly where we came from
    setLocation(`/speaker/${speakerId}?from=${currentTab}`);
  };

  // Data states
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Local storage states
  const [savedScans, setSavedScans] = useState<ScanRecord[]>([]);
  const [favoriteSpeakers, setFavoriteSpeakers] = useState<string[]>([]);
  const [favoriteSessions, setFavoriteSessions] = useState<string[]>([]);
  const [favoriteSponsors, setFavoriteSponsors] = useState<string[]>([]);
  const [favoriteExhibitors, setFavoriteExhibitors] = useState<string[]>([]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("All");
  const [selectedDay, setSelectedDay] = useState(1);
  const [now, setNow] = useState(() => getScheduleNow());
  const [scheduleTestEnabled, setScheduleTestEnabled] = useState(() => initialScheduleTestIso !== null);
  const [scheduleTestDate, setScheduleTestDate] = useState(() =>
    initialScheduleTestIso
      ? parseEasternTestDateTime(initialScheduleTestIso).date
      : DAY_TO_DATE[1]
  );
  const [scheduleTestTime, setScheduleTestTime] = useState(() =>
    initialScheduleTestIso
      ? parseEasternTestDateTime(initialScheduleTestIso).time
      : "09:30"
  );
  const [selectedSponsorTier, setSelectedSponsorTier] = useState("All");

  // Scanner states
  const [scannedId, setScannedId] = useState("");
  const [showScanResult, setShowScanResult] = useState(false);
  const [scannedMember, setScannedIdMember] = useState<Member | null>(null);
  const [manualQrInput, setManualQrInput] = useState("");

  // Auth states
  const [loggedInUser, setLoggedInUser] = useState<Member | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: "",
    phone: "",
    website: "",
    company: "",
    role: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    bio: "",
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoRemoved, setProfilePhotoRemoved] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Login scanner states
  const loginQrScannerRef = useRef<Html5Qrcode | null>(null);
  const [isLoginCameraScanning, setIsLoginCameraScanning] = useState(false);
  const [loginCameraError, setLoginCameraError] = useState<string | null>(null);
  const [loginManualQrInput, setLoginManualQrInput] = useState("");
  
  // Camera Scanner ref and active state
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Modal Detail states
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [selectedScanDetail, setSelectedScanDetail] = useState<ScanRecord | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<Member | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const cloudSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load static JSON data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [resSpeakers, resSchedule, resSponsors, resExhibitors, resMembers] = await Promise.all([
          fetch(publicUrl("data/speakers.json")).then(r => r.json()),
          fetch(publicUrl("data/schedule.json")).then(r => r.json()),
          fetch(publicUrl("data/sponsors.json")).then(r => r.json()),
          fetch(publicUrl("data/exhibitors.json")).then(r => r.json()),
          fetch(publicUrl("data/members.json")).then(r => r.json())
        ]);

        let mergedMembers: Member[] = resMembers;
        let mergedSpeakers: Speaker[] = resSpeakers;

        if (isSupabaseConfigured()) {
          try {
            const overrides = await fetchProfileOverrides();
            mergedMembers = mergeMembersWithOverrides(resMembers, overrides);
            mergedSpeakers = mergeMembersWithOverrides(resSpeakers, overrides);
          } catch (overrideError) {
            console.warn("Profile overrides unavailable, using static data only.", overrideError);
          }
        }
        
        setSpeakers(mergedSpeakers);
        setSchedule(resSchedule.days);
        setSponsors(resSponsors);
        setExhibitors(resExhibitors);
        setMembers(mergedMembers);

        const savedUser = localStorage.getItem("metfix_user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser) as Member;
          const freshUser =
            mergedMembers.find((member) => member.id === parsed.id) ??
            mergedSpeakers.find((speaker) => speaker.id === parsed.id);
          if (freshUser) {
            setLoggedInUser(freshUser);
            saveToLocalStorage("metfix_user", freshUser);
          }
        }
      } catch (error) {
        console.error("Error loading conference data:", error);
        toast.error("Failed to load conference directory data.");
      }
    };
    loadData();
  }, []);

  // Load LocalStorage items
  useEffect(() => {
    const scans = localStorage.getItem("metfix_scans");
    if (scans) setSavedScans(JSON.parse(scans));

    const favSpeakers = localStorage.getItem("metfix_fav_speakers");
    if (favSpeakers) setFavoriteSpeakers(JSON.parse(favSpeakers));

    const favSessions = localStorage.getItem("metfix_fav_sessions");
    if (favSessions) setFavoriteSessions(JSON.parse(favSessions));

    const favSponsors = localStorage.getItem("metfix_fav_sponsors");
    if (favSponsors) setFavoriteSponsors(JSON.parse(favSponsors));

    const favExhibitors = localStorage.getItem("metfix_fav_exhibitors");
    if (favExhibitors) setFavoriteExhibitors(JSON.parse(favExhibitors));
  }, []);

  // Automatically scroll to the top of the window when switching tabs or routes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location, currentTab]);

  // Live clock for schedule tracking (paused when test clock is active)
  useEffect(() => {
    if (isScheduleTestMode()) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [scheduleTestEnabled]);

  // Auto-select today's event day during the summit
  useEffect(() => {
    const liveDay = getLiveEventDay(getScheduleNow());
    if (liveDay) setSelectedDay(liveDay);
  }, []);

  // Clear Past filter when the selected day is no longer live
  useEffect(() => {
    if (!isDayLive(selectedDay, schedule.find(d => d.day === selectedDay)?.agenda ?? [], now) && selectedTrack === "Past") {
      setSelectedTrack("All");
    }
  }, [selectedDay, schedule, now, selectedTrack]);

  // Save state helper
  const saveToLocalStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const buildSavedData = (patch: Partial<UserSavedData>): UserSavedData => ({
    favoriteSpeakers: patch.favoriteSpeakers ?? favoriteSpeakers,
    favoriteSessions: patch.favoriteSessions ?? favoriteSessions,
    favoriteSponsors: patch.favoriteSponsors ?? favoriteSponsors,
    favoriteExhibitors: patch.favoriteExhibitors ?? favoriteExhibitors,
    scans: patch.scans ?? savedScans,
  });

  const commitSavedData = (patch: Partial<UserSavedData>) => {
    const data = buildSavedData(patch);
    setSavedScans(data.scans);
    setFavoriteSpeakers(data.favoriteSpeakers);
    setFavoriteSessions(data.favoriteSessions);
    setFavoriteSponsors(data.favoriteSponsors);
    setFavoriteExhibitors(data.favoriteExhibitors);
    writeLocalUserSavedData(data);

    if (loggedInUser?.id && isSupabaseConfigured()) {
      if (cloudSyncTimeoutRef.current) {
        clearTimeout(cloudSyncTimeoutRef.current);
      }
      cloudSyncTimeoutRef.current = setTimeout(() => {
        saveUserSavedData(loggedInUser.id, data).catch((error) => {
          console.warn("Failed to save user data to cloud:", error);
        });
      }, 600);
    }
  };

  // Load cloud saved data when logged in
  useEffect(() => {
    if (!loggedInUser?.id || !isSupabaseConfigured()) return;

    let cancelled = false;
    loadAndMergeUserSavedData(loggedInUser.id)
      .then((merged) => {
        if (cancelled) return;
        setSavedScans(merged.scans);
        setFavoriteSpeakers(merged.favoriteSpeakers);
        setFavoriteSessions(merged.favoriteSessions);
        setFavoriteSponsors(merged.favoriteSponsors);
        setFavoriteExhibitors(merged.favoriteExhibitors);
        writeLocalUserSavedData(merged);
      })
      .catch((error) => console.warn("Failed to load saved data:", error));

    return () => {
      cancelled = true;
    };
  }, [loggedInUser?.id]);

  const handleTabChange = (value: string) => {
    setLocation(`/${value}`);
    setSearchQuery(""); // Clear search when changing tabs
    setSelectedSpeaker(null); // Clear modal speaker state
  };

  const applyScheduleTestClock = (enabled: boolean, date: string, time: string) => {
    if (enabled) {
      const iso = buildEasternTestDateTime(date, time);
      setScheduleTestNow(iso);
      localStorage.setItem(SCHEDULE_TEST_STORAGE_KEY, iso);
      setNow(new Date(iso));
      const liveDay = getLiveEventDay(new Date(iso));
      if (liveDay) setSelectedDay(liveDay);
      return;
    }

    setScheduleTestNow(null);
    localStorage.removeItem(SCHEDULE_TEST_STORAGE_KEY);
    setNow(new Date());
  };

  const handleScheduleTestToggle = (enabled: boolean) => {
    setScheduleTestEnabled(enabled);
    applyScheduleTestClock(enabled, scheduleTestDate, scheduleTestTime);
  };

  const handleScheduleTestDateChange = (date: string) => {
    setScheduleTestDate(date);
    if (scheduleTestEnabled) {
      applyScheduleTestClock(true, date, scheduleTestTime);
    }
  };

  const handleScheduleTestTimeChange = (time: string) => {
    setScheduleTestTime(time);
    if (scheduleTestEnabled) {
      applyScheduleTestClock(true, scheduleTestDate, time);
    }
  };

  // Favorite toggle functions
  const toggleFavoriteSpeaker = (id: string) => {
    const updated = favoriteSpeakers.includes(id)
      ? favoriteSpeakers.filter(x => x !== id)
      : [...favoriteSpeakers, id];
    commitSavedData({ favoriteSpeakers: updated });
    toast.success(favoriteSpeakers.includes(id) ? "Removed from favorites" : "Added to favorites");
  };

  const toggleFavoriteSession = (id: string) => {
    const isAdding = !favoriteSessions.includes(id);
    const updated = favoriteSessions.includes(id)
      ? favoriteSessions.filter(x => x !== id)
      : [...favoriteSessions, id];
    commitSavedData({ favoriteSessions: updated });

    toast.success(isAdding ? "Added to My Schedule" : "Removed from schedule");
  };

  const toggleFavoriteSponsor = (id: string) => {
    const updated = favoriteSponsors.includes(id)
      ? favoriteSponsors.filter(x => x !== id)
      : [...favoriteSponsors, id];
    commitSavedData({ favoriteSponsors: updated });
    toast.success(favoriteSponsors.includes(id) ? "Removed from favorites" : "Sponsor saved");
  };

  const toggleFavoriteExhibitor = (id: string) => {
    const updated = favoriteExhibitors.includes(id)
      ? favoriteExhibitors.filter(x => x !== id)
      : [...favoriteExhibitors, id];
    commitSavedData({ favoriteExhibitors: updated });
    toast.success(favoriteExhibitors.includes(id) ? "Removed from favorites" : "Exhibitor saved");
  };

  // vCard Generation
  const downloadVCard = (person: Partial<Member> | Partial<ScanRecord>) => {
    const cleanName = person.name || "Attendee";
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${cleanName}`,
      `ORG:${person.company || "Unbreakable Health Summit"}`,
      `TITLE:${person.role || "Attendee"}`,
      person.email ? `EMAIL:${person.email}` : "",
      person.phone ? `TEL:${person.phone}` : "",
      person.website ? `URL:${person.website}` : "",
      person.instagram ? `URL;TYPE=Instagram:${person.instagram}` : "",
      person.facebook ? `URL;TYPE=Facebook:${person.facebook}` : "",
      person.linkedin ? `URL;TYPE=LinkedIn:${person.linkedin}` : "",
      "END:VCARD"
    ].filter(Boolean).join("\n");

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${cleanName.replace(/\s+/g, "_")}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`vCard generated for ${cleanName}`);
  };

  // iCalendar (.ics) Generation
  const downloadICS = (session: Session) => {
    // Find the date for this session by checking our schedule array
    let sessionDateStr = DAY_TO_DATE[1];
    const dayObj = schedule.find(d => d.agenda.some(s => s.id === session.id));
    if (dayObj) {
      sessionDateStr = DAY_TO_DATE[dayObj.day] ?? DAY_TO_DATE[1];
    }

    // Parse session time string, e.g., "09:50 AM - 10:35 AM" or "12:35 PM - 01:50 PM"
    const timeParts = session.time.split(" - ");
    const startTimeStr = timeParts[0] || "09:00 AM";
    const endTimeStr = timeParts[1] || "10:00 AM";

    try {
      const dateNoDashes = sessionDateStr.replace(/-/g, "");
      const startFormatted = `${dateNoDashes}T${parseTimeTo24h(startTimeStr)}`;
      const endFormatted = `${dateNoDashes}T${parseTimeTo24h(endTimeStr)}`;

      const description = `${session.description || ""}${session.speakers.length > 0 ? `\\n\\nSpeakers: ${session.speakers.join(", ")}` : ""}`.replace(/\n/g, "\\n");

      const icsLines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MetFix//Unbreakable Health Summit//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${session.id}@unbreakable-health-summit`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `DTSTART:${startFormatted}`,
        `DTEND:${endFormatted}`,
        `SUMMARY:${session.title}`,
        `DESCRIPTION:${description}`,
        `LOCATION:Ritz Carlton, Miami Coconut Grove - ${session.room || "Main Ballroom"}`,
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "END:VEVENT",
        "END:VCALENDAR"
      ];

      const icsContent = icsLines.join("\r\n");
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Calendar event generated for ${session.title}`);
    } catch (err) {
      console.error("Error generating ICS file:", err);
      toast.error("Failed to generate calendar event.");
    }
  };

  // Bulk iCalendar (.ics) Generation for all bookmarked sessions
  const downloadAllICS = () => {
    const savedSessions = schedule
      .map(d => d.agenda)
      .flat()
      .filter(s => favoriteSessions.includes(s.id));

    if (savedSessions.length === 0) {
      toast.error("You don't have any saved sessions in your schedule.");
      return;
    }

    try {
      const icsLines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MetFix//Unbreakable Health Summit//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
      ];

      savedSessions.forEach(session => {
        let sessionDateStr = DAY_TO_DATE[1];
        const dayObj = schedule.find(d => d.agenda.some(s => s.id === session.id));
        if (dayObj) {
          sessionDateStr = DAY_TO_DATE[dayObj.day] ?? DAY_TO_DATE[1];
        }

        const timeParts = session.time.split(" - ");
        const startTimeStr = timeParts[0] || "09:00 AM";
        const endTimeStr = timeParts[1] || "10:00 AM";

        const dateNoDashes = sessionDateStr.replace(/-/g, "");
        const startFormatted = `${dateNoDashes}T${parseTimeTo24h(startTimeStr)}`;
        const endFormatted = `${dateNoDashes}T${parseTimeTo24h(endTimeStr)}`;

        const description = `${session.description || ""}${session.speakers.length > 0 ? `\\n\\nSpeakers: ${session.speakers.join(", ")}` : ""}`.replace(/\n/g, "\\n");

        icsLines.push(
          "BEGIN:VEVENT",
          `UID:${session.id}@unbreakable-health-summit`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
          `DTSTART:${startFormatted}`,
          `DTEND:${endFormatted}`,
          `SUMMARY:${session.title}`,
          `DESCRIPTION:${description}`,
          `LOCATION:Ritz Carlton, Miami Coconut Grove - ${session.room || "Main Ballroom"}`,
          "STATUS:CONFIRMED",
          "SEQUENCE:0",
          "END:VEVENT"
        );
      });

      icsLines.push("END:VCALENDAR");

      const icsContent = icsLines.join("\r\n");
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "unbreakable_summit_schedule.ics");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Successfully generated calendar file with ${savedSessions.length} sessions!`);
    } catch (err) {
      console.error("Error generating bulk ICS file:", err);
      toast.error("Failed to generate calendar events.");
    }
  };

  // Camera QR Scanner Lifecycle Helpers
  const startCameraScanner = async () => {
    setCameraError(null);
    setIsCameraScanning(true);
    
    // Small delay to ensure the container element is rendered and mounted
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        qrScannerRef.current = scanner;
        
        await scanner.start(
          { facingMode: "environment" }, // Rear camera
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            // Success callback
            handleScan(decodedText);
            stopCameraScanner();
          },
          (errorMessage) => {
            // Verbose error, ignore to prevent console flooding
          }
        );
      } catch (err: any) {
        console.error("Camera Scanner Error:", err);
        setCameraError(err?.message || "Failed to initialize camera scanner. Make sure camera permission is granted.");
        setIsCameraScanning(false);
      }
    }, 100);
  };

  const stopCameraScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    qrScannerRef.current = null;
    setIsCameraScanning(false);
  };

  // Stop camera scanning if user switches tab
  useEffect(() => {
    if (currentTab !== "scan") {
      stopCameraScanner();
    }
  }, [currentTab]);

  const authenticateUser = (member: Member) => {
    setLoggedInUser(member);
    saveToLocalStorage("metfix_user", member);
    setIsEditingProfile(false);
    toast.success(`Welcome, ${member.name}!`);
  };

  const startEditingProfile = () => {
    if (!loggedInUser) return;
    setProfileForm({
      email: loggedInUser.email ?? "",
      phone: loggedInUser.phone ?? "",
      website: loggedInUser.website ?? "",
      company: loggedInUser.company ?? "",
      role: loggedInUser.role ?? "",
      instagram: loggedInUser.instagram ?? "",
      facebook: loggedInUser.facebook ?? "",
      linkedin: loggedInUser.linkedin ?? "",
      bio: loggedInUser.bio ?? "",
    });
    setProfilePhotoPreview(loggedInUser.image ?? "");
    setProfilePhotoFile(null);
    setProfilePhotoRemoved(false);
    setIsEditingProfile(true);
  };

  const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be 2MB or smaller.");
      return;
    }

    setProfilePhotoFile(file);
    setProfilePhotoRemoved(false);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhotoFile(null);
    setProfilePhotoPreview("");
    setProfilePhotoRemoved(true);
    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!loggedInUser) return;

    setIsSavingProfile(true);
    try {
      if (profilePhotoFile) {
        await uploadProfilePhoto(loggedInUser.id, profilePhotoFile);
      }

      const saved = await updateProfile({
        badge_id: loggedInUser.id,
        email: profileForm.email,
        phone: profileForm.phone,
        website: profileForm.website,
        company: profileForm.company,
        role: profileForm.role,
        instagram: profileForm.instagram,
        facebook: profileForm.facebook,
        linkedin: profileForm.linkedin,
        bio: profileForm.bio,
        ...(profilePhotoRemoved ? { photo_url: null } : {}),
      });

      const updatedUser = applyProfileOverride(loggedInUser, saved);
      setLoggedInUser(updatedUser);
      saveToLocalStorage("metfix_user", updatedUser);
      setMembers((prev) =>
        prev.map((member) =>
          member.id === updatedUser.id ? applyProfileOverride(member, saved) : member
        )
      );
      setSpeakers((prev) =>
        prev.map((speaker) =>
          speaker.id === updatedUser.id ? applyProfileOverride(speaker, saved) : speaker
        )
      );
      setProfilePhotoFile(null);
      setProfilePhotoRemoved(false);
      setIsEditingProfile(false);
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLoginScan = (code: string) => {
    if (!code) return;
    const cleanCode = code.trim();

    const foundSpeaker = speakers.find(s => s.id === cleanCode);
    if (foundSpeaker) {
      authenticateUser(foundSpeaker);
      stopLoginCameraScanner();
      return;
    }

    const foundMember = members.find(m => m.id === cleanCode);
    if (foundMember) {
      authenticateUser(foundMember);
      stopLoginCameraScanner();
      return;
    }

    toast.error("Badge not recognized. Please scan a valid summit badge.");
  };

  const logout = () => {
    setLoggedInUser(null);
    localStorage.removeItem("metfix_user");
    setProfileOpen(false);
    setIsEditingProfile(false);
    toast.success("Logged out successfully");
  };

  const startLoginCameraScanner = async () => {
    setLoginCameraError(null);
    setIsLoginCameraScanning(true);

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("login-reader");
        loginQrScannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            handleLoginScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.error("Login Camera Scanner Error:", err);
        setLoginCameraError(err?.message || "Failed to initialize camera scanner. Make sure camera permission is granted.");
        setIsLoginCameraScanning(false);
      }
    }, 100);
  };

  const stopLoginCameraScanner = async () => {
    if (loginQrScannerRef.current && loginQrScannerRef.current.isScanning) {
      try {
        await loginQrScannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping login scanner:", err);
      }
    }
    loginQrScannerRef.current = null;
    setIsLoginCameraScanning(false);
  };

  useEffect(() => {
    if (currentTab !== "login") {
      stopLoginCameraScanner();
    }
  }, [currentTab]);

  // QR Code lookup & Scan actions
  const handleScan = (code: string) => {
    if (!code) return;
    const cleanCode = code.trim();
    setScannedId(cleanCode);

    const persistScan = (
      name: string,
      type: string,
      contact?: Pick<
        Member,
        "role" | "company" | "email" | "phone" | "website" | "instagram" | "facebook" | "linkedin"
      >
    ) => {
      const exists = savedScans.some(s => s.memberId === cleanCode);
      if (!exists) {
        const record: ScanRecord = {
          id: `scan_${Date.now()}`,
          memberId: cleanCode,
          name,
          type,
          timestamp: Date.now(),
          notes: "",
          favorite: false,
          role: contact?.role,
          company: contact?.company,
          email: contact?.email,
          phone: contact?.phone,
          website: contact?.website,
          instagram: contact?.instagram,
          facebook: contact?.facebook,
          linkedin: contact?.linkedin,
        };

        const updated = [record, ...savedScans];
        commitSavedData({ scans: updated });
        toast.success(name === "Unknown Attendee" ? "Scanned unknown attendee ID" : `Scanned & Saved: ${name}`);
      } else {
        toast.info(name === "Unknown Attendee" ? "Badge already scanned." : `${name} is already in your scan history.`);
      }
    };

    // Priority lookup: speakers.json first, then members.json
    const foundSpeaker = speakers.find(s => s.id === cleanCode);
    if (foundSpeaker) {
      persistScan(foundSpeaker.name, foundSpeaker.type, foundSpeaker);
      navigateToSpeaker(foundSpeaker.id);
      return;
    }

    const foundMember = members.find(m => m.id === cleanCode);
    setScannedIdMember(foundMember || null);
    persistScan(
      foundMember ? foundMember.name : "Unknown Attendee",
      foundMember ? foundMember.type : "unknown",
      foundMember || undefined
    );
    setShowScanResult(true);
  };

  const deleteScan = (id: string) => {
    const updated = savedScans.filter(s => s.id !== id);
    commitSavedData({ scans: updated });
    toast.success("Scan removed from history");
    if (selectedScanDetail?.id === id) {
      setSelectedScanDetail(null);
    }
  };

  const updateScanNote = (id: string, newNote: string) => {
    const updated = savedScans.map(s => s.id === id ? { ...s, notes: newNote } : s);
    commitSavedData({ scans: updated });
    toast.success("Note updated");
    if (selectedScanDetail?.id === id) {
      setSelectedScanDetail(prev => prev ? { ...prev, notes: newNote } : null);
    }
  };

  const toggleScanFavorite = (id: string) => {
    const updated = savedScans.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s);
    commitSavedData({ scans: updated });
    if (selectedScanDetail?.id === id) {
      setSelectedScanDetail(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
    }
  };

  // Export Scans
  const exportScansAsCSV = () => {
    if (savedScans.length === 0) {
      toast.error("No scans available to export.");
      return;
    }

    const headers = ["Member ID", "Name", "Type", "Role", "Company", "Email", "Phone", "Website", "Notes", "Timestamp"];
    const rows = savedScans.map(s => [
      s.memberId,
      s.name,
      s.type,
      s.role || "",
      s.company || "",
      s.email || "",
      s.phone || "",
      s.website || "",
      s.notes.replace(/"/g, '""'),
      new Date(s.timestamp).toLocaleString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "unbreakable_summit_scans.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Scans exported as CSV");
  };

  const dayAgenda = schedule.find(d => d.day === selectedDay)?.agenda ?? [];
  const dayIsLive = isDayLive(selectedDay, dayAgenda, now);
  const scheduleFilterChips = dayIsLive ? ["All", "Past", ...SCHEDULE_TRACKS] : ["All", ...SCHEDULE_TRACKS];
  const filteredScheduleSessions = dayAgenda.filter(session => {
    if (!dayIsLive) {
      return selectedTrack === "All" || session.track === selectedTrack;
    }
    const status = getSessionStatus(selectedDay, session.time, now);
    if (selectedTrack === "Past") return status === "past";
    const trackMatch = selectedTrack === "All" || session.track === selectedTrack;
    return trackMatch && status !== "past";
  });

  return (
    <div className="min-h-screen bg-[#070707] text-[#F8FAFC] pb-32 flex flex-col font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-[#c4b396]/15 bg-[#070707]/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border border-[#c4b396]/30 flex items-center justify-center bg-[#121214] overflow-hidden p-1 bg-gradient-to-b from-[#1c1c1f] to-[#0d0d0e]">
              <img 
                src="https://brokenscience.org/wp-content/uploads/2026/02/bronze-logo-2x.png" 
                alt="Broken Science Logo" 
                className="h-full w-full object-contain filter brightness-110"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-[#c4b396] uppercase font-serif-luxury">Unbreakable</h1>
              <p className="text-[10px] text-[#8E9CAE] uppercase tracking-widest font-semibold">Health Summit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loggedInUser ? (
              <button
                onClick={() => setProfileOpen(true)}
                className="p-2 rounded-full border border-[#c4b396]/20 bg-[#c4b396]/5 text-[#c4b396] hover:bg-[#c4b396]/10 transition-all"
                aria-label="Profile"
              >
                <User className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handleTabChange("login")}
                className={`px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-widest ${
                  currentTab === "login"
                    ? "border-[#c4b396] bg-[#c4b396]/15 text-[#c4b396]"
                    : "border-[#c4b396]/20 bg-[#c4b396]/5 text-[#c4b396] hover:bg-[#c4b396]/10"
                }`}
                aria-label="Log in"
              >
                Login
              </button>
            )}
            <button
              onClick={() => handleTabChange("saved")}
              className={`p-2 rounded-full border transition-all ${
                currentTab === "saved"
                  ? "border-[#c4b396] bg-[#c4b396]/15 text-[#c4b396]"
                  : "border-[#c4b396]/20 bg-[#c4b396]/5 text-[#c4b396] hover:bg-[#c4b396]/10"
              }`}
              aria-label="Saved items"
            >
              <Bookmark className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6">
        
        {/* ========================================================================= */}
        {/* 1. HOME TAB */}
        {/* ========================================================================= */}
        {!isSpeakerDetailRoute && currentTab === "home" && (
          <div className="space-y-6 animate-fade-in">
            {/* UPCOMING SESSIONS / HIGHLIGHT (MOVED TO TOP) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#c4b396] font-serif-luxury">Our Speakers</h3>
                <Button 
                  variant="link" 
                  onClick={() => handleTabChange("speakers")}
                  className="text-xs text-[#8E9CAE] hover:text-white p-0 h-auto"
                >
                  See All <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>

              {/* Speaker horizontal list */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {speakers.slice(0, 5).map(speaker => (
                  <div 
                    key={speaker.id}
                    onClick={() => navigateToSpeaker(speaker.id)}
                    className="flex-shrink-0 w-32 rounded-xl border border-[#c4b396]/10 bg-[#121214] overflow-hidden cursor-pointer hover:border-[#c4b396]/30 transition-all"
                  >
                    <div className="h-32 w-full bg-neutral-900 relative">
                      <img 
                        src={speaker.image || speakerPlaceholderUrl(speaker.name)} 
                        alt={speaker.name}
                        className="h-full w-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = speakerPlaceholderUrl(speaker.name);
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#c4b396] text-[#070707] uppercase">
                          {speaker.type || "SPEAKER"}
                        </span>
                      </div>
                    </div>
                    <div className="p-2">
                      <h4 className="text-[10px] font-bold text-white truncate">{speaker.name}</h4>
                      <p className="text-[8px] text-[#8E9CAE] truncate">{speaker.company}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HERO HERO SECTION */}
            <div className="relative rounded-2xl overflow-hidden border border-[#c4b396]/20 bg-gradient-to-b from-[#121214] to-[#0A0A0A] p-6 text-center shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#c4b396]"></div>
              <p className="text-[10px] font-bold text-[#c4b396] uppercase tracking-widest mb-2">MetFix Affiliates & BSI Presents</p>
              <h2 className="text-2xl font-black text-white font-serif-luxury leading-tight mb-2 tracking-wide">
                UNBREAKABLE HEALTH SUMMIT 2026
              </h2>
              <p className="text-xs text-[#8E9CAE] max-w-xs mx-auto mb-4 leading-relaxed">
                An Exclusive Miami Meet-Up With The Best Minds In Metabolic Health
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-[#18181B] border border-[#c4b396]/10 p-2 text-center">
                  <Calendar className="h-4 w-4 text-[#c4b396] mx-auto mb-1" />
                  <p className="text-[9px] text-[#8E9CAE] uppercase tracking-wider">Date</p>
                  <p className="text-[10px] font-bold text-white">May 30-31, 2026</p>
                </div>
                <div className="rounded-lg bg-[#18181B] border border-[#c4b396]/10 p-2 text-center">
                  <MapPin className="h-4 w-4 text-[#c4b396] mx-auto mb-1" />
                  <p className="text-[9px] text-[#8E9CAE] uppercase tracking-wider">Venue</p>
                  <p className="text-[10px] font-bold text-white">Ritz Carlton, Miami</p>
                </div>
              </div>

              <div className="flex gap-3 items-center justify-stretch mb-3">
                <button 
                  onClick={() => handleTabChange("scan")}
                  className="flex-1 bg-[#c4b396] hover:bg-[#c4b396]/90 text-[#070707] font-bold text-[11px] uppercase tracking-wider rounded-xl h-11 flex items-center justify-center gap-2 transition-all active:scale-97 border border-transparent cursor-pointer shadow-lg shadow-[#c4b396]/10"
                >
                  <QrCode className="h-4 w-4 shrink-0" /> Scan Badges
                </button>
                <button 
                  onClick={() => handleTabChange("schedule")}
                  className="flex-1 border border-[#c4b396]/30 hover:border-[#c4b396] hover:bg-white/5 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl h-11 flex items-center justify-center gap-2 transition-all active:scale-97 cursor-pointer"
                >
                  <Calendar className="h-4 w-4 shrink-0" /> View Schedule
                </button>
              </div>

              <button 
                onClick={() => setFeedbackOpen(true)}
                className="w-full border border-dashed border-[#c4b396]/40 hover:border-[#c4b396] hover:bg-[#c4b396]/5 text-[#c4b396] font-bold text-[11px] uppercase tracking-wider rounded-xl h-11 flex items-center justify-center gap-2 transition-all active:scale-97 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 shrink-0" /> Give Feedback / Ask Questions
              </button>


            </div>

            {/* EVENT STATS / HIGHLIGHTS */}
            <div className="grid grid-cols-3 gap-3">
              <div 
                onClick={() => handleTabChange("speakers")}
                className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-3 text-center cursor-pointer hover:border-[#c4b396]/30 transition-all"
              >
                <Users className="h-5 w-5 text-[#c4b396] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{speakers.length || "11"}</p>
                <p className="text-[9px] text-[#8E9CAE] uppercase tracking-wider">Speakers</p>
              </div>
              <div 
                onClick={() => handleTabChange("schedule")}
                className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-3 text-center cursor-pointer hover:border-[#c4b396]/30 transition-all"
              >
                <Clock className="h-5 w-5 text-[#c4b396] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">17</p>
                <p className="text-[9px] text-[#8E9CAE] uppercase tracking-wider">Sessions</p>
              </div>
              <div 
                onClick={() => {
                  handleTabChange("speakers");
                  // Small timeout to let tab transition, then switch the sub-tab to sponsors-list
                  setTimeout(() => {
                    const trigger = document.querySelector('[value="sponsors-list"]') as HTMLButtonElement;
                    if (trigger) trigger.click();
                  }, 50);
                }}
                className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-3 text-center cursor-pointer hover:border-[#c4b396]/30 transition-all"
              >
                <Award className="h-5 w-5 text-[#c4b396] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{sponsors.length || "6"}</p>
                <p className="text-[9px] text-[#8E9CAE] uppercase tracking-wider">Sponsors</p>
              </div>
            </div>

            {/* HORIZONTAL SPONSORS CAROUSEL */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#c4b396] font-serif-luxury">Official Event Sponsors</h3>
                <Button 
                  variant="link" 
                  onClick={() => {
                    handleTabChange("speakers");
                    setTimeout(() => {
                      const trigger = document.querySelector('[value="sponsors-list"]') as HTMLButtonElement;
                      if (trigger) trigger.click();
                    }, 50);
                  }}
                  className="text-xs text-[#8E9CAE] hover:text-white p-0 h-auto"
                >
                  See All <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {sponsors.map(sponsor => (
                  <div 
                    key={sponsor.id}
                    onClick={() => setSelectedSponsor(sponsor)}
                    className="flex-shrink-0 w-36 rounded-xl border border-[#c4b396]/10 bg-[#121214] p-3 flex flex-col justify-between items-center text-center cursor-pointer hover:border-[#c4b396]/30 transition-all"
                  >
                    <div className="h-12 w-full bg-[#c4b396] rounded border border-[#c4b396]/20 p-2 flex items-center justify-center overflow-hidden mb-2 shadow-inner">
                      <img 
                        src={sponsor.logo} 
                        alt={sponsor.name} 
                        className="max-h-full max-w-full object-contain filter brightness-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${sponsor.name}&backgroundColor=121214&textColor=D4AF37`;
                        }}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-[10px] font-bold text-white truncate max-w-[120px]">{sponsor.name}</h4>
                      <span className={`text-[7px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider ${sponsor.tier === "Platinum" ? "bg-[#c4b396]/20 text-[#c4b396]" : "bg-neutral-800 text-[#8E9CAE]"}`}>
                        {sponsor.tier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PLATINUM SPONSORS ROW */}
            <div className="space-y-2 text-center pt-2">
              <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-widest">Presented By</p>
              <div className="flex justify-center items-center gap-6">
                <img src="https://brokenscience.org/wp-content/uploads/2024/10/logo.svg" className="h-8 opacity-70 hover:opacity-100 transition-opacity" alt="BSI" />
                <div className="h-6 w-px bg-neutral-800"></div>
                <img src="https://brokenscience.org/wp-content/uploads/2026/02/Metfix-dark-logo.png" className="h-8 opacity-70 hover:opacity-100 transition-opacity invert" alt="MetFix" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SCAN BADGE TAB */}
        {/* ========================================================================= */}
        {!isSpeakerDetailRoute && currentTab === "scan" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-wider text-[#c4b396] font-serif-luxury">Badge Scanner</h2>
              <p className="text-xs text-[#8E9CAE] max-w-xs mx-auto">
                Scan attendee QR codes to look up profiles and save contacts.
              </p>
            </div>

            {/* CAMERA QR SCANNER BOX */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#c4b396]/30 bg-[#121214] aspect-square flex flex-col items-center justify-center text-center shadow-2xl">
              {/* Live Camera Feed Target */}
              <div id="reader" className={`absolute inset-0 w-full h-full object-cover bg-black ${isCameraScanning ? "block" : "hidden"}`}></div>

              {/* Overlay elements when camera is inactive */}
              {!isCameraScanning && (
                <div className="p-6 flex flex-col items-center justify-center z-10 space-y-4">
                  {/* Corner Targets */}
                  <div className="absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-[#c4b396]"></div>
                  <div className="absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-[#c4b396]"></div>
                  <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-[#c4b396]"></div>
                  <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-[#c4b396]"></div>

                  <QrCode className="h-16 w-16 text-[#c4b396]/40 mb-2 animate-pulse" />
                  
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Live Camera Scanner</p>
                    <p className="text-[10px] text-[#8E9CAE] max-w-[240px] leading-relaxed">
                      Enable your device camera to scan physical badges and save leads instantly.
                    </p>
                  </div>

                  {cameraError && (
                    <p className="text-[9px] text-red-400 font-semibold max-w-[240px] leading-normal bg-red-950/20 border border-red-900/40 p-2 rounded-lg">
                      {cameraError}
                    </p>
                  )}

                  <Button 
                    onClick={startCameraScanner}
                    className="bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider px-6 h-10 rounded-lg shadow-lg"
                  >
                    Start Camera
                  </Button>
                </div>
              )}

              {/* Active Scanner Controls */}
              {isCameraScanning && (
                <>
                  {/* Scan Overlay Crosshairs */}
                  <div className="absolute inset-0 pointer-events-none border-[30px] border-black/60 flex items-center justify-center">
                    <div className="relative w-48 h-48 border-2 border-[#c4b396] rounded-xl shadow-[0_0_15px_rgba(196,179,150,0.3)]">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 h-4 w-4 border-t-4 border-l-4 border-[#c4b396]"></div>
                      <div className="absolute -top-1 -right-1 h-4 w-4 border-t-4 border-r-4 border-[#c4b396]"></div>
                      <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-[#c4b396]"></div>
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-[#c4b396]"></div>
                      {/* Laser Beam */}
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-[#c4b396] shadow-[0_0_10px_#c4b396] animate-bounce" style={{ animationDuration: '2.5s' }}></div>
                    </div>
                  </div>

                  {/* Stop Camera Overlay Button */}
                  <Button 
                    onClick={stopCameraScanner}
                    variant="outline"
                    className="absolute bottom-4 z-20 border-[#c4b396]/30 text-white hover:bg-neutral-900/80 bg-black/40 text-[10px] font-bold uppercase tracking-wider h-8 px-4"
                  >
                    Stop Camera
                  </Button>
                </>
              )}
            </div>

            {/* LAST SCANNED & HISTORY SHORTCUTS */}
            <div className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-4 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">Last Scanned</p>
                  <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                    {savedScans.length > 0 ? savedScans[0].name : "No scans yet"}
                  </h4>
                  {savedScans.length > 0 && (
                    <p className="text-[8px] text-[#c4b396] font-medium uppercase tracking-wider">
                      {savedScans[0].type}
                    </p>
                  )}
                </div>
                {savedScans.length > 0 && (
                  <div className="h-8 w-8 rounded-lg bg-[#c4b396]/10 border border-[#c4b396]/20 flex items-center justify-center text-[#c4b396] font-bold text-xs shrink-0">
                    {savedScans[0].name.charAt(0)}
                  </div>
                )}
              </div>

              <Button 
                onClick={() => {
                  stopCameraScanner();
                  // Navigate to Saved tab (which defaults to Scan History)
                  setLocation("/saved");
                }}
                variant="outline"
                className="w-full border-[#c4b396]/20 hover:border-[#c4b396] text-xs font-bold text-[#c4b396] uppercase tracking-wider h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#c4b396]/5"
              >
                <HistoryIcon className="h-3.5 w-3.5 shrink-0" /> See Scan History ({savedScans.length})
              </Button>
            </div>


          </div>
        )}

        {/* ========================================================================= */}
        {/* LOGIN TAB */}
        {/* ========================================================================= */}
        {!isSpeakerDetailRoute && currentTab === "login" && (
          <div className="space-y-6 animate-fade-in">
            {loggedInUser ? (
              <div className="rounded-2xl border border-[#c4b396]/30 bg-gradient-to-b from-[#121214] to-[#0A0A0A] p-8 text-center shadow-2xl space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-[#c4b396]/15 border border-[#c4b396]/30 flex items-center justify-center">
                  <Check className="h-8 w-8 text-[#c4b396]" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[#8E9CAE] uppercase tracking-widest">Authenticated</p>
                  <h2 className="text-2xl font-bold text-white font-serif-luxury">
                    Welcome {loggedInUser.name}
                  </h2>
                  <p className="text-xs text-[#8E9CAE]">
                    You&apos;re logged in. Tap your profile icon in the header to view your details.
                  </p>
                </div>
                <Button
                  onClick={() => handleTabChange("home")}
                  className="bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider h-10 px-6 rounded-lg"
                >
                  Continue to Home
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold uppercase tracking-wider text-[#c4b396] font-serif-luxury">Log In</h2>
                  <p className="text-xs text-[#8E9CAE] max-w-xs mx-auto">
                    Scan your summit badge to authenticate and log in.
                  </p>
                </div>

                <div className="relative rounded-2xl overflow-hidden border-2 border-[#c4b396]/30 bg-[#121214] aspect-square flex flex-col items-center justify-center text-center shadow-2xl">
                  <div id="login-reader" className={`absolute inset-0 w-full h-full object-cover bg-black ${isLoginCameraScanning ? "block" : "hidden"}`}></div>

                  {!isLoginCameraScanning && (
                    <div className="p-6 flex flex-col items-center justify-center z-10 space-y-4">
                      <div className="absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-[#c4b396]"></div>
                      <div className="absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-[#c4b396]"></div>
                      <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-[#c4b396]"></div>
                      <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-[#c4b396]"></div>

                      <LogIn className="h-16 w-16 text-[#c4b396]/40 mb-2 animate-pulse" />

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">Badge Authentication</p>
                        <p className="text-[10px] text-[#8E9CAE] max-w-[240px] leading-relaxed">
                          Point your camera at the QR code on your summit badge to sign in.
                        </p>
                      </div>

                      {loginCameraError && (
                        <p className="text-[9px] text-red-400 font-semibold max-w-[240px] leading-normal bg-red-950/20 border border-red-900/40 p-2 rounded-lg">
                          {loginCameraError}
                        </p>
                      )}

                      <Button
                        onClick={startLoginCameraScanner}
                        className="bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider px-6 h-10 rounded-lg shadow-lg"
                      >
                        Scan Badge
                      </Button>
                    </div>
                  )}

                  {isLoginCameraScanning && (
                    <>
                      <div className="absolute inset-0 pointer-events-none border-[30px] border-black/60 flex items-center justify-center">
                        <div className="relative w-48 h-48 border-2 border-[#c4b396] rounded-xl shadow-[0_0_15px_rgba(196,179,150,0.3)]">
                          <div className="absolute -top-1 -left-1 h-4 w-4 border-t-4 border-l-4 border-[#c4b396]"></div>
                          <div className="absolute -top-1 -right-1 h-4 w-4 border-t-4 border-r-4 border-[#c4b396]"></div>
                          <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-[#c4b396]"></div>
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-[#c4b396]"></div>
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-[#c4b396] shadow-[0_0_10px_#c4b396] animate-bounce" style={{ animationDuration: "2.5s" }}></div>
                        </div>
                      </div>

                      <Button
                        onClick={stopLoginCameraScanner}
                        variant="outline"
                        className="absolute bottom-4 z-20 border-[#c4b396]/30 text-white hover:bg-neutral-900/80 bg-black/40 text-[10px] font-bold uppercase tracking-wider h-8 px-4"
                      >
                        Stop Camera
                      </Button>
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-4 space-y-3 shadow-lg">
                  <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">Manual Badge ID</p>
                  <div className="flex gap-2">
                    <Input
                      value={loginManualQrInput}
                      onChange={(e) => setLoginManualQrInput(e.target.value)}
                      placeholder="Enter badge QR code"
                      className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLoginScan(loginManualQrInput);
                          setLoginManualQrInput("");
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        handleLoginScan(loginManualQrInput);
                        setLoginManualQrInput("");
                      }}
                      className="bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider h-10 px-4 shrink-0"
                    >
                      Log In
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SCHEDULE TAB */}
        {/* ========================================================================= */}
        {!isSpeakerDetailRoute && currentTab === "schedule" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-wider text-[#c4b396] font-serif-luxury">Event Schedule</h2>
              <p className="text-xs text-[#8E9CAE]">Ritz Carlton, Miami • May 30-31, 2026</p>
            </div>

            {/* TEST CLOCK — dev UI or when a test time is already active */}
            {(import.meta.env.DEV || scheduleTestEnabled) && (
              <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Test clock</p>
                  <p className="text-[10px] text-[#8E9CAE]">
                    {formatScheduleNowDisplay(now)}
                    {scheduleTestEnabled && " (simulated)"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#8E9CAE] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleTestEnabled}
                    onChange={e => handleScheduleTestToggle(e.target.checked)}
                    className="rounded border-neutral-600"
                  />
                  Override event date &amp; time (Eastern)
                </label>
                {scheduleTestEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-[#8E9CAE]">Date</label>
                      <input
                        type="date"
                        value={scheduleTestDate}
                        onChange={e => handleScheduleTestDateChange(e.target.value)}
                        className="w-full rounded-md border border-neutral-700 bg-[#070707] px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-[#8E9CAE]">Time (ET)</label>
                      <input
                        type="time"
                        value={scheduleTestTime}
                        onChange={e => handleScheduleTestTimeChange(e.target.value)}
                        className="w-full rounded-md border border-neutral-700 bg-[#070707] px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
                <p className="text-[9px] text-[#8E9CAE]/70 leading-relaxed">
                  Or set <code className="text-amber-500/90">SCHEDULE_TEST_NOW_DEFAULT</code> in{" "}
                  <code className="text-amber-500/90">scheduleTime.ts</code> (e.g.{" "}
                  <code className="text-amber-500/90">"2026-05-30T09:30:00-04:00"</code>).
                </p>
              </div>
            )}

            {/* DAY SELECTOR */}
            <div className="flex rounded-lg border border-[#c4b396]/20 bg-[#121214] p-1">
              <button 
                onClick={() => setSelectedDay(1)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${selectedDay === 1 ? 'bg-[#c4b396] text-[#070707]' : 'text-[#8E9CAE] hover:text-white'}`}
              >
                Day 1 (May 30)
              </button>
              <button 
                onClick={() => setSelectedDay(2)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${selectedDay === 2 ? 'bg-[#c4b396] text-[#070707]' : 'text-[#8E9CAE] hover:text-white'}`}
              >
                Day 2 (May 31)
              </button>
            </div>

            {/* TRACK FILTER SELECTOR */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {scheduleFilterChips.map(track => (
                <button
                  key={track}
                  onClick={() => setSelectedTrack(track)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${selectedTrack === track ? 'bg-[#c4b396]/15 border-[#c4b396] text-[#c4b396]' : 'border-neutral-800 bg-[#121214] text-[#8E9CAE] hover:text-white'}`}
                >
                  {track}
                </button>
              ))}
            </div>

            {/* SESSIONS LIST */}
            <div className="space-y-4">
              {isAfterDayRecapCutoff() && (
                <a
                  href={`https://brokenscience.org/unbreakable-recap?tab_choice=${selectedDay}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#c4b396] hover:bg-[#c4b396]/90 text-[#070707] font-bold text-[11px] uppercase tracking-wider rounded-xl h-11 flex items-center justify-center gap-2 transition-all active:scale-97 border border-transparent cursor-pointer shadow-lg shadow-[#c4b396]/10"
                >
                  See Day {selectedDay} recap
                </a>
              )}
              {filteredScheduleSessions.length === 0 && dayIsLive && (
                <p className="text-center text-xs text-[#8E9CAE] py-6">
                  {selectedTrack === "Past" ? "No past sessions yet." : "No upcoming sessions."}
                </p>
              )}
              {filteredScheduleSessions.map(session => {
                  const isSaved = favoriteSessions.includes(session.id);
                  const sessionStatus = getSessionStatus(selectedDay, session.time, now);
                  const isCurrent = dayIsLive && selectedTrack !== "Past" && sessionStatus === "current";
                  return (
                    <div 
                      key={session.id}
                      id={`session-card-${session.id}`}
                      className={cn(
                        "rounded-xl border bg-[#121214] overflow-hidden transition-all flex flex-col scroll-mt-24",
                        isCurrent
                          ? "border-[#c4b396]/60 shadow-[0_0_20px_rgba(196,179,150,0.35)] ring-1 ring-[#c4b396]/40"
                          : "border-[#c4b396]/10 hover:border-[#c4b396]/30"
                      )}
                    >
                      <div className="p-4 flex-1 space-y-3">
                        {/* Header: Track & Saved Star */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-wider">
                              Ritz-Carlton, Miami
                            </div>
                            {isCurrent && (
                              <div className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-[#c4b396] text-[#070707] uppercase tracking-wider animate-pulse">
                                Live now
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => downloadICS(session)}
                              title="Add to Calendar"
                              className="p-1 text-neutral-500 hover:text-[#c4b396] transition-colors cursor-pointer"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => toggleFavoriteSession(session.id)}
                              title={isSaved ? "Remove from Saved" : "Save Session"}
                              className="p-1 hover:text-[#c4b396] text-neutral-500 transition-colors cursor-pointer"
                            >
                              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-[#c4b396] text-[#c4b396]' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Title & Info */}
                        <div className="space-y-1 cursor-pointer" onClick={() => setSelectedSession(session)}>
                          <h3 className="text-sm font-bold text-white leading-snug hover:text-[#c4b396] transition-colors">
                            {session.title}
                          </h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#8E9CAE]">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#c4b396]" /> {session.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#c4b396]" /> {session.room}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-[#8E9CAE]/80 leading-relaxed line-clamp-2">
                          {session.description}
                        </p>

                        {/* Speakers & Sponsor */}
                        {session.speakers.length > 0 && (
                          <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-[9px] text-[#8E9CAE] mr-1">Speakers:</span>
                              {session.speakers.map(spName => {
                                const matchedSp = speakers.find(s => s.name === spName);
                                return (
                                  <span 
                                    key={spName}
                                    onClick={() => matchedSp && setLocation(`/speaker/${matchedSp.id}`)}
                                    className={`text-[9px] font-bold text-white bg-[#18181B] px-1.5 py-0.5 rounded border border-neutral-800 ${matchedSp ? 'cursor-pointer hover:border-[#c4b396] hover:text-[#c4b396]' : ''}`}
                                  >
                                    {spName}
                                  </span>
                                );
                              })}
                            </div>
                            {session.sponsor && (
                              <span className="text-[8px] text-[#8E9CAE]/60 italic">
                                Sponsored by {session.sponsor}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}



        {/* ========================================================================= */}
        {/* 5. EXHIBITORS TAB */}
        {/* ========================================================================= */}
        {!isSpeakerDetailRoute && currentTab === "exhibitors" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-wider text-[#c4b396] font-serif-luxury">Exhibitor Directory</h2>
              <p className="text-xs text-[#8E9CAE]">Explore cutting-edge services, health clinics, and physical communities.</p>
            </div>

            {/* SEARCH */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8E9CAE]" />
              <Input 
                type="text" 
                placeholder="Search exhibitors by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#121214] border-[#c4b396]/15 focus:border-[#c4b396] pl-9 text-white placeholder:text-[#8E9CAE]/40"
              />
            </div>

            {/* EXHIBITORS LIST */}
            <div className="space-y-4">
              {exhibitors
                .filter(ex => {
                  const query = searchQuery.toLowerCase();
                  return ex.name.toLowerCase().includes(query) || ex.category.toLowerCase().includes(query);
                })
                .map(exhibitor => {
                  const isSaved = favoriteExhibitors.includes(exhibitor.id);
                  return (
                    <div 
                      key={exhibitor.id}
                      className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-4 hover:border-[#c4b396]/30 transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-wider">
                            {exhibitor.category}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-2">
                            {exhibitor.name}
                          </h3>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] font-bold text-[#c4b396] border border-[#c4b396]/30 px-2 py-0.5 bg-[#c4b396]/5 rounded">
                            {exhibitor.booth}
                          </span>
                          <button 
                            onClick={() => toggleFavoriteExhibitor(exhibitor.id)}
                            className="p-1 hover:text-[#c4b396] text-neutral-500 transition-colors"
                          >
                            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-[#c4b396] text-[#c4b396]' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#8E9CAE]/80 leading-relaxed">
                        {exhibitor.description}
                      </p>

                      <div className="pt-2 border-t border-neutral-800/60 flex justify-between items-center">
                        <a 
                          href={exhibitor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#c4b396] hover:underline flex items-center gap-1"
                        >
                          Visit Website <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. SPEAKERS & PANELISTS TAB */}
        {/* ========================================================================= */}
        {(currentTab === "speakers" || isSpeakerDetailRoute) && (
          <div className="space-y-6 animate-fade-in">
            {isSpeakerDetailRoute && speakerIdFromUrl ? (() => {
              const speaker = speakers.find(s => s.id === speakerIdFromUrl);
              if (!speaker) {
                return (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-sm text-[#8E9CAE]">Speaker not found.</p>
                    <Button 
                      onClick={() => setLocation("/speakers")}
                      className="bg-[#c4b396] text-[#070707] font-bold text-xs uppercase tracking-wider h-10 rounded-lg"
                    >
                      Back to Speakers
                    </Button>
                  </div>
                );
              }

              const isSaved = favoriteSpeakers.includes(speaker.id);

              return (
                <div className="space-y-6 animate-fade-in pb-8">
                  {/* Dedicated Header Back Navigation */}
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800/60">
                    <button 
                      onClick={() => {
                        // Dynamically route back to the correct tab we came from
                        setLocation(`/${fromTab}`);
                      }}
                      className="flex items-center gap-1.5 text-xs text-[#8E9CAE] hover:text-[#c4b396] transition-colors font-bold uppercase tracking-wider"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                    <span className="text-[8px] font-black px-2 py-0.5 rounded bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-widest">
                      {speaker.type || "speaker"} Profile
                    </span>
                  </div>

                  {/* Profile Section */}
                  <div className="rounded-2xl border border-[#c4b396]/10 bg-[#121214] overflow-hidden">
                    <div className="h-48 bg-gradient-to-r from-[#c4b396]/20 to-neutral-900 relative">
                      <img 
                        src={speaker.image || speakerPlaceholderUrl(speaker.name)} 
                        alt={speaker.name}
                        className="absolute bottom-[-16px] left-6 h-32 w-32 rounded-xl object-cover object-top border-4 border-[#121214] bg-neutral-900 shadow-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = speakerPlaceholderUrl(speaker.name);
                        }}
                      />
                    </div>

                    <div className="pt-8 px-6 pb-6 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-white font-serif-luxury">{speaker.name}</h3>
                          <p className="text-xs text-[#c4b396] font-semibold">{speaker.role}</p>
                          <p className="text-xs text-[#8E9CAE]">{speaker.company}</p>
                        </div>
                        <Button 
                          onClick={() => toggleFavoriteSpeaker(speaker.id)}
                          variant="outline"
                          className="h-9 px-3 border-neutral-800 text-neutral-400 hover:text-[#c4b396] hover:border-[#c4b396]/40 flex items-center gap-1.5 text-xs shrink-0 cursor-pointer"
                        >
                          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-[#c4b396] text-[#c4b396]' : ''}`} />
                          {isSaved ? 'Bookmarked' : 'Bookmark'}
                        </Button>
                      </div>

                      {/* Contact Quicklinks */}
                      <div className="flex justify-center gap-8 pt-2 border-t border-b border-neutral-800/60 py-3 text-center">
                        {speaker.email && (
                          <a href={`mailto:${speaker.email}`} className="text-[10px] text-[#8E9CAE] hover:text-[#c4b396] flex flex-col items-center gap-1">
                            <Mail className="h-4 w-4 text-[#c4b396]/70" /> Email
                          </a>
                        )}
                        {speaker.phone && (
                          <a href={`tel:${speaker.phone}`} className="text-[10px] text-[#8E9CAE] hover:text-[#c4b396] flex flex-col items-center gap-1">
                            <Phone className="h-4 w-4 text-[#c4b396]/70" /> Call
                          </a>
                        )}
                        {speaker.website && (
                          <a href={speaker.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#8E9CAE] hover:text-[#c4b396] flex flex-col items-center gap-1">
                            <Globe className="h-4 w-4 text-[#c4b396]/70" /> Website
                          </a>
                        )}
                        {speaker.instagram && (
                          <a href={speaker.instagram.startsWith("http") ? speaker.instagram : `https://${speaker.instagram}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#8E9CAE] hover:text-[#c4b396] flex flex-col items-center gap-1">
                            <Instagram className="h-4 w-4 text-[#c4b396]/70" /> Instagram
                          </a>
                        )}
                        {speaker.facebook && (
                          <a href={speaker.facebook.startsWith("http") ? speaker.facebook : `https://${speaker.facebook}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#8E9CAE] hover:text-[#c4b396] flex flex-col items-center gap-1">
                            <Facebook className="h-4 w-4 text-[#c4b396]/70" /> Facebook
                          </a>
                        )}
                        {speaker.linkedin && (
                          <a href={speaker.linkedin.startsWith("http") ? speaker.linkedin : `https://${speaker.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#8E9CAE] hover:text-[#c4b396] flex flex-col items-center gap-1">
                            <Linkedin className="h-4 w-4 text-[#c4b396]/70" /> LinkedIn
                          </a>
                        )}
                      </div>

                      {/* Bio */}
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396]">Biography</h4>
                        <p className="text-xs text-[#8E9CAE] leading-relaxed">
                          {speaker.bio}
                        </p>
                      </div>

                      {/* Sessions */}
                      <div className="space-y-2 pt-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396]">Sessions & Lectures</h4>
                        <div className="space-y-2">
                          {speaker.sessions.map(sTitle => {
                            const sMatched = schedule.map(d => d.agenda).flat().find(s => s.title === sTitle);
                            return (
                              <div 
                                key={sTitle}
                                onClick={() => {
                                  if (sMatched) {
                                    // 1. Find which day this session belongs to
                                    const dayObj = schedule.find(d => d.agenda.some(a => a.id === sMatched.id));
                                    if (dayObj) {
                                      setSelectedDay(dayObj.day);
                                    }
                                    // 2. Clear track filter to make sure it's visible
                                    setSelectedTrack("All");
                                    // 3. Navigate to schedule tab
                                    setLocation("/schedule");
                                    // 4. Open the session details modal
                                    setSelectedSession(sMatched);
                                    // 5. Scroll to the card after tab transitions
                                    setTimeout(() => {
                                      const cardEl = document.getElementById(`session-card-${sMatched.id}`);
                                      if (cardEl) {
                                        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        // Highlight card temporarily
                                        cardEl.classList.add('border-[#c4b396]');
                                        setTimeout(() => {
                                          cardEl.classList.remove('border-[#c4b396]');
                                        }, 2000);
                                      }
                                    }, 300);
                                  }
                                }}
                                className={`p-3 rounded-xl bg-[#18181B] border border-neutral-800 text-left ${sMatched ? 'cursor-pointer hover:border-[#c4b396]/40 hover:bg-[#1C1C1F]' : ''}`}
                              >
                                <h5 className="text-xs font-bold text-white line-clamp-2 leading-snug">{sTitle}</h5>
                                {sMatched && (
                                  <div className="flex gap-2 text-[10px] text-[#8E9CAE] mt-1.5 items-center">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5 text-[#c4b396]" /> Day {schedule.findIndex(d => d.agenda.some(a => a.id === sMatched.id)) + 1} • {sMatched.time}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5 text-[#c4b396]" /> {sMatched.room}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="space-y-6">
                <Tabs defaultValue="speakers-list" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full border border-[#c4b396]/20 bg-[#121214] p-1 rounded-lg">
                    <TabsTrigger value="speakers-list" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#c4b396] data-[state=active]:text-[#070707]">
                      Speakers ({speakers.length})
                    </TabsTrigger>
                    <TabsTrigger value="sponsors-list" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#c4b396] data-[state=active]:text-[#070707]">
                      Sponsors ({sponsors.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* SPEAKERS TAB CONTENT */}
                  <TabsContent value="speakers-list" className="space-y-4 pt-4 outline-none">
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-bold uppercase tracking-wider text-[#c4b396] font-serif-luxury">Summit Speakers</h2>
                      <p className="text-xs text-[#8E9CAE]">The wellness game-changers redefining metabolic health.</p>
                    </div>

                    {/* SEARCH SPEAKERS */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8E9CAE]" />
                      <Input 
                        type="text" 
                        placeholder="Search speakers by name or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#121214] border-[#c4b396]/15 focus:border-[#c4b396] pl-9 text-white placeholder:text-[#8E9CAE]/40"
                      />
                    </div>

                    {/* SPEAKERS GRID */}
                    <div className="grid grid-cols-1 gap-4">
                      {speakers
                        .filter(sp => {
                          const query = searchQuery.toLowerCase();
                          return sp.name.toLowerCase().includes(query) || sp.company.toLowerCase().includes(query) || sp.role.toLowerCase().includes(query);
                        })
                        .map(speaker => {
                          const isSaved = favoriteSpeakers.includes(speaker.id);
                          return (
                            <div 
                              key={speaker.id}
                              className="rounded-xl border border-[#c4b396]/10 bg-[#121214] overflow-hidden hover:border-[#c4b396]/30 transition-all flex"
                            >
                              {/* Left side: image */}
                              <div className="w-28 h-36 bg-neutral-900 flex-shrink-0 relative cursor-pointer" onClick={() => navigateToSpeaker(speaker.id)}>
                                <img 
                                  src={speaker.image || speakerPlaceholderUrl(speaker.name)} 
                                  alt={speaker.name}
                                  className="h-full w-full object-cover object-top"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = speakerPlaceholderUrl(speaker.name);
                                  }}
                                />
                              </div>

                              {/* Right side: content */}
                              <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-start gap-1">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h3 
                                          onClick={() => navigateToSpeaker(speaker.id)}
                                          className="text-xs font-bold text-white leading-snug hover:text-[#c4b396] transition-colors truncate cursor-pointer"
                                        >
                                          {speaker.name}
                                        </h3>
                                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-wider shrink-0">
                                          {speaker.type || "speaker"}
                                        </span>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => toggleFavoriteSpeaker(speaker.id)}
                                      className="p-0.5 hover:text-[#c4b396] text-neutral-500 transition-colors flex-shrink-0"
                                    >
                                      <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-[#c4b396] text-[#c4b396]' : ''}`} />
                                    </button>
                                  </div>
                                  <p className="text-[10px] font-medium text-[#c4b396] truncate">{speaker.role}</p>
                                  <p className="text-[9px] text-[#8E9CAE] truncate">{speaker.company}</p>
                                  <p className="text-[10px] text-[#8E9CAE]/70 line-clamp-2 leading-relaxed pt-1">
                                    {speaker.bio}
                                  </p>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-neutral-800/40 mt-1">
                                  <Button 
                                    variant="link" 
                                    onClick={() => navigateToSpeaker(speaker.id)}
                                    className="text-[9px] text-[#c4b396] p-0 h-auto font-bold uppercase tracking-wider"
                                  >
                                    View Bio & Sessions
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </TabsContent>

                  {/* SPONSORS TAB CONTENT */}
                  <TabsContent value="sponsors-list" className="space-y-4 pt-4 outline-none">
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-bold uppercase tracking-wider text-[#c4b396] font-serif-luxury">Summit Sponsors</h2>
                      <p className="text-xs text-[#8E9CAE]">Pioneering brands redefining metabolic health and fitness.</p>
                    </div>

                    {/* TIER FILTER SELECTOR */}
                    <div className="flex rounded-lg border border-[#c4b396]/20 bg-[#121214] p-1">
                      {["All", "Platinum", "Gold", "Silver"].map(tier => (
                        <button
                          key={tier}
                          onClick={() => setSelectedSponsorTier(tier)}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${selectedSponsorTier === tier ? 'bg-[#c4b396] text-[#070707]' : 'text-[#8E9CAE] hover:text-white'}`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>

                    {/* SPONSORS GRID (Styled matching speaker cards) */}
                    <div className="grid grid-cols-1 gap-4">
                      {sponsors
                        .filter(sp => selectedSponsorTier === "All" || sp.tier === selectedSponsorTier)
                        .map(sponsor => {
                          const isSaved = favoriteSponsors.includes(sponsor.id);
                          return (
                            <div 
                              key={sponsor.id}
                              className={`rounded-xl border bg-[#121214] overflow-hidden hover:border-[#c4b396]/30 transition-all flex ${sponsor.tier === "Platinum" ? "border-[#c4b396]/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]" : "border-[#c4b396]/10"}`}
                            >
                              {/* Left side: Sponsor Logo Box */}
                              <div 
                                onClick={() => setSelectedSponsor(sponsor)}
                                className="w-28 h-36 bg-[#c4b396]/5 flex-shrink-0 flex items-center justify-center p-3 border-r border-neutral-800/40 relative cursor-pointer"
                              >
                                <div className="h-14 w-full bg-[#c4b396] rounded border border-[#c4b396]/20 p-1.5 flex items-center justify-center overflow-hidden shadow-inner">
                                  <img 
                                    src={sponsor.logo} 
                                    alt={sponsor.name} 
                                    className="max-h-full max-w-full object-contain filter brightness-100"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${sponsor.name}&backgroundColor=121214&textColor=D4AF37`;
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Right side: content */}
                              <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-start gap-1">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h3 
                                          onClick={() => setSelectedSponsor(sponsor)}
                                          className="text-xs font-bold text-white leading-snug hover:text-[#c4b396] transition-colors truncate cursor-pointer"
                                        >
                                          {sponsor.name}
                                        </h3>
                                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 ${sponsor.tier === "Platinum" ? "bg-[#c4b396] text-[#070707]" : "bg-neutral-700 text-white"}`}>
                                          {sponsor.tier}
                                        </span>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => toggleFavoriteSponsor(sponsor.id)}
                                      className="p-0.5 hover:text-[#c4b396] text-neutral-500 transition-colors flex-shrink-0"
                                    >
                                      <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-[#c4b396] text-[#c4b396]' : ''}`} />
                                    </button>
                                  </div>
                                  <p className="text-[10px] font-medium text-[#c4b396] truncate">{sponsor.tier} Sponsor Partner</p>
                                  <p className="text-[9px] text-[#8E9CAE] truncate">Official Summit Partner</p>
                                  <p className="text-[10px] text-[#8E9CAE]/70 line-clamp-2 leading-relaxed pt-1">
                                    {sponsor.description}
                                  </p>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-neutral-800/40 mt-1">
                                  <Button 
                                    variant="link" 
                                    onClick={() => setSelectedSponsor(sponsor)}
                                    className="text-[9px] text-[#c4b396] p-0 h-auto font-bold uppercase tracking-wider"
                                  >
                                    View Profile & Website
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ATTENDEES TAB */}
        {/* ========================================================================= */}
        {!isSpeakerDetailRoute && currentTab === "attendees" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-wider text-[#c4b396] font-serif-luxury">Attendees</h2>
              <p className="text-xs text-[#8E9CAE]">Browse registered summit attendees.</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8E9CAE]" />
              <Input
                type="text"
                placeholder="Search attendees by name or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#121214] border-[#c4b396]/15 focus:border-[#c4b396] pl-9 text-white placeholder:text-[#8E9CAE]/40"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {members
                .filter((member) => member.type === "attendee")
                .filter((member) => {
                  const query = searchQuery.toLowerCase();
                  return (
                    member.name.toLowerCase().includes(query) ||
                    member.company.toLowerCase().includes(query) ||
                    member.role.toLowerCase().includes(query)
                  );
                })
                .map((member) => (
                  <div
                    key={member.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAttendee(member)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedAttendee(member);
                      }
                    }}
                    className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-4 flex items-center gap-3 hover:border-[#c4b396]/30 transition-all cursor-pointer"
                  >
                    <MemberAvatar member={member} className="h-10 w-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white truncate">{member.name}</h3>
                      <p className="text-[10px] text-[#8E9CAE] truncate">{member.role || member.company}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. MY SAVED ITEMS TAB */}
        {/* ========================================================================= */}
        {!isSpeakerDetailRoute && currentTab === "saved" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-wider text-[#c4b396] font-serif-luxury">My Saved Items</h2>
              <p className="text-xs text-[#8E9CAE]">Your private locally stored conference binder.</p>
            </div>

            <Tabs defaultValue="scans" className="w-full">
              <TabsList className="grid grid-cols-3 bg-[#121214] border border-[#c4b396]/10 p-1">
                <TabsTrigger value="scans" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#c4b396] data-[state=active]:text-[#070707]">
                  Scans ({savedScans.length})
                </TabsTrigger>
                <TabsTrigger value="schedule" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#c4b396] data-[state=active]:text-[#070707]">
                  My Schedule ({favoriteSessions.length})
                </TabsTrigger>
                <TabsTrigger value="favorites" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#c4b396] data-[state=active]:text-[#070707]">
                  Saved ({favoriteSpeakers.length + favoriteSponsors.length + favoriteExhibitors.length})
                </TabsTrigger>
              </TabsList>

              {/* SAVED SCANS */}
              <TabsContent value="scans" className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#c4b396]">Scan History</h3>
                  {savedScans.length > 0 && (
                    <Button 
                      onClick={exportScansAsCSV}
                      variant="outline"
                      size="sm"
                      className="border-[#c4b396]/30 text-white hover:border-[#c4b396] text-[10px] h-8 font-bold uppercase tracking-wider"
                    >
                      <FileDown className="h-3.5 w-3.5 mr-1.5 text-[#c4b396]" /> Export CSV
                    </Button>
                  )}
                </div>

                {savedScans.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center space-y-2">
                    <QrCode className="h-8 w-8 text-neutral-600 mx-auto" />
                    <p className="text-xs text-[#8E9CAE]">No scanned badges yet.</p>
                    <Button 
                      onClick={() => handleTabChange("scan")}
                      size="sm"
                      className="bg-[#c4b396] text-[#070707] text-[10px] font-bold uppercase tracking-wider"
                    >
                      Scan Badges Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedScans.map(scan => (
                      <div 
                        key={scan.id}
                        className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-3 hover:border-[#c4b396]/30 transition-all flex items-center justify-between gap-3"
                      >
                        <div 
                          onClick={() => setSelectedScanDetail(scan)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            {scan.name}
                            <span className={`text-[7px] font-bold px-1 rounded uppercase ${scan.type === 'speaker' ? 'bg-[#c4b396] text-[#070707]' : 'bg-neutral-800 text-[#8E9CAE]'}`}>
                              {scan.type}
                            </span>
                          </h4>
                          {scan.company && (
                            <p className="text-[10px] text-[#8E9CAE] truncate">{scan.role} • {scan.company}</p>
                          )}
                          <p className="text-[9px] text-[#8E9CAE]/60 truncate">
                            Scanned {new Date(scan.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ID: {scan.memberId.substring(0, 8)}...
                          </p>
                          {scan.notes && (
                            <p className="text-[10px] text-[#c4b396]/80 truncate mt-1 italic">
                              Note: "{scan.notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => downloadVCard(scan)}
                            className="h-8 w-8 hover:bg-neutral-800 hover:text-white text-[#8E9CAE]"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteScan(scan.id)}
                            className="h-8 w-8 hover:bg-red-950/40 hover:text-red-400 text-neutral-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* MY SCHEDULE */}
              <TabsContent value="schedule" className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#c4b396]">My Schedule</h3>
                  {favoriteSessions.length > 0 && (
                    <Button 
                      onClick={downloadAllICS}
                      variant="outline"
                      size="sm"
                      className="border-[#c4b396]/30 text-white hover:border-[#c4b396] text-[10px] h-8 font-bold uppercase tracking-wider"
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-[#c4b396]" /> Add all to Cal
                    </Button>
                  )}
                </div>

                {favoriteSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center space-y-2">
                    <Calendar className="h-8 w-8 text-neutral-600 mx-auto" />
                    <p className="text-xs text-[#8E9CAE]">Your schedule is currently empty.</p>
                    <Button 
                      onClick={() => handleTabChange("schedule")}
                      size="sm"
                      className="bg-[#c4b396] text-[#070707] text-[10px] font-bold uppercase tracking-wider"
                    >
                      Browse Schedule
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedule
                      .map(d => d.agenda)
                      .flat()
                      .filter(s => favoriteSessions.includes(s.id))
                      .map(session => (
                        <div 
                          key={session.id}
                          className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-3 hover:border-[#c4b396]/30 transition-all flex items-center justify-between gap-3"
                        >
                          <div 
                            onClick={() => setSelectedSession(session)}
                            className="flex-1 min-w-0 cursor-pointer space-y-1"
                          >
                            <h4 className="text-xs font-bold text-white truncate hover:text-[#c4b396] transition-colors">
                              {session.title}
                            </h4>
                            <div className="flex gap-3 text-[9px] text-[#8E9CAE]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-[#c4b396]" /> {session.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-[#c4b396]" /> {session.room}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0 items-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => downloadICS(session)}
                              title="Add to Calendar"
                              className="h-8 w-8 text-neutral-500 hover:text-[#c4b396] hover:bg-neutral-800 cursor-pointer"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleFavoriteSession(session.id)}
                              title="Remove from Saved"
                              className="h-8 w-8 text-[#c4b396] hover:bg-neutral-800 cursor-pointer"
                            >
                              <Bookmark className="h-4 w-4 fill-[#c4b396]" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </TabsContent>

              {/* FAVORITE SPEAKERS / SPONSORS / EXHIBITORS */}
              <TabsContent value="favorites" className="space-y-4 pt-4">
                {/* Speakers */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#c4b396]">Favorite Speakers</h3>
                  {favoriteSpeakers.length === 0 ? (
                    <p className="text-[10px] text-[#8E9CAE]/60 italic pl-2">No favorite speakers saved yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {speakers
                        .filter(s => favoriteSpeakers.includes(s.id))
                        .map(speaker => (
                          <div 
                            key={speaker.id}
                            className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-2 hover:border-[#c4b396]/30 transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateToSpeaker(speaker.id)}>
                              <img 
                                src={speaker.image || speakerPlaceholderUrl(speaker.name)} 
                                alt={speaker.name} 
                                className="h-10 w-10 rounded-full object-cover object-top border border-neutral-800"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = speakerPlaceholderUrl(speaker.name);
                                }}
                              />
                              <div>
                                <h4 className="text-xs font-bold text-white">{speaker.name}</h4>
                                <p className="text-[9px] text-[#8E9CAE]">{speaker.company}</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleFavoriteSpeaker(speaker.id)}
                              className="h-8 w-8 text-[#c4b396] hover:bg-neutral-800"
                            >
                              <Bookmark className="h-4 w-4 fill-[#c4b396]" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Sponsors */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#c4b396]">Saved Sponsors</h3>
                  {favoriteSponsors.length === 0 ? (
                    <p className="text-[10px] text-[#8E9CAE]/60 italic pl-2">No saved sponsors yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sponsors
                        .filter(s => favoriteSponsors.includes(s.id))
                        .map(sponsor => (
                          <div 
                            key={sponsor.id}
                            className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-2 hover:border-[#c4b396]/30 transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-16 bg-neutral-900 rounded p-1 flex items-center justify-center overflow-hidden">
                                <img src={sponsor.logo} className="max-h-full max-w-full object-contain" alt={sponsor.name} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white">{sponsor.name}</h4>
                                <p className="text-[9px] text-[#8E9CAE]">Sponsor</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleFavoriteSponsor(sponsor.id)}
                              className="h-8 w-8 text-[#c4b396] hover:bg-neutral-800"
                            >
                              <Bookmark className="h-4 w-4 fill-[#c4b396]" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Exhibitors */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#c4b396]">Saved Exhibitors</h3>
                  {favoriteExhibitors.length === 0 ? (
                    <p className="text-[10px] text-[#8E9CAE]/60 italic pl-2">No saved exhibitors yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {exhibitors
                        .filter(e => favoriteExhibitors.includes(e.id))
                        .map(ex => (
                          <div 
                            key={ex.id}
                            className="rounded-xl border border-[#c4b396]/10 bg-[#121214] p-2 hover:border-[#c4b396]/30 transition-all flex items-center justify-between"
                          >
                            <div>
                              <h4 className="text-xs font-bold text-white">{ex.name}</h4>
                              <p className="text-[9px] text-[#8E9CAE]">{ex.booth} • {ex.category}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleFavoriteExhibitor(ex.id)}
                              className="h-8 w-8 text-[#c4b396] hover:bg-neutral-800"
                            >
                              <Bookmark className="h-4 w-4 fill-[#c4b396]" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* DIALOGS / DETAIL MODALS */}
      {/* ========================================================================= */}
      


      {/* 2. SESSION DETAIL DIALOG */}
      {selectedSession && (
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="max-w-md bg-[#121214] border-[#c4b396]/30 text-[#F8FAFC] p-6 space-y-4">
            {/* Screen Reader Accessible Title */}
            <div className="sr-only">
              <DialogTitle>{selectedSession.title}</DialogTitle>
              <DialogDescription>Session scheduled at {selectedSession.time}</DialogDescription>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-wider">
                Ritz-Carlton, Miami
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white leading-snug font-serif-luxury">{selectedSession.title}</h3>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-lg bg-[#18181B] border border-neutral-800 p-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#c4b396] flex-shrink-0" />
                  <div>
                    <p className="text-[8px] text-[#8E9CAE] uppercase tracking-wider">Time</p>
                    <p className="text-[10px] font-bold text-white">{selectedSession.time}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-[#18181B] border border-neutral-800 p-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#c4b396] flex-shrink-0" />
                  <div>
                    <p className="text-[8px] text-[#8E9CAE] uppercase tracking-wider">Room</p>
                    <p className="text-[10px] font-bold text-white">{selectedSession.room}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396]">Description</h4>
              <p className="text-xs text-[#8E9CAE] leading-relaxed max-h-36 overflow-y-auto scrollbar-none">
                {selectedSession.description}
              </p>
            </div>

            {selectedSession.speakers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396]">Session Speakers</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedSession.speakers.map(spName => {
                    const matchedSp = speakers.find(s => s.name === spName);
                    return (
                      <div 
                        key={spName}
                        onClick={() => {
                          if (matchedSp) {
                            setLocation(`/speaker/${matchedSp.id}`);
                            setSelectedSession(null);
                          }
                        }}
                        className={`rounded-lg bg-[#18181B] border border-neutral-800 p-2 flex items-center justify-between ${matchedSp ? 'cursor-pointer hover:border-[#c4b396]/40' : ''}`}
                      >
                        <div className="flex items-center gap-2.5">
                          {matchedSp && (
                            <img 
                              src={matchedSp.image} 
                              alt={spName} 
                              className="h-8 w-8 rounded-full object-cover object-top"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${spName}&backgroundColor=121214&textColor=D4AF37`;
                              }}
                            />
                          )}
                          <div>
                            <h5 className="text-xs font-bold text-white">{spName}</h5>
                            {matchedSp && <p className="text-[9px] text-[#8E9CAE]">{matchedSp.company}</p>}
                          </div>
                        </div>
                        {matchedSp && <ChevronRight className="h-4 w-4 text-neutral-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-neutral-800 flex gap-2">
              <Button 
                onClick={() => toggleFavoriteSession(selectedSession.id)}
                variant="outline"
                className="flex-1 border-neutral-800 text-[#8E9CAE] hover:text-white hover:bg-white/5 h-10 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                {favoriteSessions.includes(selectedSession.id) ? "Saved" : "Save Session"}
              </Button>
              <Button 
                onClick={() => downloadICS(selectedSession)}
                className="flex-1 bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider h-10 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Calendar className="h-4 w-4 shrink-0" /> Add to Calendar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. SIMULATED SCAN RESULT DIALOG */}
      {showScanResult && (
        <Dialog open={showScanResult} onOpenChange={() => setShowScanResult(false)}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md overflow-x-hidden bg-[#121214] border-[#c4b396]/30 text-[#F8FAFC] p-6 space-y-4">
            {/* Screen Reader Accessible Title */}
            <div className="sr-only">
              <DialogTitle>{scannedMember ? scannedMember.name : "Scanned Attendee"}</DialogTitle>
              <DialogDescription>Scanned badge matching results</DialogDescription>
            </div>
            <div className="text-center space-y-1 min-w-0">
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-widest">
                Scan Match Found
              </span>
              <h3 className="text-lg font-bold text-white font-serif-luxury pt-1 break-words">
                {scannedMember ? scannedMember.name : "Unknown Attendee"}
              </h3>
              <p className="text-[10px] text-[#8E9CAE] break-all">ID: {scannedId}</p>
            </div>

            {/* Profile Info */}
            <div className="rounded-xl bg-[#18181B] border border-neutral-800 p-4 space-y-3 min-w-0 overflow-hidden">
              {scannedMember ? (
                <div className="space-y-3 min-w-0">
                  <div className="flex gap-3 items-start min-w-0">
                    <MemberAvatar member={scannedMember} className="h-12 w-12 rounded-lg text-sm" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#c4b396] break-words">{scannedMember.role}</h4>
                      <p className="text-xs text-white break-words">{scannedMember.company}</p>
                    </div>
                    <span className="text-[8px] font-black px-2 py-0.5 rounded bg-neutral-800 text-white uppercase tracking-wider shrink-0">
                      {scannedMember.type}
                    </span>
                  </div>

                  {scannedMember.bio && (
                    <p className="text-[11px] text-[#8E9CAE] leading-relaxed whitespace-pre-wrap border-t border-neutral-800/60 pt-2">
                      {scannedMember.bio}
                    </p>
                  )}
                  
                  <div className="pt-2 border-t border-neutral-800/60 space-y-1 text-[11px] text-[#8E9CAE] min-w-0">
                    {scannedMember.email && <p className="flex items-start gap-1.5 break-all"><Mail className="h-3 w-3 shrink-0 text-[#c4b396] mt-0.5" /> {scannedMember.email}</p>}
                    {scannedMember.phone && <p className="flex items-start gap-1.5 break-all"><Phone className="h-3 w-3 shrink-0 text-[#c4b396] mt-0.5" /> {scannedMember.phone}</p>}
                    {scannedMember.website && <p className="flex items-start gap-1.5 break-all"><Globe className="h-3 w-3 shrink-0 text-[#c4b396] mt-0.5" /> {scannedMember.website}</p>}
                    <MemberSocialLinks person={scannedMember} variant="inline" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 space-y-1">
                  <p className="text-xs text-red-400 font-bold">Attendee ID Not in Local Registry</p>
                  <p className="text-[10px] text-[#8E9CAE]">
                    This badge does not match any registered attendee profile.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2 min-w-0">
              <Button 
                onClick={() => setShowScanResult(false)}
                variant="outline"
                className="flex-1 min-w-0 border-neutral-800 text-[#8E9CAE] hover:text-white hover:bg-white/5 h-10 rounded-lg text-xs uppercase font-bold"
              >
                Close
              </Button>
              {scannedMember && (
                <Button 
                  onClick={() => {
                    downloadVCard(scannedMember);
                    setShowScanResult(false);
                  }}
                  className="flex-1 min-w-0 bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider h-10 rounded-lg flex items-center justify-center gap-1 px-2"
                >
                  <FileDown className="h-4 w-4 shrink-0" /> Save Contact
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 4. ATTENDEE DETAIL DIALOG */}
      {selectedAttendee && (
        <Dialog open={!!selectedAttendee} onOpenChange={() => setSelectedAttendee(null)}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md overflow-x-hidden bg-[#121214] border-[#c4b396]/30 text-[#F8FAFC] p-6 space-y-4">
            <div className="sr-only">
              <DialogTitle>{selectedAttendee.name}</DialogTitle>
              <DialogDescription>Attendee profile details</DialogDescription>
            </div>
            <div className="text-center space-y-1 min-w-0">
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-widest">
                Attendee Profile
              </span>
              <h3 className="text-lg font-bold text-white font-serif-luxury pt-1 break-words">
                {selectedAttendee.name}
              </h3>
            </div>

            <div className="rounded-xl bg-[#18181B] border border-neutral-800 p-4 space-y-3 min-w-0 overflow-hidden">
              <div className="flex gap-3 items-start min-w-0">
                <MemberAvatar member={selectedAttendee} className="h-12 w-12 rounded-lg text-sm" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#c4b396] break-words">
                    {selectedAttendee.role || "Attendee"}
                  </h4>
                  {selectedAttendee.company && (
                    <p className="text-xs text-white break-words">{selectedAttendee.company}</p>
                  )}
                </div>
                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-neutral-800 text-white uppercase tracking-wider shrink-0">
                  {selectedAttendee.type}
                </span>
              </div>

              {selectedAttendee.bio && (
                <p className="text-[11px] text-[#8E9CAE] leading-relaxed whitespace-pre-wrap border-t border-neutral-800/60 pt-2">
                  {selectedAttendee.bio}
                </p>
              )}

              <div className="pt-2 border-t border-neutral-800/60 space-y-1 text-[11px] text-[#8E9CAE] min-w-0">
                {selectedAttendee.email && (
                  <p className="flex items-start gap-1.5 break-all">
                    <Mail className="h-3 w-3 shrink-0 text-[#c4b396] mt-0.5" />
                    <a href={`mailto:${selectedAttendee.email}`} className="hover:text-white transition-colors">
                      {selectedAttendee.email}
                    </a>
                  </p>
                )}
                {selectedAttendee.phone && (
                  <p className="flex items-start gap-1.5 break-all">
                    <Phone className="h-3 w-3 shrink-0 text-[#c4b396] mt-0.5" />
                    <a href={`tel:${selectedAttendee.phone}`} className="hover:text-white transition-colors">
                      {selectedAttendee.phone}
                    </a>
                  </p>
                )}
                {selectedAttendee.website && (
                  <p className="flex items-start gap-1.5 break-all">
                    <Globe className="h-3 w-3 shrink-0 text-[#c4b396] mt-0.5" />
                    <a
                      href={selectedAttendee.website.startsWith("http") ? selectedAttendee.website : `https://${selectedAttendee.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {selectedAttendee.website}
                    </a>
                  </p>
                )}
                <MemberSocialLinks person={selectedAttendee} variant="inline" />
                {!hasContactDetails(selectedAttendee) && (
                  <p className="text-[10px] text-[#8E9CAE]/70 italic">No contact details on file.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 min-w-0">
              {(() => {
                const matchedSpeaker =
                  speakers.find(s => s.id === selectedAttendee.id) ||
                  speakers.find(
                    s =>
                      s.name.toLowerCase() === selectedAttendee.name.toLowerCase() ||
                      (s.email &&
                        selectedAttendee.email &&
                        s.email.toLowerCase() === selectedAttendee.email.toLowerCase())
                  );
                if (!matchedSpeaker) return null;
                return (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAttendee(null);
                      navigateToSpeaker(matchedSpeaker.id);
                    }}
                    className="w-full border-[#c4b396]/30 text-[#c4b396] hover:bg-[#c4b396]/10 h-10 rounded-lg text-xs uppercase font-bold"
                  >
                    View Speaker Profile
                  </Button>
                );
              })()}
              <div className="flex gap-2.5 min-w-0">
                <Button
                  onClick={() => setSelectedAttendee(null)}
                  variant="outline"
                  className="flex-1 min-w-0 border-neutral-800 text-[#8E9CAE] hover:text-white hover:bg-white/5 h-10 rounded-lg text-xs uppercase font-bold"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    downloadVCard(selectedAttendee);
                    setSelectedAttendee(null);
                  }}
                  className="flex-1 min-w-0 bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider h-10 rounded-lg flex items-center justify-center gap-1 px-2"
                >
                  <FileDown className="h-4 w-4 shrink-0" /> Save Contact
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. SCAN RECORD DETAIL DIALOG */}
      {selectedScanDetail && (
        <Dialog open={!!selectedScanDetail} onOpenChange={() => setSelectedScanDetail(null)}>
          <DialogContent className="max-w-md bg-[#121214] border-[#c4b396]/30 text-[#F8FAFC] p-6 space-y-4">
            {/* Screen Reader Accessible Title */}
            <div className="sr-only">
              <DialogTitle>{selectedScanDetail.name}</DialogTitle>
              <DialogDescription>Saved lead details</DialogDescription>
            </div>
            <div className="text-center space-y-1">
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-widest">
                Saved Badge Profile
              </span>
              <h3 className="text-lg font-bold text-white font-serif-luxury pt-1">{selectedScanDetail.name}</h3>
              <p className="text-[10px] text-[#8E9CAE]">Scanned on {new Date(selectedScanDetail.timestamp).toLocaleString()}</p>
            </div>

            <div className="rounded-xl bg-[#18181B] border border-neutral-800 p-4 space-y-3">
              <div className="flex gap-3 items-center">
                {/* Speaker Headshot Match */}
                {(() => {
                  const matchedSpeaker = speakers.find(s => s.name.toLowerCase() === selectedScanDetail.name.toLowerCase() || (s.email && s.email.toLowerCase() === selectedScanDetail.email?.toLowerCase()));
                  if (matchedSpeaker) {
                    return (
                      <img 
                        src={matchedSpeaker.image} 
                        alt={selectedScanDetail.name} 
                        className="h-12 w-12 rounded-lg object-cover object-top border border-[#c4b396]/30 bg-neutral-900"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${selectedScanDetail.name}&backgroundColor=121214&textColor=D4AF37`;
                        }}
                      />
                    );
                  }
                  return (
                    <div className="h-12 w-12 rounded-lg bg-neutral-800 flex items-center justify-center text-[#c4b396] font-bold text-sm">
                      {selectedScanDetail.name.charAt(0)}
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#c4b396] truncate">{selectedScanDetail.role || "Attendee"}</h4>
                  <p className="text-xs text-white truncate">{selectedScanDetail.company || "MetFix Affiliate"}</p>
                </div>
                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-neutral-800 text-white uppercase tracking-wider shrink-0">
                  {selectedScanDetail.type}
                </span>
              </div>
              
              <div className="pt-2 border-t border-neutral-800/60 space-y-1 text-[11px] text-[#8E9CAE]">
                {selectedScanDetail.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-[#c4b396]" /> {selectedScanDetail.email}</p>}
                {selectedScanDetail.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-[#c4b396]" /> {selectedScanDetail.phone}</p>}
                {selectedScanDetail.website && <p className="flex items-center gap-1.5"><Globe className="h-3 w-3 text-[#c4b396]" /> {selectedScanDetail.website}</p>}
                <MemberSocialLinks person={selectedScanDetail} variant="inline" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => downloadVCard(selectedScanDetail)}
                className="flex-1 bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider h-10 rounded-lg"
              >
                <FileDown className="h-4 w-4 mr-1.5" /> Save to Device
              </Button>
              <Button 
                onClick={() => deleteScan(selectedScanDetail.id)}
                variant="outline"
                className="border-red-950 text-red-400 hover:bg-red-950/40 hover:text-red-400 h-10 rounded-lg text-xs uppercase font-bold"
              >
                Delete Scan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. SPONSOR DETAIL DIALOG */}
      {selectedSponsor && (
        <Dialog open={!!selectedSponsor} onOpenChange={() => setSelectedSponsor(null)}>
          <DialogContent className="max-w-md bg-[#121214] border-[#c4b396]/30 text-[#F8FAFC] p-6 space-y-4">
            {/* Screen Reader Accessible Title */}
            <div className="sr-only">
              <DialogTitle>{selectedSponsor.name}</DialogTitle>
              <DialogDescription>{selectedSponsor.tier} sponsor profile</DialogDescription>
            </div>
            <div className="text-center space-y-2">
              <div className="h-16 w-36 bg-[#c4b396] rounded-lg border border-[#c4b396]/20 p-2 flex items-center justify-center overflow-hidden mx-auto shadow-inner">
                <img 
                  src={selectedSponsor.logo} 
                  alt={selectedSponsor.name} 
                  className="max-h-full max-w-full object-contain filter brightness-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${selectedSponsor.name}&backgroundColor=121214&textColor=D4AF37`;
                  }}
                />
              </div>
              <div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${selectedSponsor.tier === "Platinum" ? "bg-[#c4b396] text-[#070707]" : "bg-neutral-700 text-white"}`}>
                  {selectedSponsor.tier} Sponsor
                </span>
                <h3 className="text-lg font-bold text-white font-serif-luxury mt-1">{selectedSponsor.name}</h3>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-neutral-800/60">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396]">About the Sponsor</h4>
              <p className="text-xs text-[#8E9CAE] leading-relaxed">
                {selectedSponsor.description}
              </p>
            </div>

            {/* Social and Website Links */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396]">Relevant Links</h4>
              <div className="grid grid-cols-1 gap-2">
                <a 
                  href={selectedSponsor.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#18181B] border border-neutral-800 p-2.5 flex items-center justify-between text-xs text-white hover:border-[#c4b396]/40 hover:bg-[#1C1C1F] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#c4b396]" />
                    Official Website
                  </span>
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                </a>

                {selectedSponsor.socials?.instagram && (
                  <a 
                    href={selectedSponsor.socials.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[#18181B] border border-neutral-800 p-2.5 flex items-center justify-between text-xs text-white hover:border-[#c4b396]/40 hover:bg-[#1C1C1F] transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-[#c4b396]" />
                      Instagram Profile
                    </span>
                    <ExternalLink className="h-3 w-3 text-neutral-500" />
                  </a>
                )}

                {selectedSponsor.socials?.facebook && (
                  <a 
                    href={selectedSponsor.socials.facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[#18181B] border border-neutral-800 p-2.5 flex items-center justify-between text-xs text-white hover:border-[#c4b396]/40 hover:bg-[#1C1C1F] transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-[#c4b396]" />
                      Facebook Page
                    </span>
                    <ExternalLink className="h-3 w-3 text-neutral-500" />
                  </a>
                )}

                {selectedSponsor.socials?.linkedin && (
                  <a 
                    href={selectedSponsor.socials.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[#18181B] border border-neutral-800 p-2.5 flex items-center justify-between text-xs text-white hover:border-[#c4b396]/40 hover:bg-[#1C1C1F] transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-[#c4b396]" />
                      LinkedIn Profile
                    </span>
                    <ExternalLink className="h-3 w-3 text-neutral-500" />
                  </a>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex gap-2">
              <Button 
                onClick={() => toggleFavoriteSponsor(selectedSponsor.id)}
                className="flex-1 bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] font-bold text-xs uppercase tracking-wider h-10 rounded-lg"
              >
                {favoriteSponsors.includes(selectedSponsor.id) ? "Remove from Saved" : "Save Sponsor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* FEEDBACK / QUESTIONS DIALOG */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md w-[90vw] rounded-2xl border border-[#c4b396]/20 bg-[#0A0A0A] p-6 text-white shadow-2xl">
          <DialogTitle className="text-xl font-bold font-serif-luxury text-white tracking-wide flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#c4b396]" /> We'd Love Your Feedback
          </DialogTitle>
          <DialogDescription className="text-xs text-[#8E9CAE] mt-1 leading-relaxed">
            Please share your thoughts on the weekend! Submit any questions you have for the MetFix team
          </DialogDescription>

          <form 
            action="https://formspree.io/f/mnjrrbog" 
            method="POST"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              
              const submitButton = form.querySelector("button[type='submit']") as HTMLButtonElement;
              if (submitButton) submitButton.disabled = true;
              
              try {
                const response = await fetch(form.action, {
                  method: form.method,
                  body: data,
                  headers: {
                    'Accept': 'application/json'
                  }
                });
                
                if (response.ok) {
                  toast.success("Feedback submitted successfully! Thank you.");
                  form.reset();
                  setFeedbackOpen(false);
                } else {
                  const result = await response.json();
                  if (result.errors) {
                    toast.error(result.errors.map((error: any) => error.message).join(", "));
                  } else {
                    toast.error("Oops! There was a problem submitting your form.");
                  }
                }
              } catch (error) {
                toast.error("Oops! There was a problem submitting your form.");
              } finally {
                if (submitButton) submitButton.disabled = false;
              }
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="feedback-email" className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396]">
                Your Email Address
              </label>
              <Input 
                id="feedback-email"
                type="email" 
                name="email" 
                placeholder="you@example.com" 
                required 
                className="bg-[#121214] border-neutral-800 focus:border-[#c4b396] text-white rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="feedback-message" className="text-[10px] font-bold uppercase tracking-widest text-[#c4b396]">
                Message / Feedback / Questions
              </label>
              <textarea 
                id="feedback-message"
                name="message" 
                placeholder="Tell us about your experience or ask a question..." 
                required 
                rows={4}
                className="w-full bg-[#121214] border border-neutral-800 focus:border-[#c4b396] focus:ring-1 focus:ring-[#c4b396] text-white rounded-xl p-3 text-xs outline-none transition-all resize-none"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setFeedbackOpen(false)}
                className="flex-1 border-neutral-800 text-[#8E9CAE] hover:text-white hover:bg-white/5 h-10 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1 bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] h-10 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Submit Feedback
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PROFILE SIDEBAR */}
      <Sheet
        open={profileOpen}
        onOpenChange={(open) => {
          setProfileOpen(open);
          if (!open) setIsEditingProfile(false);
        }}
      >
        <SheetContent
          side="right"
          className="bg-[#121214] border-[#c4b396]/15 text-[#F8FAFC] w-full sm:max-w-sm overflow-y-auto flex flex-col px-8 sm:px-10 pb-safe"
        >
          {loggedInUser && (
            <>
              <SheetHeader className="px-0 pt-0 pb-4 border-b border-[#c4b396]/10">
                <div className="flex items-center gap-4 pr-10">
                  <MemberAvatar member={loggedInUser} className="h-14 w-14 text-xl" />
                  <div className="space-y-1 text-left flex-1 min-w-0">
                    <SheetTitle className="text-white font-serif-luxury text-lg">{loggedInUser.name}</SheetTitle>
                    <SheetDescription className="text-[#8E9CAE] text-xs">
                      {loggedInUser.role || loggedInUser.company}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {!isEditingProfile && isSupabaseConfigured() && (
                <Button
                  type="button"
                  onClick={startEditingProfile}
                  className="w-full bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] [&_svg]:text-[#070707] h-11 rounded-lg text-xs font-bold uppercase tracking-wider gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}

              {isEditingProfile ? (
                <div className="space-y-4 py-2 flex-1">
                  <p className="text-[10px] text-[#8E9CAE] leading-relaxed">
                    Update your contact info. Changes are visible when others scan your badge.
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Profile Photo
                      </Label>
                      <div className="flex items-center gap-4">
                        {profilePhotoPreview ? (
                          <img
                            src={profilePhotoPreview}
                            alt="Profile preview"
                            className="h-16 w-16 rounded-full object-cover border border-[#c4b396]/30"
                          />
                        ) : (
                          <MemberAvatar member={{ name: loggedInUser.name }} className="h-16 w-16 text-lg" />
                        )}
                        <div className="flex flex-col gap-2 flex-1">
                          <input
                            ref={profilePhotoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleProfilePhotoChange}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => profilePhotoInputRef.current?.click()}
                            className="border-[#c4b396]/30 text-[#c4b396] hover:bg-[#c4b396]/10 h-9 text-[10px] font-bold uppercase tracking-wider"
                          >
                            Choose Photo
                          </Button>
                          {(profilePhotoPreview || loggedInUser.image) && !profilePhotoRemoved && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleRemoveProfilePhoto}
                              className="h-8 text-[10px] text-[#8E9CAE] hover:text-red-400"
                            >
                              Remove Photo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-bio" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Bio
                      </Label>
                      <Textarea
                        id="profile-bio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell others a little about yourself..."
                        rows={4}
                        maxLength={500}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs resize-none"
                      />
                      <p className="text-[9px] text-[#8E9CAE] text-right">{profileForm.bio.length}/500</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-role" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Role / Title
                      </Label>
                      <Input
                        id="profile-role"
                        value={profileForm.role}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, role: e.target.value }))}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                        placeholder="Your role or title"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-company" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Company
                      </Label>
                      <Input
                        id="profile-company"
                        value={profileForm.company}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, company: e.target.value }))}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                        placeholder="Company or organization"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-email" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Email
                      </Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-phone" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Phone
                      </Label>
                      <Input
                        id="profile-phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                        placeholder="+1 (555) 555-0100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-website" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Website
                      </Label>
                      <Input
                        id="profile-website"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                        placeholder="https://yoursite.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-instagram" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Instagram
                      </Label>
                      <Input
                        id="profile-instagram"
                        value={profileForm.instagram}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, instagram: e.target.value }))}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                        placeholder="https://instagram.com/you"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-facebook" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        Facebook
                      </Label>
                      <Input
                        id="profile-facebook"
                        value={profileForm.facebook}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, facebook: e.target.value }))}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                        placeholder="https://facebook.com/you"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-linkedin" className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">
                        LinkedIn
                      </Label>
                      <Input
                        id="profile-linkedin"
                        value={profileForm.linkedin}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, linkedin: e.target.value }))}
                        className="bg-[#070707] border-[#c4b396]/20 text-white text-xs h-10"
                        placeholder="https://linkedin.com/in/you"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingProfile(false)}
                      disabled={isSavingProfile}
                      className="flex-1 border-[#c4b396]/30 text-white hover:bg-white/5 h-10 rounded-lg text-xs font-bold uppercase tracking-wider"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="flex-1 bg-[#c4b396] hover:bg-[#c4b396]/80 text-[#070707] h-10 rounded-lg text-xs font-bold uppercase tracking-wider"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          Saving
                        </>
                      ) : (
                        "Save Profile"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#c4b396]/10 text-[#c4b396] border border-[#c4b396]/20 uppercase tracking-wider">
                      {loggedInUser.type || "attendee"}
                    </span>
                  </div>

                  {(loggedInUser.company || loggedInUser.role) && (
                    <div className="rounded-xl border border-[#c4b396]/10 bg-[#070707] p-3 space-y-1">
                      <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">Company</p>
                      <p className="text-sm text-white">{loggedInUser.company || loggedInUser.role}</p>
                    </div>
                  )}

                  {loggedInUser.bio && (
                    <div className="rounded-xl border border-[#c4b396]/10 bg-[#070707] p-3 space-y-1">
                      <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">Bio</p>
                      <p className="text-xs text-[#8E9CAE] leading-relaxed whitespace-pre-wrap">{loggedInUser.bio}</p>
                    </div>
                  )}

                  {loggedInUser.email ? (
                    <a
                      href={`mailto:${loggedInUser.email}`}
                      className="flex items-center gap-3 rounded-xl border border-[#c4b396]/10 bg-[#070707] p-3 hover:border-[#c4b396]/30 transition-all"
                    >
                      <Mail className="h-4 w-4 text-[#c4b396] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">Email</p>
                        <p className="text-xs text-white truncate">{loggedInUser.email}</p>
                      </div>
                    </a>
                  ) : isSupabaseConfigured() ? (
                    <div className="rounded-xl border border-dashed border-[#c4b396]/20 bg-[#070707] p-3">
                      <p className="text-[10px] text-[#8E9CAE]">No email yet. Tap Edit Profile to add your contact info.</p>
                    </div>
                  ) : null}

                  {loggedInUser.phone && (
                    <a
                      href={`tel:${loggedInUser.phone}`}
                      className="flex items-center gap-3 rounded-xl border border-[#c4b396]/10 bg-[#070707] p-3 hover:border-[#c4b396]/30 transition-all"
                    >
                      <Phone className="h-4 w-4 text-[#c4b396] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">Phone</p>
                        <p className="text-xs text-white">{loggedInUser.phone}</p>
                      </div>
                    </a>
                  )}

                  {loggedInUser.website && (
                    <a
                      href={loggedInUser.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-[#c4b396]/10 bg-[#070707] p-3 hover:border-[#c4b396]/30 transition-all"
                    >
                      <Globe className="h-4 w-4 text-[#c4b396] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">Website</p>
                        <p className="text-xs text-[#c4b396] truncate">{loggedInUser.website.replace(/^https?:\/\//, "")}</p>
                      </div>
                    </a>
                  )}

                  <MemberSocialLinks person={loggedInUser} />

                  <div className="rounded-xl border border-[#c4b396]/10 bg-[#070707] p-3 space-y-1">
                    <p className="text-[9px] font-bold text-[#8E9CAE] uppercase tracking-wider">Badge ID</p>
                    <p className="text-xs text-white font-mono break-all">{loggedInUser.id}</p>
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-[#c4b396]/10 px-0">
                <Button
                  onClick={logout}
                  variant="outline"
                  className="w-full border-red-900/40 text-red-400 hover:bg-red-950/20 hover:text-red-300 h-10 rounded-lg text-xs font-bold uppercase tracking-wider gap-2"
                >
                  <LogOut className="h-4 w-4" /> Log Out
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* BOTTOM TAB NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#c4b396]/15 bg-[#070707]/95 backdrop-blur-md pt-2 pb-safe px-4 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button 
            onClick={() => handleTabChange("home")}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === "home" ? "text-[#c4b396]" : "text-[#8E9CAE] hover:text-white"}`}
          >
            <HomeIcon className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
          </button>
          
          <button 
            onClick={() => handleTabChange("schedule")}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === "schedule" ? "text-[#c4b396]" : "text-[#8E9CAE] hover:text-white"}`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Schedule</span>
          </button>
          
          <button 
            onClick={() => handleTabChange("scan")}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === "scan" ? "text-[#c4b396]" : "text-[#8E9CAE] hover:text-white"}`}
          >
            <QrCode className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Scan</span>
          </button>
          
          <button 
            onClick={() => handleTabChange("speakers")}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === "speakers" ? "text-[#c4b396]" : "text-[#8E9CAE] hover:text-white"}`}
          >
            <Mic className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Speakers</span>
          </button>
          
          <button 
            onClick={() => handleTabChange("attendees")}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === "attendees" ? "text-[#c4b396]" : "text-[#8E9CAE] hover:text-white"}`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Attendees</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
