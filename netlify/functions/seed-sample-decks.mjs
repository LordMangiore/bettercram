import { getStore } from "@netlify/blobs";

const SAMPLE_DECKS = {
  "deck-organic-chem": {
    name: "Organic Chemistry",
    cards: [
      { id: "oc-1", front: "What is an SN1 reaction?", back: "A unimolecular nucleophilic substitution reaction that proceeds through a carbocation intermediate. The rate depends only on the substrate concentration.", category: "Organic Chemistry" },
      { id: "oc-2", front: "What is an SN2 reaction?", back: "A bimolecular nucleophilic substitution that occurs in one concerted step with backside attack. Rate depends on both substrate and nucleophile concentration.", category: "Organic Chemistry" },
      { id: "oc-3", front: "What is Markovnikov's rule?", back: "When HX adds to an asymmetric alkene, the hydrogen attaches to the carbon with more hydrogen atoms, and the halide to the more substituted carbon.", category: "Organic Chemistry" },
      { id: "oc-4", front: "What is a chiral center?", back: "A carbon atom bonded to four different substituents, creating a stereocenter that produces non-superimposable mirror images (enantiomers).", category: "Organic Chemistry" },
      { id: "oc-5", front: "What is the difference between E1 and E2 elimination?", back: "E1 is unimolecular (two steps via carbocation), favored by weak bases. E2 is bimolecular (one concerted step), favored by strong bases and requires anti-periplanar geometry.", category: "Organic Chemistry" },
      { id: "oc-6", front: "What are enantiomers?", back: "Stereoisomers that are non-superimposable mirror images. They have identical physical properties except for rotating plane-polarized light in opposite directions.", category: "Organic Chemistry" },
      { id: "oc-7", front: "What is a Grignard reagent?", back: "An organomagnesium halide (RMgX) that acts as a strong nucleophile and base. Used to form new C-C bonds by reacting with carbonyl compounds.", category: "Organic Chemistry" },
      { id: "oc-8", front: "What is aromaticity?", back: "A cyclic, planar, fully conjugated molecule with (4n+2) pi electrons (Hückel's rule). Aromatic compounds are unusually stable due to electron delocalization.", category: "Organic Chemistry" },
      { id: "oc-9", front: "What is a Fischer projection?", back: "A 2D representation of a 3D organic molecule where horizontal lines represent bonds toward the viewer and vertical lines represent bonds going away.", category: "Organic Chemistry" },
      { id: "oc-10", front: "What is an aldol reaction?", back: "A reaction between two carbonyl compounds where the enolate of one attacks the carbonyl of another, forming a β-hydroxy carbonyl compound.", category: "Organic Chemistry" },
      { id: "oc-11", front: "What determines SN1 vs SN2?", back: "Substrate (3° = SN1, 1° = SN2), nucleophile strength (strong = SN2), solvent (polar protic = SN1, polar aprotic = SN2), leaving group ability.", category: "Organic Chemistry" },
      { id: "oc-12", front: "What is a diastereomer?", back: "Stereoisomers that are NOT mirror images. They have different physical properties and different R/S configurations at some (but not all) stereocenters.", category: "Organic Chemistry" },
    ],
    cardCount: 12,
    createdAt: new Date().toISOString(),
  },
  "deck-anatomy": {
    name: "Anatomy & Physiology",
    cards: [
      { id: "an-1", front: "What are the four chambers of the heart?", back: "Right atrium, right ventricle, left atrium, left ventricle. Right side pumps deoxygenated blood to lungs; left side pumps oxygenated blood to the body.", category: "Anatomy" },
      { id: "an-2", front: "What is the function of the nephron?", back: "The functional unit of the kidney that filters blood, reabsorbs useful substances, and secretes waste to form urine.", category: "Anatomy" },
      { id: "an-3", front: "What are the three types of muscle tissue?", back: "Skeletal (voluntary, striated), cardiac (involuntary, striated, intercalated discs), smooth (involuntary, non-striated, found in organs).", category: "Anatomy" },
      { id: "an-4", front: "What is the function of the medulla oblongata?", back: "Controls autonomic functions: heart rate, blood pressure, breathing, swallowing, vomiting. Located in the brainstem.", category: "Anatomy" },
      { id: "an-5", front: "What are the layers of the skin?", back: "Epidermis (outer, keratinized), dermis (connective tissue, vessels, nerves), hypodermis (fat storage, insulation).", category: "Anatomy" },
      { id: "an-6", front: "Sympathetic vs parasympathetic nervous system?", back: "Sympathetic = fight or flight (↑HR, dilates pupils). Parasympathetic = rest and digest (↓HR, stimulates digestion).", category: "Anatomy" },
      { id: "an-7", front: "What are the major endocrine glands?", back: "Hypothalamus, pituitary, thyroid, parathyroid, adrenals, pancreas, gonads, pineal gland.", category: "Anatomy" },
      { id: "an-8", front: "What is the function of the cerebellum?", back: "Coordinates voluntary movements, balance, posture, motor learning. Fine-tunes motor activity and maintains equilibrium.", category: "Anatomy" },
      { id: "an-9", front: "What are the components of blood?", back: "Plasma (55%), red blood cells, white blood cells, platelets. Plasma contains water, proteins, electrolytes, waste.", category: "Anatomy" },
      { id: "an-10", front: "What is the dual function of the pancreas?", back: "Exocrine: digestive enzymes (lipase, amylase, trypsin). Endocrine: insulin (β cells, lowers glucose) and glucagon (α cells, raises glucose).", category: "Anatomy" },
      { id: "an-11", front: "What is the lymphatic system?", back: "Returns interstitial fluid to blood, transports dietary fats, houses immune cells. Includes lymph nodes, spleen, thymus, tonsils.", category: "Anatomy" },
      { id: "an-12", front: "What is the function of the liver?", back: "Detoxification, bile production, glycogen storage, protein synthesis, cholesterol metabolism, drug metabolism.", category: "Anatomy" },
      { id: "an-13", front: "What are the major components of the respiratory system?", back: "Nose/mouth, pharynx, larynx, trachea, bronchi, bronchioles, alveoli. Gas exchange at alveoli: O2 in, CO2 out.", category: "Anatomy" },
    ],
    cardCount: 13,
    createdAt: new Date().toISOString(),
  },
  "deck-physics": {
    name: "Physics 101",
    cards: [
      { id: "ph-1", front: "What is Newton's Second Law?", back: "F = ma. Net force equals mass × acceleration. Force and acceleration are vectors in the same direction.", category: "Physics" },
      { id: "ph-2", front: "Kinetic vs potential energy?", back: "Kinetic (KE = ½mv²) is energy of motion. Potential is stored energy from position (PE = mgh) or configuration (PE = ½kx²).", category: "Physics" },
      { id: "ph-3", front: "What is Ohm's Law?", back: "V = IR. Voltage = current × resistance. Applies to ohmic conductors with constant resistance.", category: "Physics" },
      { id: "ph-4", front: "First law of thermodynamics?", back: "Energy cannot be created or destroyed. ΔU = Q - W (internal energy change = heat added - work done).", category: "Physics" },
      { id: "ph-5", front: "What is the Doppler effect?", back: "Change in frequency/wavelength as source and observer move relative to each other. Approaching = higher frequency; receding = lower frequency.", category: "Physics" },
      { id: "ph-6", front: "Wave speed equation?", back: "v = fλ. Speed = frequency × wavelength. For EM waves in vacuum, v = c = 3 × 10⁸ m/s.", category: "Physics" },
      { id: "ph-7", front: "What is Coulomb's Law?", back: "F = kq₁q₂/r². Electrostatic force is proportional to charge product, inversely proportional to distance squared.", category: "Physics" },
      { id: "ph-8", front: "Series vs parallel circuits?", back: "Series: same current, V adds, R adds. Parallel: same voltage, I adds, 1/R_total = 1/R1 + 1/R2.", category: "Physics" },
      { id: "ph-9", front: "What is buoyant force?", back: "Upward force from fluid. Archimedes: buoyant force = weight of displaced fluid. F_b = ρ_fluid × V × g.", category: "Physics" },
      { id: "ph-10", front: "Second law of thermodynamics?", back: "Entropy of isolated system always increases. Heat flows hot → cold spontaneously. No 100% efficient heat engine.", category: "Physics" },
      { id: "ph-11", front: "What is Bernoulli's principle?", back: "In flowing fluid, increased speed = decreased pressure. P + ½ρv² + ρgh = constant along streamline.", category: "Physics" },
      { id: "ph-12", front: "What is the photoelectric effect?", back: "Light above threshold frequency ejects electrons from metal. Energy depends on frequency not intensity. E = hf - φ.", category: "Physics" },
      { id: "ph-13", front: "What is angular momentum?", back: "L = Iω or L = r × p. Conserved when no external torque acts on the system.", category: "Physics" },
    ],
    cardCount: 13,
    createdAt: new Date().toISOString(),
  },
  "deck-psychology": {
    name: "Psychology 101",
    cards: [
      { id: "ps-1", front: "Piaget's four stages of cognitive development?", back: "Sensorimotor (0-2), Preoperational (2-7), Concrete Operational (7-11), Formal Operational (11+).", category: "Psychology" },
      { id: "ps-2", front: "What is classical conditioning?", back: "Learning through association. Neutral stimulus paired with unconditioned stimulus until it alone produces the response. Pavlov's dogs.", category: "Psychology" },
      { id: "ps-3", front: "Positive vs negative reinforcement?", back: "Positive: add pleasant stimulus → increase behavior. Negative: remove unpleasant stimulus → increase behavior. Both INCREASE behavior.", category: "Psychology" },
      { id: "ps-4", front: "What is Maslow's hierarchy of needs?", back: "Physiological → Safety → Love/Belonging → Esteem → Self-Actualization. Lower needs must be met before higher needs motivate.", category: "Psychology" },
      { id: "ps-5", front: "What is the bystander effect?", back: "People less likely to help in emergencies when others present. Diffusion of responsibility increases with group size.", category: "Psychology" },
      { id: "ps-6", front: "What are the Big Five personality traits?", back: "OCEAN: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism.", category: "Psychology" },
      { id: "ps-7", front: "What is cognitive dissonance?", back: "Mental discomfort from contradictory beliefs/behaviors. People reduce it by changing beliefs, adding new ones, or minimizing importance.", category: "Psychology" },
      { id: "ps-8", front: "Short-term vs long-term memory?", back: "STM: ~7 items, 15-30 sec. LTM: unlimited capacity, potentially permanent. Transfer needs encoding/rehearsal.", category: "Psychology" },
      { id: "ps-9", front: "Erikson's crisis for adolescence?", back: "Identity vs Role Confusion (12-18). Teens explore identity and develop sense of self.", category: "Psychology" },
      { id: "ps-10", front: "What is the fundamental attribution error?", back: "Overestimating personality factors, underestimating situational factors when explaining others' behavior.", category: "Psychology" },
      { id: "ps-11", front: "Kübler-Ross stages of grief?", back: "Denial → Anger → Bargaining → Depression → Acceptance. Not everyone experiences all stages or in order.", category: "Psychology" },
      { id: "ps-12", front: "What is operant conditioning?", back: "Learning through consequences. Reinforcement increases behavior; punishment decreases it. B.F. Skinner.", category: "Psychology" },
    ],
    cardCount: 12,
    createdAt: new Date().toISOString(),
  },
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");
    let userId = "default";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId = payload.sub || "default";
      } catch {}
    }

    const store = getStore(`decks-${userId}`);

    // Only seed if user has no decks
    const { blobs } = await store.list();
    if (blobs.length > 0) {
      return Response.json({ seeded: false, message: "User already has decks" });
    }

    // Seed all sample decks
    for (const [id, deck] of Object.entries(SAMPLE_DECKS)) {
      await store.setJSON(id, deck);
    }

    return Response.json({ seeded: true, count: Object.keys(SAMPLE_DECKS).length });
  } catch (err) {
    console.error("Seed error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
