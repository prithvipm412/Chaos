from backend.rules import PANEL

DISCLAIMER = 'Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.'


def predict(hits: list[dict], qc: dict) -> dict:
    calls = []
    for drug in PANEL:
        matches = [h for h in hits if set(h['drug_classes']) & set(drug['classes'])]
        strong = [h for h in matches if h['tier'] in ('exact', 'strict')]
        status = 'FAIL' if strong else 'UNCERTAIN' if matches else 'NO_KNOWN'
        evidence = strong or matches
        reason = '; '.join(f"{h['gene']} ({h['identity']:g}% id, {h['coverage']:g}% cov)" for h in evidence) or 'No known resistance gene found.'
        if status == 'NO_KNOWN' and qc['grade'] == 'poor':
            status, reason = 'UNCERTAIN', 'Genome incomplete — cannot rule out resistance.'
        calls.append(dict(antibiotic=drug['antibiotic'], group=drug['group'], status=status,
                          confidence='high' if strong else 'low' if qc['grade'] != 'good' else 'medium',
                          evidence=[h['hit_id'] for h in evidence], reason=reason))
    summary = dict(fail=sum(c['status']=='FAIL' for c in calls), uncertain=sum(c['status']=='UNCERTAIN' for c in calls),
                   no_known=sum(c['status']=='NO_KNOWN' for c in calls), headline='Resistance genes detected' if any(c['status']=='FAIL' for c in calls) else 'No major acquired resistance found',
                   options=[c['antibiotic'] for c in calls if c['status']=='NO_KNOWN'])
    return dict(calls=calls, summary=summary, disclaimer=DISCLAIMER)
