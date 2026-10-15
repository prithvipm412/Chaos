from backend.config import SAMPLES_DIR

SAMPLES = [dict(id=i, label=l, organism=o, note=n, path=SAMPLES_DIR / filename) for i, l, o, n, filename in [
    ('kpn_kpc', 'K. pneumoniae (ICU blood culture)', 'Klebsiella pneumoniae', 'carbapenemase expected', 'kp_kpc.fasta'),
    ('eco_ctxm', 'E. coli (ESBL)', 'Escherichia coli', 'ESBL expected', 'ecoli_ctxm.fasta'),
    ('eco_k12', 'E. coli K-12 MG1655', 'Escherichia coli', 'reference genome', 'ecoli_k12.fasta'),
    ('kpn_kpc_partial', 'K. pneumoniae — incomplete assembly (demo)', 'Klebsiella pneumoniae', 'incomplete genome', 'kpn_kpc_partial.fasta')]]


def available_samples():
    return [sample for sample in SAMPLES if sample['path'].is_file()]
