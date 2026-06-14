import { useState } from 'react';
import { X, Upload, Image as ImageIcon, ShieldCheck, Link2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/works/button';
import { API } from './helpers';

export function AttachmentsTab({
  selectedItem, attachments, fileInputRef,
  handleUploadFile, handleAttachLink, handleDeleteAttachment, maxUploadMb,
}) {
  // Files tab — "attach link" inline form
  const [linkForm, setLinkForm] = useState({ open: false, url: '', title: '' });

  return (
    <div>
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleUploadFile} />
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Upload file
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setLinkForm(f => ({ ...f, open: !f.open }))}>
          <Link2 className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Attach link
        </Button>
        <span className="text-xs text-neutral-600 dark:text-neutral-400">Max {maxUploadMb} MB per file</span>
        <span className="text-xs bg-semantic-success-surface text-semantic-success px-1.5 py-0.5 rounded flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Virus scan active
        </span>
      </div>
      {linkForm.open && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-2">
          <input type="url" value={linkForm.url} placeholder="https://…"
            onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))}
            className="input flex-1 min-w-0 text-sm py-1" aria-label="Link URL" />
          <input type="text" value={linkForm.title} placeholder="Title (optional)"
            onChange={e => setLinkForm(f => ({ ...f, title: e.target.value }))}
            className="input flex-1 min-w-0 text-sm py-1" aria-label="Link title" />
          <Button size="sm" variant="action" disabled={!/^https?:\/\/.+/i.test(linkForm.url.trim())}
            onClick={() => { handleAttachLink(linkForm.url.trim(), linkForm.title.trim()); setLinkForm({ open: false, url: '', title: '' }); }}>
            Add
          </Button>
        </div>
      )}
      {attachments.length === 0 && <p className="text-xs text-neutral-600 text-center py-4">No files or links attached yet.</p>}
      <div className="space-y-2">
        {attachments.map(a => {
          if ((a.attachment_type || a.attachmentType) === 'URL') {
            const linkName = a.file_name || a.fileName || a.url;
            return (
              <div key={a.id} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded flex items-center justify-center bg-brand-navy/10 text-brand-navy flex-shrink-0">
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <a href={a.url} target="_blank" rel="noreferrer noopener"
                    className="text-sm font-medium text-brand-navy hover:underline truncate flex items-center gap-1">
                    <span className="truncate">{linkName}</span><ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  </a>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{a.url}</p>
                </div>
                <button onClick={() => handleDeleteAttachment(a.id)} className="text-neutral-300 hover:text-semantic-danger flex-shrink-0" aria-label="Remove link"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </div>
            );
          }
          const mime = a.mime_type || a.mimeType || '';
          const isImage = mime.startsWith('image/');
          const fileName = a.file_name || a.fileName || '?';
          const previewUrl = `${API}/work-items/${selectedItem.id}/attachments/${a.id}/content`;
          const ext = fileName.split('.').pop().toUpperCase().slice(0, 3);
          return (
            <div key={a.id} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 overflow-hidden">
              {isImage && (
                <div className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center p-2 max-h-48 overflow-hidden">
                  <img src={previewUrl} alt={fileName}
                    className="max-h-44 max-w-full object-contain rounded"
                    onError={e => { e.target.style.display = 'none'; }} />
                </div>
              )}
              <div className="flex items-center gap-3 p-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${isImage ? 'bg-brand-navy/10 text-brand-navy' : 'bg-neutral-200 text-neutral-600'}`}>
                  {isImage ? <ImageIcon className="h-4 w-4" aria-hidden="true" /> : ext}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{fileName}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{a.uploaded_by_name || a.uploadedByName || 'You'} · {a.file_size ? `${Math.round(a.file_size / 1024)}KB` : ''}</p>
                </div>
                <a href={previewUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-brand-navy hover:underline flex-shrink-0 mr-2">View</a>
                <button onClick={() => handleDeleteAttachment(a.id)} className="text-neutral-300 hover:text-semantic-danger text-xs flex-shrink-0" aria-label="Remove attachment"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
