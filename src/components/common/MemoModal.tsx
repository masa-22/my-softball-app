import React, { useState, useEffect } from 'react';
import Modal from './Modal';

type MemoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memo: string) => Promise<void> | void;
  initialMemo?: string;
  title?: string;
  zIndex?: number;
};

const MemoModal: React.FC<MemoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMemo = '',
  title = 'メモ編集',
  zIndex,
}) => {
  const [memo, setMemo] = useState(initialMemo);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMemo(initialMemo);
    }
  }, [isOpen, initialMemo]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(memo);
      onClose();
    } catch (error) {
      console.error('Error saving memo:', error);
      alert('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '320px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h3>
        
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモを入力してください"
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '8px',
            fontSize: '1rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              background: '#228be6',
              color: '#fff',
              fontWeight: 'bold',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default MemoModal;
