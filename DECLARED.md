# Pre-event boilerplate and third-party declaration

Prepared before the event: a Vite/React/Tailwind CSS frontend starter (development setup and navy placeholder card), a FastAPI/Uvicorn backend starter with a health endpoint, and the agent-kit Markdown files for planning, scope, task assignment, handoff, prompts and executor rules: AGENTS.md, CLAUDE.md, PLAN.md, SCOPE.md, TASKS.md, HANDOFF.md, PROMPTS.md, README.md and this declaration. These were scaffolding, not the genome-analysis product. Product pipeline, rules, evidence, validation and demo flows were developed during the event.

## Libraries and tools

| Third-party component | Use |
| --- | --- |
| pyrodigal 3.7.1 | Meta-mode bacterial gene calling / protein prediction. |
| NCBI BLAST+ (local blastp 2.17.0+) | makeblastdb builds the protein database; blastp searches predicted proteins against CARD homolog references. |
| Biopython 1.88 | FASTA parsing and sequence handling. |
| FastAPI | HTTP API and upload routes. |
| Uvicorn | ASGI server. |
| python-multipart | Multipart FASTA/sample form uploads. |
| HTTPX | API testing client transport. |
| pytest | Backend tests. |
| React 19 and React DOM | Browser UI and rendering. |
| Vite 7 and @vitejs/plugin-react | Frontend development server, build and React integration. |
| Tailwind CSS 4 and @tailwindcss/vite | Styling and Vite integration. |
| Python 3, venv and pip | Backend runtime and dependency installation. |
| Node.js and npm | Frontend runtime tooling and dependency installation. |
| Homebrew | Local BLAST+ installation. |
| Git | Version control and shared repository synchronization. |
| Bash / shell, curl, tar, gzip, shasum, lsof and standard OS utilities | Setup/downloads, checksums, demo process management and fixtures. |
| OpenAI Codex, Claude Code and Antigravity | Agent-assisted implementation, planning/review and UI development respectively. |

Direct dependency constraints are in backend/requirements.txt and frontend/package.json. Frontend transitive dependencies and resolved versions are recorded in frontend/package-lock.json; Python transitive packages are installed by pip (including FastAPI/Uvicorn dependencies). This declaration includes their use; the project does not claim authorship of third-party code. No LLM runs in the genome-analysis pipeline.

## Datasets and derived fixtures

CARD (Comprehensive Antibiotic Resistance Database, McMaster University), downloaded from [CARD automatic data download](https://card.mcmaster.ca/latest/data): local release 4.0.2. Used protein homolog model sequences and ARO annotations (gene names, families, drug classes and mechanisms). This is our BLAST-and-rules pipeline, not CARD RGI. Local download provenance and archive checksum are retained in data/card/provenance.txt.

Licence note: the downloaded data/card/CARD-Download-README.txt restricts use or reproduction by commercial organizations, including non-commercial research use, without written McMaster University permission; commercial use requires a written licence and user fee. CARD data are not covered by the project's code licence. Consult [CARD terms and licensing](https://card.mcmaster.ca/about) before reuse or redistribution. Attribution: Alcock et al., “CARD 2023: expanded curation, support for machine learning, and resistome prediction at the Comprehensive Antibiotic Resistance Database,” Nucleic Acids Research 51, D690–D699 ([publication](https://pubmed.ncbi.nlm.nih.gov/36263822/)).

Public NCBI assembled genomes, downloaded with pinned accession versions by scripts/get_samples.sh (whole assemblies include plasmids):

| Sample card / local FASTA | Organism and strain | Assembly accession |
| --- | --- | --- |
| K. pneumoniae (ICU blood culture); kp_kpc.fasta | Klebsiella pneumoniae KPNIH1 | GCA_000281535.2 (ASM28153v2) |
| E. coli (ESBL); ecoli_ctxm.fasta | Escherichia coli EC958 | GCA_000285655.3 (EC958.v1) |
| E. coli K-12 MG1655; ecoli_k12.fasta | Escherichia coli K-12 MG1655 | GCF_000005845.2 (ASM584v2) |

The ICU blood-culture label is a demo scenario, not a newly collected patient specimen. Exact NCBI download URLs and FASTA SHA-256 checksums are recorded locally in data/samples/sources.tsv and checksums.sha256.

scripts/make_demo_inputs.sh derives the fourth card, kpn_kpc_partial.fasta, from the first 60 × 20 kb fragments of the KPNIH1 chromosome (1.2 Mb; plasmids excluded). demo_inputs/genome_small.fasta.gz contains 20 kb of the same genome. demo_inputs/protein.fasta contains three CARD protein references and inherits CARD's restrictions. Empty, header-only and text fixtures are synthetic invalid inputs. Mock UI JSON and cached results are project-generated fixtures/outputs based on these inputs; they are not additional clinical datasets.
