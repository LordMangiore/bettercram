/**
 * Empathy Engine Pressure Test
 *
 * Simulates 8 different student scenarios and calls the observer endpoint
 * to see what perspective briefs Claude generates for each.
 *
 * Run: node test-empathy.mjs
 * Requires: ANTHROPIC_API_KEY in environment (or uses Netlify function)
 */

const BASE = process.env.BASE_URL || "https://bettercram.com";

const SCENARIOS = [
  {
    name: "🆕 Brand new student, first night, orgo",
    equation: { P: 95, D: 1.0, A: 1, S: 0.1, R: 2, EW: 475 },
    session: { streakHeat: 0, frustration: 0.6, momentum: 0.2 },
    card: { front: "What is the mechanism of SN2 nucleophilic substitution?", back: "Backside attack, concerted mechanism, inversion of stereochemistry", category: "Organic Chemistry Mechanisms" },
    deckName: "Organic Chemistry I & II",
    categories: "Mechanisms, Stereochemistry, Spectroscopy, Synthesis",
    timeOfDay: "It's the middle of the night. This person is still studying.",
    userProfile: { studyStyle: "encouragement", studyContext: "student-work", familiarity: "brand-new" },
  },
  {
    name: "🔥 On fire, 15-card streak, MCAT bio",
    equation: { P: 15, D: 0.95, A: 180, S: 1.8, R: 8, EW: 0.0055 },
    session: { streakHeat: 0.95, frustration: 0.02, momentum: 0.92 },
    card: { front: "How does antidiuretic hormone (ADH) regulate water reabsorption?", back: "ADH binds V2 receptors on collecting duct, inserts aquaporin-2 channels", category: "Renal Physiology" },
    deckName: "MCAT Biology",
    categories: "Renal, Cardiovascular, Neuro, Endocrine, Immunology",
    timeOfDay: "",
    userProfile: { studyStyle: "quiz-me", studyContext: "cramming", familiarity: "reviewing" },
  },
  {
    name: "😞 Struggling student, high frustration, 11pm",
    equation: { P: 72, D: 0.98, A: 30, S: 0.25, R: 3, EW: 3.13 },
    session: { streakHeat: 0, frustration: 0.65, momentum: 0.3 },
    card: { front: "Differentiate between Type I and Type II errors in hypothesis testing", back: "Type I: rejecting true null (false positive, alpha). Type II: failing to reject false null (false negative, beta)", category: "Biostatistics" },
    deckName: "MCAT Psychology & Sociology",
    categories: "Biostatistics, Research Design, Social Psychology, Neuroscience",
    timeOfDay: "It's late. They've had an entire day before this moment.",
    userProfile: { studyStyle: "understand-why", studyContext: "student-work", familiarity: "seen-before" },
  },
  {
    name: "💪 Competent but plateaued, same deck for weeks",
    equation: { P: 30, D: 0.5, A: 250, S: 1.2, R: 7, EW: 0.0071 },
    session: { streakHeat: 0.3, frustration: 0.15, momentum: 0.7 },
    card: null,
    deckName: "NCLEX Pharmacology",
    categories: "Antibiotics, Cardiac, Psych Meds, Pain Management, Endocrine",
    timeOfDay: "",
    userProfile: { studyStyle: "grind", studyContext: "professional", familiarity: "know-basics" },
  },
  {
    name: "🌅 Early morning cramming, exam tomorrow",
    equation: { P: 45, D: 0.99, A: 60, S: 0.6, R: 5, EW: 0.248 },
    session: { streakHeat: 0.1, frustration: 0.3, momentum: 0.55 },
    card: { front: "What are the Henderson-Hasselbalch equation applications in buffer systems?", back: "pH = pKa + log([A-]/[HA]). Used to calculate pH of buffer solutions and predict ionization state of drugs", category: "Biochemistry" },
    deckName: "Biochemistry Final",
    categories: "Buffers, Enzyme Kinetics, Metabolism, Amino Acids",
    timeOfDay: "Early morning. They chose to study before the day started pulling them in other directions.",
    userProfile: { studyStyle: "encouragement", studyContext: "cramming", familiarity: "seen-before" },
  },
  {
    name: "🧠 Smart student, new topic, not used to failing",
    equation: { P: 88, D: 0.95, A: 150, S: 0.15, R: 9, EW: 0.41 },
    session: { streakHeat: 0, frustration: 0.45, momentum: 0.35 },
    card: { front: "Explain the concept of quantum tunneling in enzyme catalysis", back: "Hydrogen atoms can pass through energy barriers rather than over them, contributing to catalytic rate enhancement beyond classical transition state theory", category: "Advanced Biochemistry" },
    deckName: "Advanced Biochemistry",
    categories: "Quantum Biology, Enzyme Mechanisms, Thermodynamics",
    timeOfDay: "",
    userProfile: { studyStyle: "understand-why", studyContext: "student-time", familiarity: "brand-new" },
  },
  {
    name: "😴 Student at 2am, been studying for hours, low energy",
    equation: { P: 40, D: 0.85, A: 90, S: 0.7, R: 5, EW: 0.108 },
    session: { streakHeat: 0.05, frustration: 0.25, momentum: 0.5 },
    card: { front: "What is the role of p53 in cell cycle regulation?", back: "Tumor suppressor, activates p21 to inhibit CDK/cyclin complexes, can trigger apoptosis if DNA damage is irreparable", category: "Cell Biology" },
    deckName: "MCAT Biology",
    categories: "Cell Biology, Genetics, Molecular Biology, Physiology",
    timeOfDay: "It's the middle of the night. This person is still studying.",
    userProfile: { studyStyle: "grind", studyContext: "student-work", familiarity: "know-basics" },
  },
  {
    name: "🎉 Just had a breakthrough, first time everything clicked",
    equation: { P: 50, D: 0.99, A: 45, S: 0.9, R: 6, EW: 0.204 },
    session: { streakHeat: 0.8, frustration: 0.05, momentum: 0.85 },
    card: { front: "How do beta-lactam antibiotics work?", back: "Inhibit transpeptidase (PBP) enzyme, preventing cross-linking of peptidoglycan in bacterial cell wall synthesis", category: "Pharmacology" },
    deckName: "NCLEX Pharmacology",
    categories: "Antibiotics, Mechanisms, Drug Classes, Side Effects",
    timeOfDay: "",
    userProfile: { studyStyle: "quiz-me", studyContext: "student-time", familiarity: "seen-before" },
  },
];

