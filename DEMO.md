# Genome Firewall — demo script

Rehearse against the current UI before presenting. From the repo root run `scripts/run_demo.sh`, then open **http://127.0.0.1:5173/#/** (no `mock` or `simulate` query). The command frees ports 8000/5173, starts both servers, warms/verifies all four sample caches and checks health. Dependencies, CARD and sample downloads must already be installed (README.md). Stop with `scripts/stop_demo.sh`; logs are in data/demo/. Sample results are cached real pipeline outputs; the four stages animate quickly on cache hits. Say this explicitly rather than implying a fresh genome was computed in seconds.

Have Finder open to demo_inputs/ and any ordinary PNG/JPEG image handy. All returns home below mean click **New Analysis** in the top navigation, or click the **Genome Firewall** title (both target `#/`). Scroll as needed: the antibiotic grid appears below QC, the contig map and the collapsed gene table.

## Main story — 90 seconds, all four cards

| Time | Exact action | Say |
| --- | --- | --- |
| 0–10 s | On home, point at the upload box and four reference cards. | “Genome Firewall reads assembled bacterial DNA to flag antibiotics likely to fail, with traceable evidence. These demo samples use cached results from our real gene-calling and BLAST pipeline.” |
| 10–30 s | Click **K. pneumoniae (ICU blood culture)**. Watch QC → gene calling → resistance search → prediction. Scroll to the grid and click **Meropenem**. | “This Klebsiella carries KPC-3: carbapenems are likely to fail. Here is the evidence: 100 percent identity and coverage, on plasmid CP008830.1 at 15984–16865.” |
| 30–45 s | Press **Esc** to close the drawer. Return home. Click **E. coli (ESBL)**. Point at the headline; scroll to **Ceftriaxone**, then **Meropenem**. | “Different mechanism, different pattern: CTX-M-15 makes this an ESBL producer. Ceftriaxone is likely to fail; we do not automatically mark meropenem as a failure.” |
| 45–65 s | Return home. Click **E. coli K-12 MG1655**. Point at zero likely-to-fail calls. Click **All resistance genes detected** and point at **Intrinsic — informational**. | “The reference strain has normal chromosomal and efflux genes. We deliberately exclude those from failure calls. No acquired resistance found does not prove susceptibility; mutation-driven resistance remains uncertain.” |
| 65–82 s | Return home. Click **K. pneumoniae — incomplete assembly (demo)**. Point at the headline, poor QC and incomplete-genome warning; scroll to the grid. | “This is the same Klebsiella chromosome cut down, with plasmids removed. KPC evidence disappears, but poor genome quality means every negative call becomes uncertain. We never turn missing DNA into a reassuring green result.” |
| 82–90 s | Leave the uncertainty warning visible; point to the grid disclaimer. | “The rules, sequence evidence and genome quality are visible. This is decision support only—confirm with laboratory AST.” |

## Failure and resilience demos — after the 90-second story

1. **Image rejected before analysis.** Return home. Drag an ordinary `.png` or `.jpg` from Finder onto the dashed **Click to select or drag and drop** upload box. Do not use the file picker, which filters extensions. Point at **Unsupported file extension. Please upload a .fa, .fasta, .fna, or .gz file.** The **Analyze** button stays disabled. Say: “A picture is not an assembled genome. We reject it immediately and tell the user which formats to upload.”

2. **Protein FASTA rejected by content.** Drop `demo_inputs/protein.fasta` into the same box, then click **Analyze**. The extension passes, but the server returns `PROTEIN_FASTA` with the message explaining that assembled DNA is required. Stay on the upload page and point at the error below the box. Say: “A FASTA extension alone is not enough. These are protein sequences; the pipeline needs assembled DNA and gives an actionable error.”

3. **Compressed small genome accepted, with uncertainty.** Drop `demo_inputs/genome_small.fasta.gz` onto the box and click **Analyze**. Wait for completion. Show **poor** QC (20 kb), the incomplete-genome headline/banner and zero green **No known resistance found** tiles. Say: “Gzip is supported. The file is valid DNA, but far too incomplete to rule out resistance, so negative calls remain uncertain.” This is a valid-input/quality-guard demo, not a rejected upload; its first analysis may take longer than the cached cards.

4. **Refresh while analysis is running.** Return home. Click **K. pneumoniae (ICU blood culture)** and immediately press **Cmd+R** (Mac) / **Ctrl+R** as soon as `#/job/<id>` appears. Keep the same URL and job ID visible; wait for the grid. Say: “The job lives on the server and its ID stays in the URL. Refreshing resumes polling the same analysis rather than submitting another one.” Cached samples finish in roughly two seconds: if you miss the running state, repeat and refresh immediately. A completed result surviving refresh alone is not evidence of a mid-run refresh.

