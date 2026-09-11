/**
 * Course book seed (addendum 5, A2 and A5): the "Easy Ultrasound" book with
 * its 13 chapters, and eight blog drafts written fresh from the book's topics.
 *
 * The drafts are unpublished and flagged `needsReview` so a doctor approves
 * the medical content first. None of them carries an image: the book's scan
 * images may not be used on the site (A6), so each draft ends with a TODO
 * asking the office for scans from MUTI's own machine.
 */

export const seedCourseBook = {
  slug: "easy-ultrasound",
  title: "Easy Ultrasound",
  subtitle: "Abdomen & Pregnancy",
  edition: "2026",
  pages: 66,
  priceNote: "Included in the book fee",
  sampleChapterTitle: "Chapter 01: USG Physics",
  description:
    "<p>Written by MUTI faculty in simple question and answer style, this is the book every CMU and DMU student learns from. Abdomen and pregnancy scanning, normal measurements, pathology and report writing.</p>",
  descriptionBn:
    "<p>MUTI-র শিক্ষকদের লেখা সহজ প্রশ্নোত্তর ধাঁচের এই বইটি থেকেই প্রতিটি CMU ও DMU শিক্ষার্থী শেখেন। অ্যাবডোমেন ও প্রেগন্যান্সি স্ক্যানিং, নরমাল মেজারমেন্ট, প্যাথলজি ও রিপোর্ট লেখা।</p>",
  courseCodes: ["CMU", "CMU-BTEB", "DMU", "ADMU"],
};

export type SeedChapter = {
  number: number;
  title: string;
  titleBn: string;
  summary: string;
  topics: string[];
  isSample?: boolean;
};

export const seedChapters: SeedChapter[] = [
  {
    number: 1,
    title: "USG Physics",
    titleBn: "আল্ট্রাসাউন্ড ফিজিক্স",
    summary:
      "Sound, ultrasound frequency, echogenicity types, artifacts, machine parts, probe types",
    topics: [
      "Echogenicity",
      "Posterior shadow and enhancement",
      "Linear / convex / sector probes",
      "Coupling gel",
    ],
    isSample: true,
  },
  {
    number: 2,
    title: "USG of Liver",
    titleBn: "লিভারের আল্ট্রাসাউন্ড",
    summary:
      "Normal size, patient preparation, hepatitis, CLD, fatty liver, cysts, abscess, tumours, portal hypertension",
    topics: [
      "Hypoechoic vs hyperechoic liver",
      "Fine vs coarse granular",
      "Hydatid cyst",
      "HCC",
      "Metastasis",
    ],
  },
  {
    number: 3,
    title: "USG of Gall Bladder and CBD",
    titleBn: "গলব্লাডার ও CBD-র আল্ট্রাসাউন্ড",
    summary:
      "Normal measurements, cholecystitis, gallstones, polyp, mass, choledocholithiasis",
    topics: ["GB wall thickness", "Stone with shadow", "CBD stone"],
  },
  {
    number: 4,
    title: "USG of Pancreas",
    titleBn: "প্যানক্রিয়াসের আল্ট্রাসাউন্ড",
    summary:
      "Normal size, calcification, pancreatitis, cyst, abscess, tumours, duct dilatation",
    topics: ["Acute vs chronic pancreatitis", "Adenocarcinoma", "Pancreatic duct"],
  },
  {
    number: 5,
    title: "USG of Spleen",
    titleBn: "স্প্লিনের আল্ট্রাসাউন্ড",
    summary:
      "Normal size by age, splenomegaly grading, cyst, abscess, calcification, lymphoma, trauma",
    topics: ["Splenomegaly stages", "Amoebic vs pyogenic abscess"],
  },
  {
    number: 6,
    title: "USG of Kidneys",
    titleBn: "কিডনির আল্ট্রাসাউন্ড",
    summary:
      "Normal appearance and size, hydronephrosis grading, stone, cyst, CKD, PUJ obstruction, tumours",
    topics: ["Hydronephrosis mild / moderate / marked", "RCC", "Wilms tumour"],
  },
  {
    number: 7,
    title: "USG of Urinary Bladder",
    titleBn: "মূত্রথলির আল্ট্রাসাউন্ড",
    summary: "Wall and volume measurement, cystitis, polyp, mass, stone, diverticulum",
    topics: ["MCC", "Volume formula", "Debris"],
  },
  {
    number: 8,
    title: "USG of Prostate",
    titleBn: "প্রোস্টেটের আল্ট্রাসাউন্ড",
    summary: "Normal size and volume, BEP grading, carcinoma, cyst, abscess, PVR",
    topics: ["BEP vs carcinoma", "Volume formula", "Post-void residual"],
  },
  {
    number: 9,
    title: "USG of Uterus",
    titleBn: "জরায়ুর আল্ট্রাসাউন্ড",
    summary:
      "Normal size by age and parity, fibroid types, endometrial thickness, hyperplasia, polyp, carcinoma, adenomyosis, IUCD",
    topics: ["Fibroid types", "Endometrial thickness by phase", "Endometritis"],
  },
  {
    number: 10,
    title: "USG of Adnexa (Ovary)",
    titleBn: "অ্যাডনেক্সা (ওভারি)-র আল্ট্রাসাউন্ড",
    summary:
      "Ovary size and volume, follicles, cysts, PCOS, dermoid, endometrioma, mass",
    topics: ["Follicular cyst", "Haemorrhagic cyst", "PCOS", "Dermoid"],
  },
  {
    number: 11,
    title: "USG of Cul-de-sac / Pouch of Douglas",
    titleBn: "কাল-ডি-স্যাক / পাউচ অব ডগলাসের আল্ট্রাসাউন্ড",
    summary: "Pouch of Douglas fluid, PID",
    topics: ["Free fluid", "PID"],
  },
  {
    number: 12,
    title: "USG of Early Pregnancy",
    titleBn: "আর্লি প্রেগন্যান্সির আল্ট্রাসাউন্ড",
    summary:
      "Gestational sac, yolk sac, fetal pole, CRL, blighted ovum, early pregnancy report format",
    topics: ["GS viability", "CRL", "Blighted ovum", "Report writing"],
  },
  {
    number: 13,
    title: "USG of Late Pregnancy",
    titleBn: "লেট প্রেগন্যান্সির আল্ট্রাসাউন্ড",
    summary:
      "BPD, FL, AC, AFI, placenta grading, fetal weight by week, late pregnancy report, abortion types, FDIU",
    topics: [
      "AFI ranges",
      "Placenta grade 0 to III",
      "Missed / incomplete abortion",
      "FDIU",
    ],
  },
];

