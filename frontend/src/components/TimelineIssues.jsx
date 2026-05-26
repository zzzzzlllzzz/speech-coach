export default function TimelineIssues({ issues }) {
  return (
    <div className="timeline-list">
      {issues.map((issue) => (
        <article className={issue.frame_image ? "timeline-item with-frame" : "timeline-item"} key={`${issue.time}-${issue.type}-${issue.message}`}>
          {issue.frame_image && (
            <img className="issue-frame" src={issue.frame_image} alt={`${issue.time} 的视频画面`} />
          )}
          <div>
            <div className="issue-heading">
              <span className="time-pill">{issue.time}</span>
              <strong>{issue.type}</strong>
            </div>
            <p>{issue.message}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
