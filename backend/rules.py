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