const FOOTER = `<p><strong>Learn this hands-on in the MUTI CMU course.</strong> Every class includes scanning on real patients under a faculty member. <a href="/courses/cmu-regular">See the CMU course</a> or <a href="/course-book/easy-ultrasound">download a free chapter of our course book</a>.</p>
<p><em>TODO (office): this draft has no images on purpose. Add ultrasound images only from MUTI's own machine, with patient consent, before publishing. Do not use images from the book PDF.</em></p>`;

export type SeedBookPost = {
  slug: string;
  titleEn: string;
  excerpt: string;
  tags: string[];
  bodyEn: string;
};

export const seedBookPosts: SeedBookPost[] = [
  {
    slug: "echogenicity-explained-hyperechoic-hypoechoic-anechoic",
    titleEn:
      "Echogenicity explained: hyperechoic, hypoechoic and anechoic in ultrasound",
    excerpt:
      "The three words you will use in every ultrasound report, what they mean on the screen, and how to describe a structure without guessing.",
    tags: ["physics", "basics", "reporting"],
    bodyEn: `<h2>Why the word matters</h2>
<p>Almost every sentence in an ultrasound report describes how bright something looks. A liver is "normal in echotexture", a cyst is "anechoic", a stone is "hyperechoic with posterior shadowing". If you understand these three words properly, you can read any report and write your own with confidence. If you do not, you will keep guessing, and guesses show.</p>
<h2>Where the brightness comes from</h2>
<p>The probe sends short pulses of sound into the body. Whenever the pulse meets a boundary between two tissues with different acoustic properties, part of the sound bounces back. The machine measures how much came back and how long it took, and paints a dot: strong echoes are bright, weak echoes are dark, no echo is black. Echogenicity is simply the word for how much sound a tissue returns.</p>
<p>Two things decide that. The first is the difference in density and stiffness between neighbouring tissues. A sharp difference, such as soft tissue against bone or gas, reflects almost everything. The second is texture: tissues made of many tiny interfaces, like fat or fibrous tissue, scatter sound in all directions and look bright and grainy.</p>
<h2>Anechoic: black</h2>
<p>An anechoic structure returns no echoes at all, so it appears completely black. Simple fluid is the classic example: urine in the bladder, bile in the gall bladder, the fluid inside a simple cyst, amniotic fluid around a fetus. Because sound passes through fluid without losing energy, the tissue behind a fluid collection usually looks brighter than its neighbours. That bright band is called posterior acoustic enhancement, and it is the best confirmation that what you are looking at is truly fluid.</p>
<p>Be careful with the word "clear". A cyst with fine internal echoes, such as a haemorrhagic cyst or an abscess, is no longer anechoic. Describe it as hypoechoic with internal echoes or debris, and the reader knows it is not simple fluid.</p>
<h2>Hypoechoic: darker than the neighbour</h2>
<p>Hypoechoic means darker than a reference tissue, usually the organ around it. The renal pyramids are hypoechoic compared with the cortex. A lymph node is hypoechoic compared with fat. Many solid lesions, including a lot of tumours, are hypoechoic compared with the organ they sit in. The word only makes sense as a comparison, so say what you compared it with: "a hypoechoic lesion in segment VI of the liver".</p>
<h2>Hyperechoic: brighter than the neighbour</h2>
<p>Hyperechoic means brighter than the reference. Fat, fibrous tissue, calcification, gas and most interfaces are hyperechoic. The renal sinus is bright because it is full of fat. A haemangioma in the liver is typically a small, sharply defined hyperechoic nodule. A gall stone is intensely hyperechoic and, because it stops the sound completely, casts a clean black shadow behind it.</p>
<p>Isoechoic is the fourth word: the same brightness as the surrounding tissue. Isoechoic lesions are the hardest to see, and you often find them only because they push a vessel or bulge the outline of the organ.</p>
<h2>Three practical habits</h2>
<ol>
<li><strong>Always name the comparison.</strong> Liver against kidney, cortex against medulla, lesion against organ. The liver should be slightly brighter than the right kidney; if it is much brighter, think of fat.</li>
<li><strong>Look behind the structure.</strong> Enhancement behind means fluid. Shadow behind means stone, calcification or gas. This is often more reliable than the brightness of the structure itself.</li>
<li><strong>Set the gain before you judge.</strong> Too much gain makes fluid look grey and too little makes solid tissue look black. Adjust until the bladder or the gall bladder is clean black, then read the rest of the image.</li>
</ol>
<h2>A quick example</h2>
<p>A round structure in the right lobe of the liver: black inside, sharp thin wall, brighter tissue behind it. That is an anechoic lesion with posterior enhancement, in plain words a simple cyst. Change one thing, fine echoes inside and no enhancement, and the picture is different: a solid hypoechoic lesion that needs a proper work up. The same organ, the same probe, but the words tell two different stories.</p>
${FOOTER}`,
  },
  {
    slug: "posterior-acoustic-shadow-vs-enhancement-stone-vs-cyst",
    titleEn: "Posterior acoustic shadow vs enhancement: how to tell stone from cyst",
    excerpt:
      "Two artifacts that look like mistakes but are actually the most useful clues on the screen. What causes them and how to use them.",
    tags: ["physics", "artifacts", "gall bladder", "kidney"],
    bodyEn: `<h2>Artifacts that help</h2>
<p>New learners are told that artifacts are errors to be removed. Two of them are the opposite: they are the fastest way to decide what a structure is made of. Posterior acoustic shadowing and posterior acoustic enhancement both appear behind a structure, and both come from how much sound got through it.</p>
<h2>Posterior acoustic shadowing</h2>
<p>When the sound pulse meets something that absorbs or reflects nearly all of it, almost nothing travels further. The machine receives no echoes from the tissue behind, and paints it black. The result is a dark band, a shadow, extending away from the probe behind the structure.</p>
<p>Dense objects cast a clean shadow: gall stones, renal stones, calcified lymph nodes, bone. The edges are sharp and the shadow is fully black. Gas also blocks sound, but its shadow is dirty: grey, streaky and full of reverberation lines, because gas reflects the sound back and forth rather than absorbing it. A dirty shadow in the right upper quadrant is bowel gas, not a stone.</p>
<p>Small stones may not shadow if they are thinner than the beam. Two tricks help. Use the highest frequency the depth allows, and place the focal zone at the level of the stone so the beam is narrowest there. A stone that showed no shadow at 3.5 MHz often shows a clear one at 5 MHz with the focus set correctly.</p>
<h2>Posterior acoustic enhancement</h2>
<p>Fluid does the opposite. It lets the pulse pass almost without loss, so the tissue behind a fluid-filled structure receives more sound than the tissue beside it, and returns brighter echoes. The machine has already applied time gain compensation to make deeper tissue look uniform, so the extra energy behind the fluid shows up as a bright band.</p>
<p>Enhancement is the signature of fluid: simple cysts, the full bladder, the gall bladder, a distended renal pelvis. It is why the liver just behind the gall bladder looks brighter than the rest of the lobe. When a lesion is anechoic but shows no enhancement, question whether it is really fluid; a very hypoechoic solid mass can mimic a cyst on brightness alone.</p>
<h2>Stone or cyst: the decision</h2>
<table>
<thead><tr><th>Feature</th><th>Stone</th><th>Cyst</th></tr></thead>
<tbody>
<tr><td>Inside</td><td>Bright curved line, usually only the near surface is seen</td><td>Black, no internal echoes</td></tr>
<tr><td>Behind</td><td>Clean black shadow</td><td>Bright enhancement</td></tr>
<tr><td>Wall</td><td>None of its own; sits in a lumen</td><td>Thin, smooth, sharply defined</td></tr>
<tr><td>Mobility</td><td>Moves with patient position (gall bladder)</td><td>Fixed within the organ</td></tr>
</tbody>
</table>
<h2>Common traps</h2>
<ul>
<li><strong>Edge shadowing.</strong> The rounded edge of a cyst or the gall bladder refracts the beam and produces thin shadows at the sides. These are narrow lines from the edges, not a broad shadow from the centre, and they do not mean a stone.</li>
<li><strong>Sludge.</strong> Thick bile is echogenic but does not shadow and moves slowly with position. Do not call it stones.</li>
<li><strong>Polyp.</strong> A gall bladder polyp is echogenic, does not shadow and does not move. That combination separates it from a stone.</li>
<li><strong>Debris in a cyst.</strong> Internal echoes with preserved enhancement usually means a complicated fluid collection, such as blood or pus, still fluid but no longer simple.</li>
</ul>
<h2>Putting it together</h2>
<p>Before you describe any focal structure, look behind it. A shadow tells you it is dense; enhancement tells you it is fluid; nothing special tells you it is ordinary solid tissue. That one habit resolves most of the everyday questions on an abdominal scan and keeps your reports accurate.</p>
${FOOTER}`,
  },
  {
    slug: "fatty-liver-vs-chronic-liver-disease-ultrasound",
    titleEn: "Fatty liver vs chronic liver disease on ultrasound: how to differentiate",
    excerpt:
      "Both make the liver look abnormal, but for different reasons. The signs that separate a bright fatty liver from a shrunken, coarse cirrhotic one.",
    tags: ["liver", "abdomen", "pathology"],
    bodyEn: `<h2>Two different problems</h2>
<p>Fatty liver and chronic liver disease are the two most common liver findings on an abdominal scan in Bangladesh, and beginners often mix them up because both are described as "abnormal echotexture". They are different diseases with different appearances, and the ultrasound signs are quite reliable once you know what to look for.</p>
<h2>The normal liver first</h2>
<p>A normal liver has a fine, homogeneous, medium-grey texture. It is slightly brighter than the right kidney cortex when both are seen in the same image at the same depth. The portal vein walls stand out as bright lines within the parenchyma, the hepatic veins are visible as dark tubes without bright walls, and the diaphragm behind the right lobe is a crisp bright curve. The surface is smooth and the edge of the left lobe is sharp.</p>
<h2>Fatty liver: bright and smooth</h2>
<p>Fat scatters sound, so a fatty liver is brighter than normal. The key comparison is with the right kidney: in fatty infiltration the liver is clearly brighter than the renal cortex, and the difference grows with the amount of fat. Three other signs follow from the same physics:</p>
<ul>
<li><strong>Attenuation.</strong> The bright fat absorbs the beam, so the deep part of the liver becomes dark and the diaphragm is blurred or lost.</li>
<li><strong>Loss of vessel walls.</strong> The bright portal vein walls disappear into the equally bright parenchyma.</li>
<li><strong>Smooth texture.</strong> The grain stays fine. The liver may be enlarged with a rounded lower edge, but the surface remains smooth.</li>
</ul>
<p>Grading is descriptive. Mild: liver brighter than kidney, vessels and diaphragm still seen. Moderate: vessels becoming hard to see, mild attenuation. Severe: deep liver very dark, diaphragm and vessel walls not seen. Focal fatty sparing, usually near the gall bladder or the porta, is a darker patch inside a bright liver with no mass effect; do not call it a tumour.</p>
<h2>Chronic liver disease: coarse and irregular</h2>
<p>In chronic hepatitis and cirrhosis the problem is fibrosis and regenerating nodules, not fat. The texture becomes coarse: the grain is larger and uneven, often described as coarse granular. The liver may be enlarged early on, but with cirrhosis the right lobe shrinks while the caudate and left lobes enlarge. The surface becomes nodular, which is easiest to see with a high frequency probe against the anterior surface or where ascites outlines the liver.</p>
<p>The other half of the picture is portal hypertension: a portal vein wider than about 13 mm, sluggish or reversed flow on colour Doppler, an enlarged spleen, recanalised umbilical vein, varices at the splenic hilum, and ascites. Gall bladder wall thickening with ascites is common and is not cholecystitis.</p>
<h2>Side by side</h2>
<table>
<thead><tr><th>Feature</th><th>Fatty liver</th><th>Chronic liver disease</th></tr></thead>
<tbody>
<tr><td>Brightness</td><td>Increased, brighter than kidney</td><td>Normal or mildly increased</td></tr>
<tr><td>Texture</td><td>Fine, smooth</td><td>Coarse, heterogeneous</td></tr>
<tr><td>Deep penetration</td><td>Reduced, diaphragm blurred</td><td>Usually preserved</td></tr>
<tr><td>Surface</td><td>Smooth</td><td>Nodular in cirrhosis</td></tr>
<tr><td>Size</td><td>Often enlarged</td><td>Enlarged early, shrunken right lobe later</td></tr>
<tr><td>Spleen, portal vein, ascites</td><td>Normal</td><td>Splenomegaly, wide portal vein, ascites</td></tr>
</tbody>
</table>
<h2>When both are present</h2>
<p>Fatty liver can progress to steatohepatitis and fibrosis, so a bright liver with a coarse texture, a nodular surface or a large spleen should be reported as fatty change with features suggesting chronic liver disease, and the patient needs proper liver tests and follow up. In every cirrhotic liver, look carefully for any focal lesion: a new hypoechoic or mixed nodule in a cirrhotic background is hepatocellular carcinoma until proven otherwise.</p>
<h2>Report wording that helps the clinician</h2>
<p>Say what you saw, not just the label: "Liver is enlarged (16 cm), diffusely increased in echogenicity with posterior attenuation and poor visualisation of portal vein walls; surface smooth; no focal lesion; spleen and portal vein normal. Features suggest fatty infiltration, moderate." A sentence like that is worth more than the word "hepatomegaly".</p>
${FOOTER}`,
  },
  {
    slug: "normal-liver-spleen-kidney-measurements-new-sonologist",
    titleEn:
      "Normal liver, spleen and kidney measurements every new sonologist should know",
    excerpt:
      "The handful of numbers you measure on every abdominal scan, how to take them consistently, and the ranges to keep in your head.",
    tags: ["measurements", "abdomen", "basics"],
    bodyEn: `<h2>Measure the same way every time</h2>
<p>A measurement is only useful if it was taken the same way as the reference. Most disagreements about organ size come from different planes, different breathing and different callipers, not from the organ itself. Learn one standard method for each organ and stick to it.</p>
<h2>Liver</h2>
<p>The standard measurement is the craniocaudal length of the right lobe in the mid-clavicular line, on a longitudinal scan with the patient in quiet breathing or gentle inspiration. Place one calliper at the dome of the diaphragm and the other at the lower tip of the right lobe. In adults the upper limit is generally taken as about 15 cm; between 15 and 16 cm is borderline in tall people, and anything above 16 cm is enlarged. A Riedel lobe, a tongue-like extension of the right lobe, can make a normal liver measure long; check that the left lobe and the texture are normal before calling hepatomegaly.</p>
<p>Also note the lower edge: a sharp edge is normal, a rounded edge suggests enlargement or fatty change even when the length is borderline.</p>
<h2>Spleen</h2>
<p>Scan through the left lower intercostal spaces with the patient supine or in right lateral position, and find the longest axis of the spleen through the hilum. Measure the greatest length from pole to pole. About 12 cm is the usual upper limit in adults; 12 to 13 cm is mildly enlarged, and the spleen becomes progressively easier to see below the costal margin as it grows. Thickness at the hilum above about 5 cm supports the diagnosis. In children the spleen is smaller and rises with age, so use a paediatric chart.</p>
<p>Look for the accessory spleen, a small round splenic-density nodule near the hilum, which is normal and must not be reported as a lymph node.</p>
<h2>Kidneys</h2>
<p>Measure the bipolar length on the longest longitudinal image, usually with the patient in lateral or oblique position and the beam passing through the renal hilum. Adult kidneys measure roughly 10 to 12 cm; the left is often a few millimetres longer than the right. A difference of more than 1.5 cm between the two sides is worth a comment. Cortical thickness, measured from the outer edge of the cortex to the base of a pyramid, is normally more than about 1 cm; thin, bright cortex points to chronic kidney disease, while a small kidney with thin cortex is the end stage.</p>
<p>Compare the cortex with the liver on the right and the spleen on the left: normal cortex is slightly darker than both. Cortex as bright as the liver, or brighter, is abnormal in an adult.</p>
<h2>Gall bladder, CBD and portal vein</h2>
<p>These three are measured on almost every scan, so learn them together. The fasting gall bladder is up to about 10 cm long and 4 to 5 cm wide, with a wall up to 3 mm thick. The common bile duct is measured at the porta, inner wall to inner wall, and is up to 6 mm in adults, allowing about 1 mm extra per decade after 60 and a wider duct after cholecystectomy. The portal vein at the porta is up to about 13 mm; a wider vein suggests portal hypertension.</p>
<h2>Pancreas and aorta</h2>
<p>The pancreatic head is up to about 3 cm, the body about 2.5 cm and the tail up to 3 cm in anteroposterior diameter, and the pancreatic duct is 2 to 3 mm at most. The abdominal aorta tapers from about 2 cm at the diaphragm to 1.5 cm at the bifurcation; a diameter of 3 cm or more is an aneurysm.</p>
<h2>A pocket table</h2>
<table>
<thead><tr><th>Structure</th><th>Adult upper limit</th></tr></thead>
<tbody>
<tr><td>Liver, right lobe length</td><td>15 to 16 cm</td></tr>
<tr><td>Spleen length</td><td>12 cm</td></tr>
<tr><td>Kidney length</td><td>10 to 12 cm (difference under 1.5 cm)</td></tr>
<tr><td>Renal cortex</td><td>More than 1 cm</td></tr>
<tr><td>Gall bladder wall</td><td>3 mm</td></tr>
<tr><td>Common bile duct</td><td>6 mm</td></tr>
<tr><td>Portal vein</td><td>13 mm</td></tr>
<tr><td>Pancreatic duct</td><td>3 mm</td></tr>
<tr><td>Aorta</td><td>3 cm</td></tr>
</tbody>
</table>
<p>Numbers vary a little between textbooks and between populations, and a measurement always has to be read together with the shape, texture and the clinical question. But a sonologist who knows this table by heart writes a report faster, and notices the abnormal organ before the callipers confirm it.</p>
${FOOTER}`,
  },
  {
    slug: "grading-hydronephrosis-ultrasound-mild-moderate-marked",
    titleEn: "Grading hydronephrosis on ultrasound: mild, moderate and marked",
    excerpt:
      "Hydronephrosis is one of the most common findings you will report. A simple three-step grading, what each grade looks like, and the traps that mimic it.",
    tags: ["kidney", "abdomen", "pathology"],
    bodyEn: `<h2>What hydronephrosis is</h2>
<p>Hydronephrosis is dilatation of the renal collecting system, the pelvis and calyces, because urine cannot drain freely. On ultrasound it shows as anechoic fluid replacing the bright fat of the renal sinus. The cause may be a stone, a stricture, a mass pressing on the ureter, an enlarged prostate, pregnancy or reflux, and the scan's job is to say how severe it is and, whenever possible, why.</p>
<h2>The normal sinus</h2>
<p>The renal sinus is the bright central part of the kidney, filled with fat, vessels and a collapsed collecting system. In a well hydrated patient you may see a thin sliver of fluid in the pelvis; a full bladder can also distend the pelvis slightly. Neither is hydronephrosis. Ask the patient to void and rescan if in doubt.</p>
<h2>Mild (grade I)</h2>
<p>The renal pelvis is distended with fluid and the calyces are slightly separated, but the calyces keep their normal shape and the cortex is normal in thickness. The bright sinus fat is still clearly present around the fluid. Many mild cases are physiological or from a distal cause such as a full bladder, so mention the bladder state in the report.</p>
<h2>Moderate (grade II)</h2>
<p>The pelvis and all the calyces are clearly dilated and the calyces become rounded, giving the sinus a "bear paw" appearance of fluid spaces connected to a central pool. The sinus fat is largely replaced by fluid. The cortex is still preserved, which is the point that separates moderate from marked.</p>
<h2>Marked (grade III)</h2>
<p>Dilatation is gross. The calyces are ballooned into large cysts that merge with the pelvis, the sinus is entirely fluid, and the renal cortex is thinned. In long-standing obstruction the kidney becomes a thin-walled sac of fluid with only a rim of parenchyma. Cortical thinning is the sign of loss of function, and that is what the urologist most needs to know.</p>
<h2>Then look for the cause</h2>
<ul>
<li><strong>Ureter.</strong> Follow the dilated pelvis into the ureter. A dilated ureter means the block is below the pelvi-ureteric junction; a dilated pelvis with a normal ureter means a PUJ obstruction.</li>
<li><strong>Stone.</strong> Look at the PUJ, the ureter as far as you can see it, and the vesico-ureteric junction through the full bladder. Stones are bright with a clean shadow, and colour Doppler shows a twinkling artifact behind them.</li>
<li><strong>Bladder.</strong> A large residual volume, a thick trabeculated wall or an enlarged prostate explains bilateral hydronephrosis in an older man.</li>
<li><strong>Jets.</strong> With colour Doppler over the bladder, normal ureteric jets on both sides argue against complete obstruction.</li>
<li><strong>Pregnancy.</strong> Right-sided mild to moderate hydronephrosis is common in the third trimester and usually needs no treatment.</li>
</ul>
<h2>Mimics</h2>
<p>Parapelvic cysts sit in the sinus and look like a dilated pelvis, but they do not connect to each other or to the calyces. An extrarenal pelvis is a normal variant in which the pelvis lies outside the kidney and looks prominent without any calyceal dilatation. Prominent vessels in the sinus turn out to be vessels on colour Doppler. A large, thin-walled multicystic kidney in a child can look like marked hydronephrosis, but its cysts do not communicate with a central pelvis.</p>
<h2>How to write it</h2>
<p>State the grade, the side, the state of the cortex and the ureter, and any cause seen, for example: "Right kidney: moderate hydronephrosis with dilatation of the upper ureter to the level of a 9 mm calculus at the pelvic ureter; cortical thickness preserved. Left kidney and bladder normal." That sentence tells the clinician exactly what to do next.</p>
${FOOTER}`,
  },
  {
    slug: "prostate-volume-and-post-void-residual-ultrasound",
    titleEn: "How to measure prostate volume and post-void residual on ultrasound",
    excerpt:
      "Two numbers that decide how an older man with urinary symptoms is managed, and how to get them right from a transabdominal scan.",
    tags: ["prostate", "bladder", "measurements"],
    bodyEn: `<h2>Why these two numbers</h2>
<p>A man in his sixties with a slow stream, frequency and getting up at night is one of the most frequent referrals for an abdominal ultrasound. The clinician wants two figures: how big the prostate is, and how much urine stays behind after voiding. Together they tell whether the symptoms are from an enlarged gland, whether the bladder is coping, and whether the kidneys are at risk.</p>
<h2>Preparation</h2>
<p>The scan is done through a full bladder. Ask the patient to drink water and hold urine until the bladder is comfortably full; a very over-distended bladder is uncomfortable and the patient cannot empty it properly afterwards, which falsely raises the residual. Use a convex probe just above the pubic symphysis, angled downwards and backwards to look behind the bladder base.</p>
<h2>Measuring the prostate</h2>
<p>Three diameters are needed:</p>
<ol>
<li><strong>Transverse width</strong> on the axial image at the widest part of the gland.</li>
<li><strong>Anteroposterior depth</strong> on the same axial image, or on the sagittal image, from the anterior to the posterior capsule.</li>
<li><strong>Craniocaudal length</strong> on the sagittal image, from the base at the bladder neck to the apex.</li>
</ol>
<p>Volume is calculated with the ellipsoid formula: length multiplied by width multiplied by depth multiplied by 0.52. Most machines do this for you once the three callipers are placed. A gland of 20 to 25 cc is normal in a young adult, 25 to 40 cc is mildly enlarged, 40 to 80 cc moderately enlarged, and above 80 cc is markedly enlarged. Because 1 cc of prostate tissue weighs about 1 gram, volume and weight are used interchangeably.</p>
<p>Report the shape too. Benign enlargement makes the gland rounded and symmetrical, often with a median lobe bulging into the bladder base. Capsular irregularity, an asymmetrical hypoechoic area in the peripheral zone or invasion of the bladder base raises the question of carcinoma, which needs PSA, digital examination and usually a transrectal study. Bright foci with shadowing are calcifications and are common and benign.</p>
<h2>Measuring the post-void residual</h2>
<p>After the pre-void images, ask the patient to pass urine as completely as he can, then rescan immediately. Measure the bladder in the same three planes, transverse, anteroposterior and craniocaudal, and multiply the three by 0.52 for an ellipsoid, or use the machine's bladder volume function. Scanning promptly matters: the bladder refills at a millilitre or more per minute, so a ten-minute delay adds a real error.</p>
<p>Up to about 50 ml is normal. Fifty to a hundred is borderline and worth repeating. Persistently above 100 ml means incomplete emptying, and above 200 to 300 ml is chronic retention. Where the residual is large, look at the bladder wall for thickening and trabeculation, and at both kidneys for hydronephrosis, because that is the point where the kidneys begin to suffer.</p>
<h2>Sources of error</h2>
<ul>
<li>A partly filled bladder before voiding gives a falsely small residual; a bladder that was over-full gives a falsely large one.</li>
<li>The prostate is hard to measure through an empty bladder, so take the prostate measurements before the patient voids.</li>
<li>Bowel gas behind the bladder can hide the gland; angle the probe more steeply and press gently.</li>
<li>The ellipsoid formula assumes a smooth oval; a very irregular bladder or gland is best described as an estimate.</li>
</ul>
<h2>A sample report line</h2>
<p>"Prostate measures 52 by 48 by 45 mm, volume approximately 58 cc, enlarged with a median lobe indenting the bladder base; echotexture homogeneous with a few calcifications; capsule intact. Pre-void bladder volume 380 ml, post-void residual 110 ml. Bladder wall mildly thickened. Both kidneys normal, no hydronephrosis." Those few lines answer everything the clinician asked.</p>
${FOOTER}`,
  },
  {
    slug: "endometrial-thickness-by-menstrual-phase-normal-values",
    titleEn: "Endometrial thickness by menstrual phase: normal values",
    excerpt:
      "The endometrium changes every week of the cycle. How to measure it correctly and what is normal at each phase, after the menopause and on treatment.",
    tags: ["uterus", "gynaecology", "measurements"],
    bodyEn: `<h2>A measurement that depends on the date</h2>
<p>The endometrium is the lining of the uterine cavity and it grows and sheds every cycle under the control of oestrogen and progesterone. That means there is no single normal thickness; the same measurement can be normal on day 20 and abnormal on day 3. Before you measure, always ask the date of the last menstrual period and whether the patient is on any hormonal treatment. Write the cycle day in the report.</p>
<h2>How to measure</h2>
<p>Take the measurement on a sagittal image of the uterus that shows the full length of the cavity from fundus to cervix, the plane in which the endometrial stripe is longest and best defined. Place the callipers at the thickest part, from the outer edge of the anterior endometrium to the outer edge of the posterior endometrium, perpendicular to the cavity. This is the double-layer thickness and it is the value used everywhere.</p>
<p>If fluid separates the two layers, measure each layer separately and add them; do not include the fluid. Transvaginal scanning is more accurate, but a good transabdominal measurement through a full bladder is acceptable when the stripe is clear.</p>
<h2>Normal values through the cycle</h2>
<table>
<thead><tr><th>Phase</th><th>Approximate days</th><th>Appearance</th><th>Thickness</th></tr></thead>
<tbody>
<tr><td>Menstrual</td><td>1 to 5</td><td>Thin, irregular bright line, sometimes with a little fluid or clot</td><td>1 to 4 mm</td></tr>
<tr><td>Early proliferative</td><td>6 to 9</td><td>Thin, uniformly bright line</td><td>4 to 8 mm</td></tr>
<tr><td>Late proliferative (periovulatory)</td><td>10 to 14</td><td>Three-line pattern: bright outer edges, dark functional layers, bright central line</td><td>8 to 12 mm</td></tr>
<tr><td>Secretory</td><td>15 to 28</td><td>Thick and uniformly bright, three lines lost</td><td>10 to 16 mm</td></tr>
</tbody>
</table>
<p>These bands overlap; the pattern matters as much as the number. A three-line endometrium tells you the patient is around ovulation even when the day count is uncertain. A thick, bright endometrium in the first week of the cycle is more suspicious than the same thickness in the third week.</p>
<h2>After the menopause</h2>
<p>Without oestrogen the endometrium becomes thin and atrophic. In a postmenopausal woman who is not bleeding, up to 4 to 5 mm is accepted as normal, and a thin stripe under 4 mm in a woman with bleeding makes endometrial cancer unlikely. A stripe above 5 mm in a woman with postmenopausal bleeding needs a gynaecological opinion and usually sampling. Women on hormone replacement therapy may have a thicker lining, up to about 8 mm, and tamoxifen produces a thick, cystic endometrium that should be described but is often benign.</p>
<h2>When the number is high</h2>
<p>A thick endometrium at the wrong time is a description, not a diagnosis. The common causes are:</p>
<ul>
<li><strong>Hyperplasia:</strong> diffuse, uniformly thick and bright, no focal mass.</li>
<li><strong>Polyp:</strong> a focal bright mass within the cavity, best seen when fluid or the three-line pattern outlines it, often with a feeding vessel on colour Doppler.</li>
<li><strong>Submucous fibroid:</strong> a rounded hypoechoic mass arising from the myometrium and bulging into the cavity.</li>
<li><strong>Retained products or early pregnancy:</strong> always ask about the possibility of pregnancy and check a pregnancy test when the history fits.</li>
<li><strong>Carcinoma:</strong> irregular, heterogeneous thickening with a blurred junction to the myometrium, mainly in postmenopausal women.</li>
</ul>
<h2>Report the whole picture</h2>
<p>State the cycle day, the thickness in millimetres, the pattern and any focal lesion, and then the interpretation, for example: "Day 12 of cycle. Endometrium 10 mm, three-line pattern, no focal lesion, appropriate for the periovulatory phase." A number without a date leaves the reader guessing.</p>
${FOOTER}`,
  },
  {
    slug: "afi-and-placenta-grading-late-pregnancy-quick-guide",
    titleEn: "AFI and placenta grading in late pregnancy: a quick guide",
    excerpt:
      "Two parts of every third trimester report, measured in minutes, that say a lot about fetal wellbeing. How to do them and what the ranges mean.",
    tags: ["pregnancy", "obstetrics", "measurements"],
    bodyEn: `<h2>Why the clinician reads these lines first</h2>
<p>In the last three months of pregnancy the questions change from "how old is the fetus" to "is the fetus well". Two quick ultrasound assessments answer a large part of that: the amount of amniotic fluid and the appearance of the placenta. Both take a couple of minutes and belong in every late pregnancy report.</p>
<h2>Amniotic fluid index (AFI)</h2>
<p>Divide the maternal abdomen into four quadrants using the umbilicus and the linea nigra. Hold the probe vertically, in the true sagittal plane, and in each quadrant measure the deepest pocket of fluid that contains no umbilical cord or fetal parts, in centimetres. Add the four measurements together: that sum is the AFI.</p>
<p>Three habits keep the number honest. Keep the probe perpendicular to the floor rather than to the curve of the abdomen. Use colour Doppler for a moment to be sure the pocket has no cord in it. Do not press hard, because compression shrinks the pocket you are measuring.</p>
<table>
<thead><tr><th>AFI</th><th>Interpretation</th></tr></thead>
<tbody>
<tr><td>Below 5 cm</td><td>Oligohydramnios</td></tr>
<tr><td>5 to 8 cm</td><td>Borderline low, follow up</td></tr>
<tr><td>8 to 18 cm (some use up to 24 or 25)</td><td>Normal</td></tr>
<tr><td>Above 24 to 25 cm</td><td>Polyhydramnios</td></tr>
</tbody>
</table>
<p>The single deepest pocket is a simpler alternative: under 2 cm is low and over 8 cm is high. Before 24 weeks, or with twins, the deepest pocket is preferred over the AFI.</p>
<p>Low fluid points to ruptured membranes, placental insufficiency with growth restriction, post-dates or a fetal renal problem; check the fetal kidneys and bladder. High fluid is associated with maternal diabetes, fetal swallowing problems and some anomalies, and often no cause is found. Either way the finding changes the plan, so report it plainly with the number.</p>
<h2>Placenta grading</h2>
<p>The placenta matures through the pregnancy and the changes are visible on ultrasound. Grannum's grading describes them in four steps:</p>
<ul>
<li><strong>Grade 0:</strong> homogeneous placenta, smooth chorionic plate, no calcification. Typical of the first and second trimester.</li>
<li><strong>Grade I:</strong> a few scattered bright dots within the placenta, chorionic plate with subtle undulations. Common from about 30 weeks.</li>
<li><strong>Grade II:</strong> bright comma-shaped densities along the basal plate and larger indentations of the chorionic plate that do not reach the base. Usual from around 36 weeks.</li>
<li><strong>Grade III:</strong> the indentations reach the basal plate and divide the placenta into cotyledons outlined by bright calcified septa, often with central dark areas. Normal at term.</li>
</ul>
<p>Grading matters for timing. A grade III placenta before about 34 weeks is early maturation and is associated with hypertension, smoking and placental insufficiency; combine it with fetal growth and Doppler before drawing conclusions. A grade 0 placenta at term is not abnormal on its own.</p>
<h2>What else to note about the placenta</h2>
<p>State the position (anterior, posterior, fundal, lateral) and the relation of the lower edge to the internal os, especially if it was low earlier in pregnancy. Measure thickness at the centre: 2 to 4 cm is usual, above 5 cm is thick. Mention retroplacental collections, large lakes, or a placenta that overlies a previous caesarean scar, because those change management.</p>
<h2>Putting the two together</h2>
<p>A normal AFI with a placenta grade appropriate to the gestational age, a fetus growing on its centile and normal fetal movements is a reassuring picture. Low fluid with an early grade III placenta and a small fetus is the opposite, and needs Doppler and an obstetric decision the same day. Learning to measure these two well, and to write them clearly, is one of the most useful skills of late pregnancy scanning.</p>
${FOOTER}`,
  },
];
