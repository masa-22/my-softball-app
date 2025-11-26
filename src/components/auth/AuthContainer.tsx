import React, { useState, ReactNode } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import Modal from '../common/Modal';
import PropTypes from 'prop-types';

type AuthMode = 'login' | 'signup';

interface Props {
  mode?: AuthMode;
  isModal?: boolean;
  onClose?: () => void;
}

const AuthContainer: React.FC<Props> = ({ mode = 'login', isModal = false, onClose }) => {
  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const FormComponent = currentMode === 'signup' ? SignupForm : LoginForm;

  const switchTo = (targetMode: AuthMode) => {
    setCurrentMode(targetMode);
  };

  const content = (
    <div style={{ maxWidth: '400px', margin: isModal ? '0' : '50px auto', padding: '20px', border: isModal ? 'none' : '1px solid #ccc', borderRadius: '8px', backgroundColor: isModal ? 'white' : '#fff' }}>
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
