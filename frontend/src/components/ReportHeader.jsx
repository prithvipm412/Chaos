const STATUS_LABELS = {
  FAIL: 'Likely to fail',
  UNCERTAIN: 'Uncertain',
  NO_KNOWN: 'No known resistance found',
};

function percent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : '—';
}

export default function ReportHeader({ job }) {
  const result = job.result;
  const options = result.summary?.options || [];
  const urinaryOnlyOptions = options.length > 0 && options.every((option) =>
    result.calls?.find((call) => call.antibiotic === option)?.tags?.includes('urinary_tract_only')
  );
  const hits = (result.hits || []).filter((hit) => hit.used_for_calls);
  return (
    <section className="print-report" aria-label="Printable analysis report">
      <h1>Genome Firewall</h1>
      <h2>{job.label}</h2>
      <dl>
        <dt>Analysis ID</dt><dd>{job.job_id}</dd>
        <dt>Date</dt><dd>{new Date(job.created_at).toLocaleString()}</dd>
        <dt>Genome QC</dt><dd>{result.qc?.grade || 'Unavailable'}</dd>
      </dl>
      <h2>{result.summary?.headline}</h2>
      {(result.qc?.warnings || []).map((warning, index) => <p key={index}>{warning}</p>)}
      {urinaryOnlyOptions && (
        <p className="font-semibold">
          No systemic options with no known resistance — consult microbiology / infectious diseases.
        </p>
      )}
      <table>
        <caption>Antibiotic predictions</caption>
        <thead><tr><th>Antibiotic</th><th>Prediction</th><th>Confidence</th><th>Evidence / limitation</th></tr></thead>
        <tbody>{(result.calls || []).map((call) => (
          <tr key={call.antibiotic}>
            <th scope="row">{call.antibiotic}{call.tags?.includes('urinary_tract_only') && ' (UTI only)'}</th>
            <td>{STATUS_LABELS[call.status] || 'Uncertain'}</td>
            <td>{call.confidence}</td><td>{call.reason}</td>
          </tr>
        ))}</tbody>
      </table>
      <table>
        <caption>Genes used for predictions</caption>
        <thead><tr><th>Gene</th><th>Identity / coverage</th><th>Location</th><th>Rule</th></tr></thead>
        <tbody>{hits.map((hit) => (
          <tr key={hit.hit_id}><th scope="row">{hit.gene}</th><td>{percent(hit.identity)} / {percent(hit.coverage)}</td>
            <td>{hit.contig}:{hit.start}–{hit.end} ({hit.strand})</td><td>{hit.rule}</td></tr>
        ))}</tbody>
      </table>
      {hits.length === 0 && <p>No detected genes were used for predictions.</p>}
      <p className="report-disclaimer">{result.disclaimer || 'Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.'}</p>
    </section>
  );
}
