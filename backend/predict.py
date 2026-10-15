"""Conservative marker rules: homolog presence alone never proves susceptibility."""
import re
from backend.rules import PANEL, match_rule

DISCLAIMER = 'Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.'


def predict(hits: list[dict], qc: dict) -> dict:
    effects = {drug['antibiotic']: [] for drug in PANEL}
    pairs = {'sulfonamide': [], 'trimethoprim': []}
    for hit in hits:
        rule = match_rule(hit['gene'], hit.get('family', ''), hit.get('mechanism', ''))
        hit['used_for_calls'] = False
        if rule == 'intrinsic':
            hit['rule'] = 'intrinsic'
            continue
        if rule is None:
            hit['rule'] = 'unmatched'
            if 'inactivation' not in hit.get('mechanism', '').lower():
                continue
            uncertain = [d['antibiotic'] for d in PANEL if set(d['classes']) & set(hit.get('drug_classes', []))]
            fail = []
            hit['rule'] = 'unmatched_inactivation'
        else:
            hit['rule'] = rule['name']
            fail, uncertain = list(rule['fail']), list(rule['uncertain'])
            if rule['name'] in pairs:
                pairs[rule['name']].append(hit)
        if re.search(r'\b(?:SHV|TEM)-', hit['gene'], re.I) and hit['tier'] != 'exact':
            # Closely related narrow/ESBL alleles cannot be resolved from a non-exact homolog.
            dependent = ['Ceftriaxone', 'Ceftazidime', 'Cefepime', 'Amoxicillin-clavulanate', 'Piperacillin-tazobactam']
            fail = [d for d in fail if d not in dependent]
            uncertain = list(set(uncertain + dependent))
        for drug in fail:
            effects[drug].append(('UNCERTAIN' if hit['tier'] == 'partial' else 'FAIL', hit))
        for drug in uncertain:
            effects[drug].append(('UNCERTAIN', hit))
        hit['used_for_calls'] = bool(fail or uncertain)

    if all(pairs.values()):
        sul = max(pairs['sulfonamide'], key=lambda h: (h['tier'] != 'partial', h['tier'] == 'exact'))
        dfr = max(pairs['trimethoprim'], key=lambda h: (h['tier'] != 'partial', h['tier'] == 'exact'))
        status = 'FAIL' if all(h['tier'] != 'partial' for h in (sul, dfr)) else 'UNCERTAIN'
        effects['Co-trimoxazole'] = [(status, sul), (status, dfr)]

    calls = []
    for drug in PANEL:
        candidates = effects[drug['antibiotic']]
        decisive = [h for status, h in candidates if status == 'FAIL']
        status = 'FAIL' if decisive else 'UNCERTAIN' if candidates else 'NO_KNOWN'
        evidence = decisive or [h for _, h in candidates]
        evidence = list({h['hit_id']: h for h in evidence}.values())
        confidence = ('high' if any(h['tier'] == 'exact' for h in decisive) else 'medium') if decisive else 'low' if status == 'UNCERTAIN' or qc['grade'] != 'good' else 'medium'
        reason = '; '.join(f"{h['gene']} ({h['identity']:g}% id, {h['coverage']:g}% cov)" for h in evidence) or 'No known resistance gene found.'
        if status == 'UNCERTAIN' and evidence:
            reason += ' Evidence is incomplete or insufficient for a failure prediction.'
        if status == 'NO_KNOWN' and qc['grade'] == 'poor':
            status, confidence, reason = 'UNCERTAIN', 'low', 'Genome incomplete — cannot rule out resistance.'
        if not evidence and drug['antibiotic'] in ('Ciprofloxacin', 'Nitrofurantoin'):
            reason += ' Point mutations not assessed.'
        calls.append(dict(antibiotic=drug['antibiotic'], group=drug['group'], status=status, confidence=confidence,
                          evidence=[h['hit_id'] for h in evidence], reason=reason))
    headline = 'No major acquired resistance found'
    for group, title in [('Carbapenems', 'Carbapenem-resistant'), ('Cephalosporins', 'ESBL-producer')]:
        call = next((c for c in calls if c['group'] == group and c['status'] == 'FAIL'), None)
        if call:
            gene = next(h['gene'] for h in hits if h['hit_id'] == call['evidence'][0])
            headline = f'{title} ({gene})'
            break
    summary = dict(fail=sum(c['status'] == 'FAIL' for c in calls), uncertain=sum(c['status'] == 'UNCERTAIN' for c in calls),
                   no_known=sum(c['status'] == 'NO_KNOWN' for c in calls), headline=headline,
                   options=[c['antibiotic'] for c in calls if c['status'] == 'NO_KNOWN'])
    return dict(calls=calls, summary=summary, disclaimer=DISCLAIMER)
