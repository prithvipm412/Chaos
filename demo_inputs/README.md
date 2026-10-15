# Demo input cases

Generate or refresh these fixtures from the locally downloaded public CARD and genome data:

```sh
scripts/make_demo_inputs.sh
backend/.venv/bin/python scripts/precompute.py --sample kpn_kpc_partial
```

| Input | Expected outcome |
| --- | --- |
| `protein.fasta` | HTTP 400 `PROTEIN_FASTA`: upload assembled DNA, not protein sequences. Contains three CARD proteins. |
| `empty.fasta` | HTTP 400 `EMPTY_FILE`. |
| `notes.txt` | HTTP 400 `NOT_FASTA` (the UI may reject the extension first). |
| `header_only.fasta` | HTTP 400 `NOT_FASTA`: sequence missing after header. |
| `genome_small.fasta.gz` | Accepted gzip FASTA; 20 kb DNA, QC poor. No `NO_KNOWN` calls after analysis. |
| Sample `kpn_kpc_partial` | 1.2 Mb from the first 60 × 20 kb pieces of the KPNIH1 chromosome; no plasmids or KPC-3. QC poor, zero `NO_KNOWN` calls. |

The partial genome lives under ignored `data/samples/`. Choose **K. pneumoniae — incomplete assembly (demo)** in the app. It demonstrates that missing resistance evidence in incomplete DNA cannot justify a reassuring call.

For pipeline failure, submit a normal sample with form `simulate=blast_timeout`, or open the UI with `?simulate=blast_timeout`. The BLAST step fails after gene calling; Retry reruns the same job without simulation. A simulated job deliberately bypasses the result cache.

Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.
