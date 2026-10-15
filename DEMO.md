# Genome Firewall demo — draft

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

Optional slower refresh rehearsal: use the small gzip upload on its first uncached run and refresh immediately after the job URL appears. Do not delete caches or change source files for the presentation. UI retry/print flows are still separate task cards; this draft does not depend on them.
