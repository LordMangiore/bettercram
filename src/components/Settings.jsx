import { useState, useEffect } from "react";
import { saveProfile, loadProfile } from "../api";

const SUBJECT_OPTIONS = [
  { id: "mcat", label: "MCAT", icon: "fa-solid fa-stethoscope" },
  { id: "nclex", label: "NCLEX", icon: "fa-solid fa-heart-pulse" },
  { id: "ap-bio", label: "AP Biology", icon: "fa-solid fa-dna" },
  { id: "ap-chem", label: "AP Chemistry", icon: "fa-solid fa-flask" },
  { id: "orgo", label: "Organic Chemistry", icon: "fa-solid fa-atom" },
  { id: "biochem", label: "Biochemistry", icon: "fa-solid fa-vial" },
  { id: "anatomy", label: "Anatomy & Physiology", icon: "fa-solid fa-bone" },
  { id: "literature", label: "Literature", icon: "fa-solid fa-book" },
  { id: "nursing", label: "Nursing", icon: "fa-solid fa-user-nurse" },
  { id: "premed", label: "Pre-Med", icon: "fa-solid fa-user-doctor" },
  { id: "gen-science", label: "General Science", icon: "fa-solid fa-microscope" },
  { id: "other", label: "Other", icon: "fa-solid fa-ellipsis" },
];

const FAMILIARITY_OPTIONS = [
  { id: "brand-new", label: "Brand new to me" },
  { id: "seen-before", label: "Seen it before but don't remember much" },
  { id: "know-basics", label: "I know the basics, need to go deeper" },
  { id: "reviewing", label: "Reviewing for an exam \u2014 I've studied this before" },
];

const STUDY_STYLE_OPTIONS = [
  { id: "encouragement", label: "I panic a little and need encouragement" },
  { id: "grind", label: "I grind through it \u2014 just keep going" },
  { id: "understand-why", label: "I need to understand WHY before I can memorize" },
  { id: "quiz-me", label: "I do better when someone quizzes me" },
];

const STUDY_CONTEXT_OPTIONS = [
  { id: "student-time", label: "Student with plenty of time" },
  { id: "student-work", label: "Student juggling work and school" },
  { id: "professional", label: "Working professional studying on the side" },
  { id: "cramming", label: "Cramming \u2014 exam is soon" },
];

function RadioGroup({ label, options, value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`w-full text-left px-3 py-3 rounded-lg border text-sm transition-all ${
              value === opt.id
                ? "bg-indigo-600/20 border-indigo-500 text-white"
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings({ user, profile: initialProfile, onBack, onProfileUpdate }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [familiarity, setFamiliarity] = useState("");
  const [studyStyle, setStudyStyle] = useState("");
  const [studyContext, setStudyContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name || user?.name || "");
      setUsername(initialProfile.username || "");
      setSubjects(initialProfile.subjects || []);
      setFamiliarity(initialProfile.familiarity || "");
      setStudyStyle(initialProfile.studyStyle || "");
      setStudyContext(initialProfile.studyContext || "");
      setLoading(false);
    } else {
      // Load from server
      loadProfile()
        .then(({ profile }) => {
          if (profile) {
            setName(profile.name || user?.name || "");
            setUsername(profile.username || "");
            setSubjects(profile.subjects || []);
            setFamiliarity(profile.familiarity || "");
            setStudyStyle(profile.studyStyle || "");
            setStudyContext(profile.studyContext || "");
          } else {
            setName(user?.name || "");
          }
        })
        .catch(() => {
          setName(user?.name || "");
        })
        .finally(() => setLoading(false));
    }
  }, [initialProfile, user]);

  function toggleSubject(id) {
    setSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const profile = {
        name: name.trim(),
        username: username.trim(),
        email: user?.email || "",
        subjects,
        familiarity: familiarity || null,
        studyStyle: studyStyle || null,
        studyContext: studyContext || null,
        onboardingComplete: true,
      };
      const { profile: updated } = await saveProfile(profile);
      if (onProfileUpdate) onProfileUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Save settings failed:", e);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 transition-colors">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      {/* Profile section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Profile</h2>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 min-h-[44px] text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Username</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 min-h-[44px] text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">Email</label>
            <p className="text-sm text-gray-400 px-3 py-2">{user?.email || "Not set"}</p>
          </div>
        </div>
      </section>

      {/* Subjects section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Study Subjects</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {SUBJECT_OPTIONS.map((opt) => {
            const selected = subjects.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleSubject(opt.id)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
                  selected
                    ? "bg-indigo-600/20 border-indigo-500 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <i className={`${opt.icon} w-4 text-center ${selected ? "text-indigo-400" : "text-gray-500"}`} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Nova Preferences section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Nova Preferences</h2>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-5">
          <RadioGroup
            label="How familiar are you with your material?"
            options={FAMILIARITY_OPTIONS}
            value={familiarity}
            onChange={setFamiliarity}
          />
          <RadioGroup
            label="How do you handle tough material?"
            options={STUDY_STYLE_OPTIONS}
            value={studyStyle}
            onChange={setStudyStyle}
          />
          <RadioGroup
            label="What's your study situation?"
            options={STUDY_CONTEXT_OPTIONS}
            value={studyContext}
            onChange={setStudyContext}
          />
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 font-semibold rounded-xl transition-all ${
          saved
            ? "bg-emerald-600 text-white"
            : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60"
        }`}
      >
        {saving ? (
          <><i className="fa-solid fa-spinner fa-spin mr-2" />Saving...</>
        ) : saved ? (
          <><i className="fa-solid fa-check mr-2" />Saved!</>
        ) : (
          "Save Changes"
        )}
      </button>
    </div>
  );
}
