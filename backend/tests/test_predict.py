from backend.predict import predict


def test_kpc():
    result = predict([dict(hit_id='h1',gene='KPC-3',drug_classes=['carbapenem'],tier='exact',identity=100,coverage=100)], {'grade':'good'})
    assert next(c for c in result['calls'] if c['antibiotic']=='Meropenem')['status']=='FAIL'
    assert len(result['calls']) == 16


def test_poor_guard():
    result = predict([], {'grade':'poor'})
    assert all(c['status'] == 'UNCERTAIN' for c in result['calls'])


def hit(gene, tier='exact', identity=100, mechanism='antibiotic inactivation', **kwargs):
    return dict(hit_id=gene, gene=gene, family='', drug_classes=[], tier=tier, identity=identity,
                coverage=100, mechanism=mechanism, **kwargs)


def calls(hits, grade='good'):
    return {c['antibiotic']: c for c in predict(hits, {'grade': grade})['calls']}


def test_all_beta_lactams():
    result = predict([hit('KPC-3')], {'grade':'good'})
    assert sum(c['status'] == 'FAIL' for c in result['calls']) == 8
    assert result['summary']['headline'] == 'Carbapenem-resistant (KPC-3)'


def test_ctxm():
    result = calls([hit('CTX-M-15')])
    assert result['Ceftriaxone']['status'] == 'FAIL'
    assert result['Meropenem']['status'] == 'NO_KNOWN'


def test_intrinsic():
    h = hit('acrB', mechanism='antibiotic efflux')
    from backend.predict import MUTATION_DRIVEN
    assert all(c['status'] == ('UNCERTAIN' if name in MUTATION_DRIVEN else 'NO_KNOWN')
               for name, c in calls([h]).items())
    assert not h['used_for_calls'] and h['rule']=='intrinsic'


def test_sul_dfr_pair():
    assert calls([hit('sul1')])['Co-trimoxazole']['status'] == 'UNCERTAIN'
    assert calls([hit('sul1'),hit('dfrA12')])['Co-trimoxazole']['status'] == 'FAIL'
    assert calls([hit('sul1'),hit('dfrA12','partial',70)])['Co-trimoxazole']['status'] == 'UNCERTAIN'


def test_partial_and_allele_caution():
    assert calls([hit('KPC-3','partial',65)])['Meropenem']['status'] == 'UNCERTAIN'
    assert calls([hit('SHV-12','strict',90)])['Ceftriaxone']['status'] == 'UNCERTAIN'
    assert calls([hit('SHV-11','strict',90)])['Ceftriaxone']['status'] == 'UNCERTAIN'
    assert calls([hit('SHV-11')])['Ceftriaxone']['status'] == 'NO_KNOWN'
    assert calls([hit('KPC-3','strict',90)])['Meropenem']['confidence'] == 'medium'


def test_fallback_never_fail():
    h=hit('unknown enzyme'); h['drug_classes']=['carbapenem']
    assert calls([h])['Meropenem']['status']=='UNCERTAIN'


def test_poor_with_known_marker():
    result = predict([hit('CTX-M-15')], {'grade':'poor'})
    assert result['summary']['no_known']==0
    assert 'Point mutations not assessed.' in calls([])['Ciprofloxacin']['reason']


def test_best_per_orf():
    from backend.jobs import annotate_hits
    from backend.config import CARD_DIR
    from backend.card import load_card_index
    aro=next(a for a,v in load_card_index(CARD_DIR).items() if v['name']=='KPC-3')
    alignments=[dict(orf_id='o1',aro=aro,ref_name='KPC-3',identity=i,coverage=100,bitscore=i) for i in (80,100)]
    result=annotate_hits(alignments,[dict(orf_id='o1',contig='c1',start=1,end=900,strand='+')])
    assert len(result)==1 and result[0]['tier']=='exact'


def test_origin_contract_and_real_k12():
    import csv
    from pathlib import Path
    import pytest
    from backend.card import load_card_index
    from backend.config import CARD_DIR
    path=Path('data/spike/ecoli_k12.hits.tsv')
    if not path.exists():
        pytest.skip('Run setup spike first for real K-12 evidence')
    index=load_card_index(CARD_DIR)
    hits=[]
    for row in csv.DictReader(path.open(),delimiter='\t'):
        annotation=index[row['aro']]
        hits.append(dict(hit_id='h'+str(len(hits)),gene=row['gene'],family=annotation['family'],
                         mechanism=annotation['mechanism'],drug_classes=annotation['drug_classes'],
                         identity=float(row['identity_pct']),coverage=float(row['coverage_pct']),tier=row['tier']))
    result=predict(hits, {'grade':'good'})
    assert result['summary']['fail']==0
    assert all(h['origin'] in ('acquired','intrinsic','unclassified') for h in hits)
    assert all(not h['used_for_calls'] for h in hits if h['origin']=='intrinsic')


