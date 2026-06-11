interface Props {
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const SALES_ENABLEMENT_URL =
  'https://sheets.positivepromotions.com/#/nc/form/c488db93-da1d-4584-9b93-37e4e2772ab2';

export default function SalesEnablementModal({ filename, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">Send to Sales Enablement</h2>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-700">
            You're about to submit <span className="font-medium text-gray-900">"{filename}"</span> to
            the Sales Enablement queue via an external form.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>The external form will open in a new tab.</li>
            <li>This attachment will remain visible in the app.</li>
            <li>Your submission will be recorded in-app with your name and timestamp.</li>
          </ul>
          <p className="text-xs text-gray-400 break-all">
            Form: {SALES_ENABLEMENT_URL}
          </p>
        </div>

        <div className="px-6 pb-5 pt-2 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Confirm &amp; Open Form
          </button>
        </div>
      </div>
    </div>
  );
}