async function runScenario(scenario) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`SCENARIO: ${scenario.name}`);
  console.log(`EW: ${scenario.equation.EW} | P:${scenario.equation.P} S:${scenario.equation.S.toFixed(2)} R:${scenario.equation.R} | Frustration: ${(scenario.session.frustration * 100).toFixed(0)}% Momentum: ${(scenario.session.momentum * 100).toFixed(0)}%`);
  console.log(`${"=".repeat(70)}`);

  try {
    const res = await fetch(`${BASE}/.netlify/functions/empathy-assess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": "test-empathy-harness",
      },
      body: JSON.stringify(scenario),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`FAILED: ${res.status} ${err}`);
      return;
    }

    const data = await res.json();
    console.log(`\nOBSERVER BRIEF:\n${data.brief}`);
    console.log(`\n[${data.brief.split(" ").length} words]`);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
  }
}

async function main() {
  console.log("EMPATHY ENGINE PRESSURE TEST");
  console.log(`Testing against: ${BASE}`);
  console.log(`Scenarios: ${SCENARIOS.length}`);
  console.log(`${"=".repeat(70)}\n`);

  for (const scenario of SCENARIOS) {
    await runScenario(scenario);
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("DONE. Review the briefs above for:");
  console.log("1. Does each brief feel different? (No two students are the same)");
  console.log("2. Does it capture the FEELING, not just the data?");
  console.log("3. Would a human tutor find this useful?");
  console.log("4. Does the 'Right now, they need ___' line nail it?");
  console.log(`${"=".repeat(70)}`);
}

main();