def test_remaining_options_rank_and_note():
    from backend.rules import PANEL, SPECTRUM_RANK, URINARY_ONLY
    from backend.predict import MUTATION_DRIVEN

    # K-12-shaped input: normal intrinsic homologs must not remove options.
    result = predict([hit('ampC'), hit('acrB', mechanism='antibiotic efflux')], {'grade': 'good'})
    summary = result['summary']
    assert set(SPECTRUM_RANK) == {drug['antibiotic'] for drug in PANEL}
    assert summary['options'] == sorted(set(SPECTRUM_RANK) - MUTATION_DRIVEN, key=lambda a: (a in URINARY_ONLY, SPECTRUM_RANK[a]))
    assert summary['options'][0] == 'Ampicillin'
    assert summary['options_note'] == (
        'Narrowest-spectrum options with no known resistance found, listed first-line to last-resort. '
        'Decision support only — confirm with lab AST.'
    )
    resistant = predict([hit('KPC-3')], {'grade': 'good'})
    assert set(resistant['summary']['options']) == {
        call['antibiotic'] for call in resistant['calls'] if call['status'] == 'NO_KNOWN'
    }
    assert predict([], {'grade': 'poor'})['summary']['options'] == []


def test_low_quality_headline_and_fail_priority():
    for grade, headline in [('poor', 'Incomplete genome — results uncertain'),
                            ('fair', 'Low-confidence genome — results uncertain')]:
        assert predict([], {'grade': grade})['summary']['headline'] == headline
        assert predict([hit('KPC-3')], {'grade': grade})['summary']['headline'] == 'Carbapenem-resistant (KPC-3)'
    assert predict([], {'grade': 'good'})['summary']['headline'] == 'No major acquired resistance found'


def test_real_partial_genome_headline():
    from backend.jobs import execute_pipeline, read_cache
    from backend.samples import available_samples

    sample = next(s for s in available_samples() if s['id'] == 'kpn_kpc_partial')
    data = sample['path'].read_bytes()
    cached = read_cache(data)
    result = cached['result'] if cached else execute_pipeline(data, lambda *args: None)
    assert result['qc']['grade'] == 'poor'
    # Re-run prediction so a pre-fix cache can never mask a headline regression.
    prediction = predict(result['hits'], result['qc'])
    assert prediction['summary']['no_known'] == 0
    assert all(call['status'] == 'UNCERTAIN' for call in prediction['calls'])
    assert 'Incomplete genome' in prediction['summary']['headline']
    assert 'No major acquired resistance found' not in prediction['summary']['headline']


def test_mutation_guard_preserves_gene_evidence_and_nitrofurantoin():
    from backend.predict import MUTATION_DRIVEN

    for grade in ('good', 'fair', 'poor'):
        result = calls([], grade)
        for name in MUTATION_DRIVEN:
            assert result[name]['status'] == 'UNCERTAIN'
            assert result[name]['confidence'] == 'low'
            assert result[name]['reason'].startswith('Resistance often from mutations not assessed.')
    for gene, drug, status in [('qnrS1', 'Ciprofloxacin', 'UNCERTAIN'),
                               ("aac(6')-Ib-cr", 'Ciprofloxacin', 'UNCERTAIN'),
                               ('mcr-1', 'Colistin', 'FAIL'), ('tet(X)', 'Tigecycline', 'FAIL')]:
        call = calls([hit(gene)])[drug]
        assert call['status'] == status
        assert call['evidence'] == [gene]
        assert gene in call['reason']
    nitro = calls([])['Nitrofurantoin']
    assert nitro['status'] == 'NO_KNOWN'
    assert 'Point mutations not assessed.' in nitro['reason']


def test_real_kpn_mutation_driven_options():
    from backend.jobs import execute_pipeline, read_cache
    from backend.samples import available_samples
    from backend.predict import MUTATION_DRIVEN

    sample = next(s for s in available_samples() if s['id'] == 'kpn_kpc')
    data = sample['path'].read_bytes()
    cached = read_cache(data)
    result = cached['result'] if cached else execute_pipeline(data, lambda *args: None)
    prediction = predict(result['hits'], result['qc'])
    by_name = {call['antibiotic']: call for call in prediction['calls']}
    assert all(by_name[name]['status'] == 'UNCERTAIN' for name in MUTATION_DRIVEN)
    assert not MUTATION_DRIVEN.intersection(prediction['summary']['options'])


def test_urinary_tags_and_options_order():
    from backend.rules import URINARY_ONLY

    for grade in ('good', 'fair', 'poor'):
        prediction = predict([hit('ampC'), hit('acrB', mechanism='antibiotic efflux')], {'grade': grade})
        for call in prediction['calls']:
            assert call['tags'] == (['urinary_tract_only'] if call['antibiotic'] in URINARY_ONLY else [])
        options = prediction['summary']['options']
        if options:
            assert options[0] not in URINARY_ONLY
            assert options[-2:] == ['Nitrofurantoin', 'Fosfomycin']
    # Tags identify restrictions even when resistance evidence excludes the drug from options.
    resistant = calls([hit('fosA3')])['Fosfomycin']
    assert resistant['status'] == 'FAIL'
    assert resistant['tags'] == ['urinary_tract_only']
