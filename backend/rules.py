PANEL = [dict(antibiotic=name, group=group, classes=classes) for name, group, classes in [
    ('Ampicillin', 'Penicillins', ['penicillin beta-lactam', 'penam']),
    ('Amoxicillin-clavulanate', 'Penicillins', ['penicillin beta-lactam', 'penam']),
    ('Piperacillin-tazobactam', 'Penicillins', ['penicillin beta-lactam', 'penam']),
    ('Ceftriaxone', 'Cephalosporins', ['cephalosporin']),
    ('Ceftazidime', 'Cephalosporins', ['cephalosporin']),
    ('Cefepime', 'Cephalosporins', ['cephalosporin']),
    ('Meropenem', 'Carbapenems', ['carbapenem']), ('Imipenem', 'Carbapenems', ['carbapenem']),
    ('Ciprofloxacin', 'Fluoroquinolones', ['fluoroquinolone']),
    ('Gentamicin', 'Aminoglycosides', ['aminoglycoside']), ('Amikacin', 'Aminoglycosides', ['aminoglycoside']),
    ('Co-trimoxazole', 'Other', ['sulfonamide', 'diaminopyrimidine']),
    ('Nitrofurantoin', 'Other', ['nitrofuran']), ('Fosfomycin', 'Other', ['fosfomycin']),
    ('Colistin', 'Other', ['polymyxin', 'peptide']), ('Tigecycline', 'Other', ['glycylcycline', 'tetracycline'])]]

URINARY_ONLY = {'Nitrofurantoin', 'Fosfomycin'}

SPECTRUM_RANK = {name: rank for rank, name in enumerate([
    'Nitrofurantoin', 'Fosfomycin', 'Ampicillin', 'Co-trimoxazole',
    'Amoxicillin-clavulanate', 'Gentamicin', 'Ciprofloxacin', 'Amikacin',
    'Piperacillin-tazobactam', 'Ceftriaxone', 'Ceftazidime', 'Cefepime',
    'Tigecycline', 'Meropenem', 'Imipenem', 'Colistin',
])}

import re

BETA_LACTAMS = [d['antibiotic'] for d in PANEL if d['group'] in ('Penicillins', 'Cephalosporins', 'Carbapenems')]


def _rule(name, pattern, fail=(), uncertain=()):
    return dict(name=name, match=re.compile(pattern, re.I), fail=list(fail), uncertain=list(uncertain))


RULES = [
    _rule('carbapenemase', r'\b(?:KPC|NDM|VIM|IMP)(?:-|\b)|\bOXA-(?:48|181|232|244)(?!\d)', BETA_LACTAMS),
    _rule('narrow_beta_lactamase', r'\b(?:TEM-(?:1|2)|SHV-(?:1|11)|OXA-1)(?!\d)|\bLAP(?:-|\b)',
          ['Ampicillin'], ['Amoxicillin-clavulanate']),
    _rule('esbl', r'\b(?:CTX-M|PER|VEB)(?:-|\b)|\bSHV-(?!1(?:\D|$)|11(?:\D|$))\d+|\bTEM-(?!1(?:\D|$)|2(?:\D|$))\d+',
          ['Ampicillin', 'Ceftriaxone', 'Ceftazidime', 'Cefepime'], ['Amoxicillin-clavulanate', 'Piperacillin-tazobactam']),
    _rule('plasmid_ampc', r'\b(?:CMY|DHA|FOX|MOX)(?:-|\b)',
          ['Ampicillin', 'Amoxicillin-clavulanate', 'Ceftriaxone', 'Ceftazidime'], ['Piperacillin-tazobactam']),
    _rule('aac6_ib_cr', r"aac\(6['′]\)-Ib-cr", ['Amikacin'], ['Ciprofloxacin']),
    _rule('aac6_ib', r"aac\(6['′]\)-Ib", ['Amikacin']),
    _rule('gentamicin_enzyme', r"aac\(3\)-(?:II|IV)|ant\(2['′]{2}\)-Ia", ['Gentamicin']),
    _rule('aminoglycoside_methylase', r'\b(?:armA|rmt[A-F])\b', ['Gentamicin', 'Amikacin']),
    _rule('quinolone_protection', r'\bqnr\w*|\boqx[AB]\b', uncertain=['Ciprofloxacin']),
    _rule('sulfonamide', r'\bsul\d*\b', uncertain=['Co-trimoxazole']),
    _rule('trimethoprim', r'\bdfrA\d*\b', uncertain=['Co-trimoxazole']),
    _rule('colistin_mcr', r'\bmcr-\d+', ['Colistin']),
    _rule('tigecycline_tetx', r'\btet\(X\d*\)', ['Tigecycline']),
    _rule('fosfomycin_acquired', r'\bfosA[34](?!\d)', ['Fosfomycin']),
    _rule('fosfomycin_other', r'\bfosA\w*', uncertain=['Fosfomycin']),
]
# Mechanism/family plus known chromosomal regulatory/target genes, not acquired-marker evidence.
INTRINSIC = re.compile(r'efflux|permeability|regulat|\bEC-\d+\b|\bampC\b|'
    r'\b(?:acr[A-Z]|mdt[A-Z]|emr[A-Z]|mar[A-Z]|gad[WX]|leuO|rosB|kdpE|msbA|omp[A-Z]\w*|'
    r'cpxA|h-ns|evg[AS]|pmr[EF]|ept[AB]|arnT|ugd|bacA|crp|rsmA|tolC|yojI|sox[A-Z]|rob)\b', re.I)


def classify(gene, family, mechanism):
    # Intrinsic names/efflux/permeability/regulators take priority over acquired-marker matches.
    if INTRINSIC.search(' '.join([gene, family, mechanism])):
        return 'intrinsic', None
    for rule in RULES:
        if rule['match'].search(gene) or rule['match'].search(family):
            return 'acquired', rule
    # Named acquired target-altering markers (mcr/armA/rmt) are explicit exceptions above.
    if re.search(r'target alteration', mechanism, re.I):
        return 'intrinsic', None
    return 'unclassified', None


def match_rule(gene, family, mechanism):
    origin, rule = classify(gene, family, mechanism)
    return 'intrinsic' if origin == 'intrinsic' else rule
