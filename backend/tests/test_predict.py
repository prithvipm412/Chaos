from backend.predict import predict


def test_kpc():
    result = predict([dict(hit_id='h1',gene='KPC-3',drug_classes=['carbapenem'],tier='exact',identity=100,coverage=100)], {'grade':'good'})
    assert next(c for c in result['calls'] if c['antibiotic']=='Meropenem')['status']=='FAIL'
    assert len(result['calls']) == 16


def test_poor_guard():
    result = predict([], {'grade':'poor'})
    assert all(c['status'] == 'UNCERTAIN' for c in result['calls'])
