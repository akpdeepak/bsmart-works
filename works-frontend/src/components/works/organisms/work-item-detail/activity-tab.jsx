import { ArrowRight } from 'lucide-react';
import { WorkItemStatusTimeline } from '@/components/works/organisms/work-item-status-timeline';
import { api } from '@/lib/apiClient';
import { formatEventType } from './helpers';

export function ActivityTab({
  selectedItem, activity, setActivity,
  statusMetrics, activityEventFilter, setActivityEventFilter, reportError,
}) {
  return (
    <div>
      {statusMetrics?.durations?.length > 0 && (
        <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <WorkItemStatusTimeline metrics={statusMetrics} />
        </div>
      )}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {['', 'WORK_ITEM_CREATED', 'WORK_ITEM_UPDATED', 'STATUS_CHANGED', 'ASSIGNED', 'COMMENT_ADDED', 'LINKED', 'ATTACHED'].map(et => (
          <button key={et} onClick={() => {
            setActivityEventFilter(et);
            const url = `/work-items/${selectedItem.id}/activity${et ? `?eventType=${et}` : ''}`;
            api.raw(url).then(r => r.json()).then(d => setActivity(Array.isArray(d) ? d : [])).catch(reportError);
          }}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${activityEventFilter === et ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
            {et ? et.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>
      {activity.length === 0 && <p className="text-xs text-neutral-600 text-center py-4">No activity recorded yet.</p>}
      <div className="space-y-3">
        {activity.map(a => (
          <div key={a.id} className="flex gap-2.5">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              a.event_type === 'WORK_ITEM_CREATED' ? 'bg-semantic-success' :
              a.event_type === 'STATUS_CHANGED' ? 'bg-brand-navy-tint' :
              a.event_type === 'COMMENT_ADDED' ? 'bg-brand-orange' :
              'bg-neutral-300'
            }`}></div>
            <div className="flex-1">
              <p className="text-xs text-neutral-700">
                <span className="font-semibold">{a.actor_name || 'System'}</span>
                {' '}{formatEventType(a.event_type)}
              </p>
              {a.field_name && a.old_value !== null && a.new_value !== null && (
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium capitalize">{String(a.field_name).replace(/_/g,' ')}:</span>
                  {a.old_value && <span className="text-xs bg-semantic-danger-surface text-semantic-danger px-1.5 py-0.5 rounded line-through">{a.old_value}</span>}
                  <span className="text-xs text-neutral-600 dark:text-neutral-400"><ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></span>
                  {a.new_value && <span className="text-xs bg-semantic-success-surface text-semantic-success px-1.5 py-0.5 rounded">{a.new_value}</span>}
                </div>
              )}
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{a.occurred_at ? new Date(a.occurred_at).toLocaleString() : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
