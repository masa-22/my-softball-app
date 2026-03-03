import React from 'react';
import DiamondField from '../play/runner/DiamondField';

interface ReplayRunnerFieldProps {
  runners: { '1': string | null; '2': string | null; '3': string | null };
}

const ReplayRunnerField: React.FC<ReplayRunnerFieldProps> = ({ runners }) => {
  return (
    <div style={{ width: '100%', maxWidth: '200px', margin: '0 auto', aspectRatio: '1/1' }}>
      <DiamondField
        runners={runners}
        selectedBase={null}
        onBaseClick={() => {}} // Read-only
      />
    </div>
  );
};

export default ReplayRunnerField;
