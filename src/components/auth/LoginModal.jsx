import React from 'react';
import AuthContainer from './AuthContainer';
import PropTypes from 'prop-types';

/**
 * LoginModal
 * ログイン用モーダルコンポーネント
 *
 * Props:
 * - isOpen: モーダル表示中かどうか
 * - onClose: モーダルを閉じる時のコールバック
 */
const LoginModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AuthContainer
      mode="login"
      isModal={true}
      onClose={onClose}
    />
  );
};

LoginModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LoginModal;