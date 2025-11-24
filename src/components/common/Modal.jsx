import React from 'react';
import PropTypes from 'prop-types';

/**
 * Modal
 * 汎用モーダルコンポーネント
 *
 * Props:
 * - isOpen: モーダルを開くかどうか
 * - onClose: 閉じる関数
 * - children: モーダル内コンテンツ
 */
const Modal = ({ isOpen = true, onClose, children }) => {
  // isOpen が未指定でもデフォルトで開くようにする（既存コードとの互換性）
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose} // 背景クリックで閉じる
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          minWidth: '300px',
          maxWidth: '90%',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()} // 内部クリックは閉じない
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            border: 'none',
            background: 'transparent',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        {children}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool, // 必須ではなくする
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

Modal.defaultProps = {
  isOpen: true,
};

export default Modal;