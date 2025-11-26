import React from 'react';
import AuthContainer from './AuthContainer';
import PropTypes from 'prop-types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
