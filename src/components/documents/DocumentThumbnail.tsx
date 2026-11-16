import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { SchoolDocument } from '../../types/database.types';

interface DocumentThumbnailProps {
  doc: Pick<SchoolDocument, 'file_url' | 'file_name' | 'file_type' | 'title'>;
  sizeClass?: string;
}

export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({
  doc,
  sizeClass = 'w-11 h-11',
}) => {
  const [imgError, setImgError] = useState(false);

  const lowerName = (doc.file_name || doc.file_url || '').toLowerCase();
  const lowerType = (doc.file_type || '').toLowerCase();

  const isImage =
    !imgError &&
    (lowerType.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(lowerName));

  const isPdf =
    lowerType === 'application/pdf' || /\.pdf(\?|$)/i.test(lowerName);

  const isWord = /\.(docx?|odt|rtf)(\?|$)/i.test(lowerName);
  const isExcel = /\.(xlsx?|csv|ods)(\?|$)/i.test(lowerName);
  const isPpt = /\.(pptx?|odp)(\?|$)/i.test(lowerName);

  const extLabel = isPdf
    ? 'PDF'
    : isWord
    ? 'DOC'
    : isExcel
    ? 'XLS'
    : isPpt
    ? 'PPT'
    : (lowerName.split('.').pop()?.split('?')[0]?.slice(0, 4).toUpperCase() || 'ARQ');

  const badgeColor = isPdf
    ? 'bg-rose-600 text-white'
    : isWord
    ? 'bg-blue-600 text-white'
    : isExcel
    ? 'bg-emerald-600 text-white'
    : isPpt
    ? 'bg-amber-600 text-white'
    : 'bg-slate-600 text-white';

  return (
    <a
      href={doc.file_url}
      target="_blank"
      rel="noreferrer"
      title={`Abrir preview: ${doc.file_name || doc.title}`}
      className={`${sizeClass} relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0 flex items-center justify-center group hover:scale-105 hover:border-blue-400 transition-all`}
    >
      {isImage ? (
        <img
          src={doc.file_url}
          alt={doc.title || doc.file_name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : isPdf ? (
        <>
          <iframe
            src={`${doc.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title={doc.title || doc.file_name}
            className="w-[220%] h-[220%] origin-top-left scale-[0.45] pointer-events-none border-0 bg-white"
            tabIndex={-1}
          />
          <span
            className={`absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded text-[8px] font-extrabold leading-tight shadow ${badgeColor}`}
          >
            PDF
          </span>
        </>
      ) : (
        <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-1 relative">
          {/* Mini folha simulada */}
          <div className="w-6 h-7 rounded-[3px] bg-white border border-slate-200 shadow-2xs flex flex-col justify-center px-1 space-y-0.5">
            <div className="h-0.5 w-3.5 bg-slate-300 rounded-full" />
            <div className="h-0.5 w-4 bg-slate-200 rounded-full" />
            <div className="h-0.5 w-3 bg-slate-200 rounded-full" />
          </div>
          <span
            className={`absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-extrabold leading-tight shadow ${badgeColor}`}
          >
            {extLabel}
          </span>
        </div>
      )}

      {imgError && (
        <FileText className="w-5 h-5 text-slate-400 absolute" />
      )}
    </a>
  );
};
