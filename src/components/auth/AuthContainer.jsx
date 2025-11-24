import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import Modal from '../common/Modal'; // 汎用モーダルコンポーネント
import PropTypes from 'prop-types';

/**
 * AuthContainer
 * ログイン・サインアップフォームをページ表示 or モーダル表示できるラッパー
 *
 * Props:
 * - mode: "login" | "signup" → 表示するフォーム
 * - isModal: true/false → モーダル表示にするかどうか
 * - onClose: モーダルを閉じる時のコールバック
 */
const AuthContainer = ({ mode = 'login', isModal = false, onClose }) => {
  // モーダル表示時は内部でモードを切り替えられるようにする
  const [currentMode, setCurrentMode] = useState(mode);
  const FormComponent = currentMode === 'signup' ? SignupForm : LoginForm;

  const switchTo = (targetMode) => {
    setCurrentMode(targetMode);
  };

  const content = (
    <div style={{ maxWidth: '400px', margin: isModal ? '0' : '50px auto', padding: '20px', border: isModal ? 'none' : '1px solid #ccc', borderRadius: '8px', backgroundColor: isModal ? 'white' : '#fff' }}>
      {/* FormComponent にモード切替用関数と onClose を渡す */}
      <FormComponent switchTo={switchTo} onClose={onClose} />
    </div>
  );

  if (isModal) {
    return (
      <Modal onClose={onClose}>
        {content}
      </Modal>
    );
  }

  return content;
};

AuthContainer.propTypes = {
  mode: PropTypes.oneOf(['login', 'signup']),
  isModal: PropTypes.bool,
  onClose: PropTypes.func,
};

export default AuthContainer;