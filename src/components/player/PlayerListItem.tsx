import React from 'react';
import { Player } from '../../types/Player';

interface PlayerListItemProps {
  player: Player;
  onClick?: (player: Player) => void;
}

const PlayerListItem: React.FC<PlayerListItemProps> = ({ player, onClick }) => {
  return (
    <div
      onClick={() => onClick && onClick(player)}
      style={{
        padding: 12,
        border: '1px solid #ddd',
        borderRadius: 4,
        marginBottom: 10,
        backgroundColor: '#fff',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.backgroundColor = '#f9f9f9';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.backgroundColor = '#fff';
      }}
    >
      <h3 style={{ margin: 0 }}>
        {player.familyName} {player.givenName}{' '}
        <small style={{ color: '#666' }}>[{player.playerId}]</small>
      </h3>
      <p style={{ margin: 4 }}>
        <strong>利き手:</strong> {player.throwing} / <strong>利き打ち:</strong>{' '}
        {player.batting}
      </p>
      {player.entryYear && (
        <p style={{ margin: 4 }}>
          <strong>入学年度:</strong> {player.entryYear}
        </p>
      )}
      <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
        <strong>所属チームID:</strong> {player.teamId}
      </p>
    </div>
  );
};

export default PlayerListItem;
