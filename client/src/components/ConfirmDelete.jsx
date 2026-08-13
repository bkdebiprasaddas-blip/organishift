import Modal from './Modal';

export default function ConfirmDelete({ open, onClose, onConfirm, title = 'Delete', message = 'Are you sure? This cannot be undone.', busy = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="confirm-text">{message}</p>
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}
