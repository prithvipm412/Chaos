import pytest
from backend.rules import match_rule, PANEL


@pytest.mark.parametrize('gene,name', [('KPC-3','carbapenemase'),('NDM-1','carbapenemase'),
    ('OXA-48','carbapenemase'),('OXA-1','narrow_beta_lactamase'),('CTX-M-15','esbl'),
    ('TEM-1','narrow_beta_lactamase'),('SHV-12','esbl'),('SHV-1','narrow_beta_lactamase'),
    ('SHV-11','narrow_beta_lactamase'),('CMY-2','plasmid_ampc'),('armA','aminoglycoside_methylase'),
    ('mcr-1','colistin_mcr'),('acrB','intrinsic'),('EC-5','intrinsic'),('Escherichia coli ampC beta-lactamase','intrinsic'),
    ('CTX-M-15','esbl'),('TEM-12','esbl'),('SHV-2','esbl')])
def test_rules(gene,name):
    rule = match_rule(gene,'','')
    assert (rule if isinstance(rule,str) else rule['name']) == name


def test_panel():
    assert len(PANEL) == 16
    assert len({p['antibiotic'] for p in PANEL}) == 16


def test_classification_origin_and_priority():
    from backend.rules import classify
    assert classify('oqxA', '', 'antibiotic efflux') == ('intrinsic', None)
    assert classify('unknown', '', 'antibiotic target alteration') == ('intrinsic', None)
    assert classify('mcr-1', '', 'antibiotic target alteration')[0] == 'acquired'
    assert classify('armA', '', 'antibiotic target alteration')[0] == 'acquired'
    assert classify('unknown', '', 'antibiotic inactivation') == ('unclassified', None)
