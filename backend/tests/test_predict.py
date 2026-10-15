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
    assert all(c['status']=='NO_KNOWN' for c in calls([h]).values())
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