Optional slower refresh rehearsal: use the small gzip upload on its first uncached run and refresh immediately after the job URL appears. Do not delete caches or change source files for the presentation.

5. **A urinary-only result doesn't look like a safe result.** Return home, click **K. pneumoniae (ICU blood culture)** again, scroll past the grid to the summary's options line. Point at the single Nitrofurantoin chip and the warning beneath it. Say: “Even a green option here only treats urinary infections. For a bloodstream infection like this one, the app says so explicitly instead of letting one green chip look reassuring.”

## 1-page architecture explainer (for judge Q&A)

**Pipeline, end to end:** upload/sample → FASTA parse + QC (contig count, N50, GC%, N-content, a good/fair/poor
grade) → `pyrodigal` meta-mode gene calling → `blastp` of predicted proteins against a local BLAST database built
from CARD's protein homolog model → our rules engine (`backend/rules.py`, `backend/predict.py`) turns BLAST hits
into a 16-antibiotic antibiogram. No LLM anywhere in the pipeline; the only AI involvement was agent-assisted
planning/implementation (see DECLARED.md).

**Why a rules engine and not a lookup or an ML model:** CARD's drug-class annotations are broad research
categories, not clinical antibiotic calls — blindly mapping "CTX-M-15 hits the cephalosporin class" to "every
cephalosporin fails" over- and under-claims. `rules.py` encodes which gene families are genuinely acquired
resistance mechanisms (carbapenemases, ESBLs, plasmid AmpC, individual aminoglycoside/quinolone/colistin/
tigecycline/fosfomycin markers) versus intrinsic chromosomal/efflux genes every strain carries (even the
susceptible K-12 reference has ~50 strict BLAST hits to its own efflux and regulatory genes — presence alone is
not evidence of acquired resistance). Mechanism, not raw BLAST score, decides the call.

**Engineered judgement calls, not just "a BLAST wrapper":**
- Three states, never a binary: LIKELY TO FAIL / UNCERTAIN / NO KNOWN RESISTANCE — we never say "susceptible."
- Headline picks the clinically-relevant gene by mechanism priority (carbapenemase > ESBL > plasmid AmpC > narrow
  beta-lactamase > colistin/other), not by genome position — an early bug had a plasmid AmpC outrank a true ESBL.
- Genome quality gates every negative call: poor/fair QC downgrades NO KNOWN → UNCERTAIN and renames the headline
  itself ("Incomplete genome — results uncertain"), so a bad assembly can never look reassuring.
- Ciprofloxacin, Colistin and Tigecycline resistance is often point-mutation-driven, which BLAST-vs-homolog can't
  see; absent an acquired gene they are UNCERTAIN, never NO KNOWN.
- "Remaining options" are ranked narrowest-spectrum-first, but urinary-only drugs (Nitrofurantoin, Fosfomycin)
  never rank first and are flagged if they're the only options left for a non-UTI infection.

**Robustness demoed live:** malformed/wrong-type/oversized/gzip uploads rejected with specific, actionable errors;
a simulated BLAST timeout that fails cleanly and is retryable; job state persisted to disk so a mid-analysis
refresh resumes rather than restarts; a precomputed/cached result set so the demo never depends on live BLAST
timing.

**Validation beyond the 4 demo samples:** at code freeze we ran the unmodified pipeline against two public genomes
chosen independently of development, never used to tune `rules.py`: *Klebsiella pneumoniae* AATZP
(CP014755–CP014758, carries an NDM-1 plasmid) and an *E. coli* carrying *mcr-1* (CP016404–CP016405). Results:
AATZP's carbapenems (Meropenem, Imipenem) both call LIKELY TO FAIL on NDM-1 at 100% identity/100% coverage — a
different carbapenemase family than the KPC-3 demo sample, showing the rule generalizes rather than hard-coding
one gene; the mcr-1 genome's Colistin calls LIKELY TO FAIL on MCR-1.1 at 100% identity/100% coverage, while its
carbapenems correctly stay NO KNOWN RESISTANCE (no carbapenemase present). Full accessions and context are in
DECLARED.md.

**Known limitations (say these unprompted if asked "what doesn't it do"):** gene-presence/absence only — no point
mutation or promoter/expression analysis; not CARD RGI, not a clinical AST replacement; CARD drug-class-to-
antibiotic mapping and the rule table are our own curation and may miss rare acquired mechanisms (handled
conservatively — unmatched inactivation enzymes become UNCERTAIN, never FAIL); BLAST/gene-calling parameters are
tuned for bacterial genomes, not metagenomic/mixed samples.
