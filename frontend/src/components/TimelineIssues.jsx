export default function TimelineIssues({ issues }) {
  return (
    <div className="timeline-list">
      {issues.map((issue) => (
        <article className="timeline-item" key={`${issue.time}-${issue.type}-${issue.message}`}>
          <span className="time-pill">{issue.time}</span>
          <div>
            <strong>{issue.type}</strong>
            <p>{issue.message}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
